import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { notifyMultiple } from "@/lib/notifications";
import { getTourAdminEmail, getSupportAdminEmail } from "@/lib/admin-contacts";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
export const dynamic = "force-dynamic";

const customRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone number is required"),
  preferredDates: z.string().optional().nullable(),
  pax: z.number().int().min(1).optional().nullable(),
  budget: z.number().int().min(0).optional().nullable(),
  message: z.string().optional().nullable(),
  attachments: z.array(z.string()).optional().nullable(), // Array of file keys
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = customRequestSchema.parse(body);

    // Create custom tour request
    const request = await prisma.customTourRequest.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        preferredDates: data.preferredDates || null,
        pax: data.pax || null,
        budget: data.budget || null,
        message: data.message || null,
        attachments: data.attachments ? (data.attachments as any) : null,
        status: "NEW",
      },
    });

    // Send email to admin
    const tourAdminEmail = getTourAdminEmail();

    try {
      const adminEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>New Custom Tour Request</h1>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          ${data.preferredDates ? `<p><strong>Preferred Dates:</strong> ${data.preferredDates}</p>` : ''}
          ${data.pax ? `<p><strong>Number of Passengers:</strong> ${data.pax}</p>` : ''}
          ${data.budget ? `<p><strong>Budget:</strong> ₹${(data.budget / 100).toLocaleString()}</p>` : ''}
          ${data.message ? `<p><strong>Message:</strong></p><div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">${data.message.replace(/\n/g, "<br>")}</div>` : ''}
          <p><a href="${process.env.NEXTAUTH_URL || 'https://travunited.com'}/admin/custom-requests/${request.id}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Request</a></p>
        </div>
      `;

      if (!tourAdminEmail) {
        console.warn("Tour admin email not configured; skipping custom request admin email.");
      } else {
        await sendEmail({
          to: tourAdminEmail,
          subject: `New Custom Tour Request from ${data.name}`,
          html: adminEmailHtml,
          category: "tours",
        });
      }
    } catch (emailError) {
      console.error("Error sending custom tour request email:", emailError);
      // Don't fail the request if email fails
    }

    // Send confirmation email to customer
    try {
      const supportEmail = getSupportAdminEmail();
      const customerEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Thank You for Your Custom Tour Request</h1>
          <p>Dear ${data.name},</p>
          <p>We have received your custom tour request and our team will review it and get back to you within 24-48 hours.</p>
          <p>Request ID: <strong>${request.id}</strong></p>
          <p>If you have any questions, please contact us at ${supportEmail} or +91 63603 92398.</p>
          <p>Best regards,<br>The Travunited Team</p>
        </div>
      `;

      await sendEmail({
        to: data.email,
        subject: "Custom Tour Request Received - Travunited",
        html: customerEmailHtml,
      });
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
    }

    // Notify all admins
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: {
            in: ["STAFF_ADMIN", "SUPER_ADMIN"],
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (admins.length > 0) {
        await notifyMultiple(
          admins.map((a) => a.id),
          {
            type: "CUSTOM_TOUR_REQUEST",
            title: "New Custom Tour Request",
            message: `New custom tour request from ${data.name} (${data.email})`,
            link: `/admin/custom-requests/${request.id}`,
            data: {
              requestId: request.id,
              name: data.name,
              email: data.email,
            },
          }
        );
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
    }

    // Log audit event
    try {
      await logAuditEvent({
        adminId: null, // Customer-initiated
        entityType: AuditEntityType.OTHER,
        entityId: request.id,
        action: AuditAction.CREATE,
        description: `New custom tour request created by ${data.name}`,
        metadata: {
          email: data.email,
          phone: data.phone,
          pax: data.pax,
          budget: data.budget,
        },
      });
    } catch (auditError) {
      console.error("Error logging audit event:", auditError);
    }

    return NextResponse.json({
      success: true,
      requestId: request.id,
      message: "Custom tour request submitted successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error("Error creating custom tour request:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for admins to list custom requests
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.customTourRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.customTourRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching custom tour requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


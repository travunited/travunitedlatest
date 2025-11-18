import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { notify, notifyMultiple } from "@/lib/notifications";
export const dynamic = "force-dynamic";


const leadSchema = z.object({
  companyName: z.string().min(2),
  contactPerson: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  message: z.string().min(10),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = leadSchema.parse(body);

    const lead = await prisma.corporateLead.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactPerson,
        email: data.email,
        phone: data.phone,
        message: data.message,
        status: "NEW",
      },
    });

    await logAuditEvent({
      adminId: null,
      entityType: AuditEntityType.OTHER,
      entityId: lead.id,
      action: AuditAction.CREATE,
      description: `New corporate lead submitted by ${lead.companyName}`,
      metadata: {
        contactName: lead.contactName,
        email: lead.email,
      },
    });

    // Notify all admins about new corporate lead
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
          type: "ADMIN_CORPORATE_LEAD_NEW",
          title: "New corporate lead",
          message: `New corporate lead from ${lead.companyName}. Contact: ${lead.contactName} (${lead.email})`,
          link: `/admin/corporate-leads`,
          data: {
            leadId: lead.id,
            companyName: lead.companyName,
            contactName: lead.contactName,
            email: lead.email,
          },
          sendEmail: true,
        }
      );
    }

    return NextResponse.json(
      { message: "Lead submitted successfully" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error submitting corporate lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


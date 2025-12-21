import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVisaStatusUpdateEmail } from "@/lib/email";
import { notify, notifyMultiple } from "@/lib/notifications";
import { getVisaAdminEmail, getAdminUserIds } from "@/lib/admin-contacts";
import { sendEmail } from "@/lib/email";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        travellers: {
          include: {
            traveller: true,
          },
        },
        documents: true,
      },
    });

    if (!application || application.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Only allow submission if status is DOCUMENTS_PENDING
    if (application.status !== "DOCUMENTS_PENDING") {
      return NextResponse.json(
        { error: `Application cannot be submitted. Current status: ${application.status}` },
        { status: 400 }
      );
    }

    // Update status to SUBMITTED
    const updated = await prisma.application.update({
      where: { id: params.id },
      data: {
        status: "SUBMITTED",
      },
    });

    // Send email notifications
    try {
      // Send confirmation email to user
      await sendVisaStatusUpdateEmail(
        application.user.email,
        application.id,
        application.country || "",
        application.visaType || "",
        "SUBMITTED",
        application.user.role || "CUSTOMER"
      );

      // Send notification to user
      await notify({
        userId: application.userId,
        type: "VISA_APPLICATION_SUBMITTED",
        title: "Application Submitted Successfully",
        message: `Your visa application for ${application.country || ""} ${application.visaType || ""} has been submitted with all documents.`,
        link: `/dashboard/applications/${application.id}`,
        data: {
          applicationId: application.id,
          country: application.country,
          visaType: application.visaType,
        },
        sendEmail: false, // Email already sent above
      });

      // Send email to admin with all application details
      const visaAdminEmail = getVisaAdminEmail();
      const travellersList = application.travellers.map((at, idx) => 
        `${idx + 1}. ${at.traveller.firstName} ${at.traveller.lastName} (DOB: ${at.traveller.dateOfBirth ? new Date(at.traveller.dateOfBirth).toLocaleDateString() : "N/A"}, Passport: ${at.traveller.passportNumber || "N/A"})`
      ).join("<br>");

      const documentsList = application.documents.length > 0
        ? application.documents.map((doc, idx) => 
            `${idx + 1}. ${doc.documentType || "Document"} - ${doc.status}${doc.travellerId ? ` (Traveller: ${application.travellers.find(at => at.travellerId === doc.travellerId)?.traveller.firstName || "N/A"})` : ""}`
          ).join("<br>")
        : "No documents uploaded";

      try {
        await sendEmail({
          to: visaAdminEmail,
          subject: `Visa Application Submitted - ${application.country || ""} ${application.visaType || ""}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>Visa Application Submitted</h1>
              <p>A visa application has been submitted with all documents:</p>
              <ul>
                <li><strong>Application ID:</strong> ${application.id}</li>
                <li><strong>Country:</strong> ${application.country || "N/A"}</li>
                <li><strong>Visa Type:</strong> ${application.visaType || "N/A"}</li>
                <li><strong>Customer:</strong> ${application.user.name || "N/A"} (${application.user.email})</li>
                <li><strong>Total Amount:</strong> ₹${application.totalAmount.toLocaleString()}</li>
                <li><strong>Number of Travellers:</strong> ${application.travellers.length}</li>
                <li><strong>Documents Uploaded:</strong> ${application.documents.length}</li>
              </ul>
              <h3>Travellers:</h3>
              <p>${travellersList}</p>
              <h3>Documents:</h3>
              <p>${documentsList}</p>
              <p><a href="${process.env.NEXTAUTH_URL || "https://travunited.com"}/admin/applications/${application.id}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Application</a></p>
              <p>Best regards,<br>Travunited System</p>
            </div>
          `,
          category: "visa",
        });
      } catch (adminEmailError) {
        console.error("Error sending admin notification email:", adminEmailError);
      }

      // Notify admins in-app
      const adminIds = await getAdminUserIds();
      if (adminIds.length > 0) {
        await notifyMultiple(adminIds, {
          type: "ADMIN_APPLICATION_ASSIGNED",
          title: "Visa Application Submitted",
          message: `Visa application for ${application.country || ""} ${application.visaType || ""} has been submitted with all documents. Ready for processing.`,
          link: `/admin/applications/${application.id}`,
          data: {
            applicationId: application.id,
            country: application.country,
            visaType: application.visaType,
          },
          sendEmail: false, // Email already sent above
          roleScope: "STAFF_ADMIN",
        });
      }
    } catch (emailError) {
      console.error("Error sending submission emails:", emailError);
      // Don't fail the request if emails fail
    }

    return NextResponse.json({
      message: "Application submitted successfully",
      application: updated,
    });
  } catch (error) {
    console.error("Error submitting application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


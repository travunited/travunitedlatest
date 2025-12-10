import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadVisaDocument } from "@/lib/minio";
import { sendEmail } from "@/lib/email";
import { getSupportAdminEmail } from "@/lib/admin-contacts";
import crypto from "crypto";
export const dynamic = "force-dynamic";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // Extract form fields
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const location = formData.get("location") as string | null;
    const positionTitle = formData.get("positionTitle") as string;
    const experience = formData.get("experience") as string | null;
    const currentCompany = formData.get("currentCompany") as string | null;
    const expectedCtc = formData.get("expectedCtc") as string | null;
    const coverNote = formData.get("coverNote") as string | null;
    const resumeFile = formData.get("resume") as File | null;

    // Validate required fields
    if (!name || !email || !phone || !positionTitle || !resumeFile) {
      return NextResponse.json(
        { error: "Name, email, phone, position, and resume are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Validate file
    if (!ALLOWED_FILE_TYPES.includes(resumeFile.type)) {
      return NextResponse.json(
        { error: "Resume must be a PDF, DOC, or DOCX file" },
        { status: 400 }
      );
    }

    if (resumeFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Resume file size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Generate unique file name
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString("hex");
    const fileExtension = resumeFile.name.split(".").pop() || "pdf";
    const sanitizedPosition = positionTitle.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const fileName = `careers/${sanitizedPosition}/${timestamp}-${randomString}.${fileExtension}`;

    console.log("[Career Apply] Uploading resume:", {
      originalName: resumeFile.name,
      fileName,
      size: resumeFile.size,
      type: resumeFile.type,
      positionTitle,
    });

    // Upload resume to MinIO
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await uploadVisaDocument(fileName, buffer, resumeFile.type);
    console.log("[Career Apply] Resume uploaded to MinIO successfully:", fileName);

    // Create database record
    const application = await prisma.careerApplication.create({
      data: {
        name,
        email,
        phone,
        location: location || null,
        positionTitle,
        experience: experience ? parseInt(experience, 10) : null,
        currentCompany: currentCompany || null,
        expectedCtc: expectedCtc || null,
        coverNote: coverNote || null,
        resumeUrl: fileName,
        status: "NEW",
      },
    });

    console.log("[Career Apply] Career application created:", {
      id: application.id,
      name: application.name,
      resumeUrl: application.resumeUrl,
    });

    // Send email notification to admin
    const adminEmail = getSupportAdminEmail();
    const resumeDownloadUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/files?key=${encodeURIComponent(fileName)}`;
    
    const emailSubject = `New Career Application – ${positionTitle} – ${name}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>New Career Application Received</h1>
        <p>A new career application has been submitted:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Phone:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${phone}</td>
          </tr>
          ${location ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Location:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${location}</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Position:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${positionTitle}</td>
          </tr>
          ${experience ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Experience:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${experience} years</td>
          </tr>
          ` : ""}
          ${currentCompany ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Current Company:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${currentCompany}</td>
          </tr>
          ` : ""}
          ${expectedCtc ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Expected CTC:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${expectedCtc}</td>
          </tr>
          ` : ""}
          ${coverNote ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Cover Note:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${coverNote}</td>
          </tr>
          ` : ""}
        </table>
        <p>
          <a href="${resumeDownloadUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Download Resume
          </a>
        </p>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          Application ID: ${application.id}
        </p>
      </div>
    `;

    if (!adminEmail) {
      console.warn("Support admin email not configured; skipping career application email.");
    } else {
      await sendEmail({
        to: adminEmail,
        subject: emailSubject,
        html: emailHtml,
        category: "general",
      });
    }

    return NextResponse.json({
      message: "Application submitted successfully",
      applicationId: application.id,
    });
  } catch (error) {
    console.error("Error submitting career application:", error);
    return NextResponse.json(
      { error: "Failed to submit application. Please try again." },
      { status: 500 }
    );
  }
}


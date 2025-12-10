import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl } from "@/lib/minio";
export const dynamic = "force-dynamic";



export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const keyParam = searchParams.get("key");

    if (!keyParam) {
      return NextResponse.json(
        { error: "Missing file key" },
        { status: 400 }
      );
    }

    const key = decodeURIComponent(keyParam);
    console.log("[Files API] Request received:", { key: key.substring(0, 50), userId: session.user.id, role: session.user.role });
    
    // If the key is already a full URL, just redirect directly (fallback for legacy stored URLs)
    if (key.startsWith("http://") || key.startsWith("https://")) {
      console.log("[Files API] Key is full URL, redirecting directly");
      return NextResponse.redirect(key);
    }
    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";

    let ownerId: string | null = null;

    const document = await prisma.applicationDocument.findFirst({
      where: { filePath: key },
      select: {
        application: {
          select: { userId: true },
        },
      },
    });

    if (document?.application?.userId) {
      ownerId = document.application.userId;
    } else {
      const application = await prisma.application.findFirst({
        where: { visaDocumentUrl: key },
        select: { userId: true },
      });

      if (application) {
        ownerId = application.userId;
      } else {
        const booking = await prisma.booking.findFirst({
          where: { voucherUrl: key },
          select: { userId: true },
        });

        if (booking) {
          ownerId = booking.userId;
        } else {
          // Check for BookingTraveller passport files
          const bookingTraveller = await prisma.bookingTraveller.findFirst({
            where: {
              OR: [
                { passportFileKey: key },
                { aadharFileKey: key },
              ],
            },
            select: {
              booking: {
                select: { userId: true },
              },
            },
          });

          if (bookingTraveller?.booking?.userId) {
            ownerId = bookingTraveller.booking.userId;
          } else {
            // Check for BookingDocument files
            const bookingDocument = await prisma.bookingDocument.findFirst({
              where: { key: key },
              select: {
                booking: {
                  select: { userId: true },
                },
              },
            });

            if (bookingDocument?.booking?.userId) {
              ownerId = bookingDocument.booking.userId;
            }
          }
        }
      }
    }

    // Check for career application resume
    if (!ownerId) {
      console.log("[Files API] No ownerId found, checking CareerApplication for key:", key.substring(0, 50));
      try {
        const careerApp = await prisma.careerApplication.findFirst({
          where: { resumeUrl: key },
          select: { id: true, resumeUrl: true },
        });

        console.log("[Files API] CareerApplication query result:", { 
          found: !!careerApp, 
          appId: careerApp?.id, 
          resumeUrl: careerApp?.resumeUrl?.substring(0, 50),
          isAdmin 
        });

        if (careerApp) {
          // Career resumes are accessible to admins only
          if (!isAdmin) {
            console.log("[Files API] Non-admin trying to access career resume, forbidden");
            return NextResponse.json(
              { error: "Forbidden" },
              { status: 403 }
            );
          }
          // Admin can access, continue to generate signed URL
          // Check if resumeUrl is valid
          if (!careerApp.resumeUrl || careerApp.resumeUrl.trim() === "") {
            console.log("[Files API] Career resume URL is empty");
            return NextResponse.json(
              { error: "Resume not available" },
              { status: 404 }
            );
          }
          // Set a flag so we know this is a career resume (no ownerId needed for admins)
          ownerId = "CAREER_RESUME"; // Special flag for career resumes
          console.log("[Files API] Career resume found, setting ownerId flag");
        } else {
          console.log("[Files API] CareerApplication not found for key:", key.substring(0, 50));
          return NextResponse.json(
            { error: "File not found" },
            { status: 404 }
          );
        }
      } catch (careerError) {
        console.error("[Files API] Error querying CareerApplication:", careerError);
        const errorMessage = careerError instanceof Error ? careerError.message : String(careerError);
        console.error("[Files API] CareerApplication error details:", { message: errorMessage, error: careerError });
        // If table doesn't exist or other error, return file not found
        return NextResponse.json(
          { error: "File not found", details: process.env.NODE_ENV === "development" ? errorMessage : undefined },
          { status: 404 }
        );
      }
    }

    // Skip ownership check for career resumes (admins only)
    if (ownerId !== "CAREER_RESUME" && !isAdmin && ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    try {
      console.log("[Files API] Generating signed URL for key:", key.substring(0, 50), "ownerId:", ownerId);
      const signedUrl = await getSignedDocumentUrl(key, 60);
      console.log("[Files API] Signed URL generated successfully");
      return NextResponse.redirect(signedUrl);
    } catch (error) {
      console.error("Error generating signed URL for file:", key, error);
      // Check if it's a career application and provide a better error message
      try {
        const careerApp = await prisma.careerApplication.findFirst({
          where: { resumeUrl: key },
          select: { id: true },
        });
        
        if (careerApp) {
          return NextResponse.json(
            { error: "Resume file not available. The file may have been deleted or moved." },
            { status: 404 }
          );
        }
      } catch (careerQueryError) {
        console.error("Error querying CareerApplication in error handler:", careerQueryError);
      }
      
      return NextResponse.json(
        { error: "File not found or unavailable" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error in /api/files route:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      error,
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}


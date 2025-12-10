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
    console.log("[Files API] Request received:", { 
      key: key.substring(0, 100), 
      keyLength: key.length,
      userId: session.user.id, 
      role: session.user.role 
    });
    
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
            // Check for BookingDocument files (table may not exist)
            try {
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
            } catch (bookingDocError) {
              // Table doesn't exist, skip this check
              console.log("[Files API] BookingDocument table not available, skipping:", bookingDocError instanceof Error ? bookingDocError.message : String(bookingDocError));
            }
          }
        }
      }
    }

    // Check for career application resume
    if (!ownerId) {
      console.log("[Files API] No ownerId found, checking CareerApplication for key:", key);
      let careerApp = null;
      try {
        // Try exact match first
        careerApp = await prisma.careerApplication.findFirst({
          where: { resumeUrl: key },
          select: { id: true, resumeUrl: true },
        });
      } catch (careerQueryError) {
        // If the table doesn't exist or there's a Prisma error, log it but don't fail yet
        console.error("[Files API] Error querying CareerApplication (exact match):", careerQueryError);
        const errorMessage = careerQueryError instanceof Error ? careerQueryError.message : String(careerQueryError);
        console.error("[Files API] CareerApplication query error details:", { 
          message: errorMessage,
          error: careerQueryError 
        });
        
        // If it's a table not found error, return 404
        if (errorMessage.includes("does not exist") || errorMessage.includes("CareerApplication")) {
          return NextResponse.json(
            { 
              error: "File not found",
              details: process.env.NODE_ENV === "development" ? "CareerApplication table may not exist" : undefined
            },
            { status: 404 }
          );
        }
        // For other errors, continue to try other methods
      }

      if (careerApp) {
        console.log("[Files API] CareerApplication found:", { 
          appId: careerApp.id, 
          requestedKey: key,
          storedResumeUrl: careerApp.resumeUrl,
          keysMatch: careerApp.resumeUrl === key,
          isAdmin 
        });

        // Career resumes are accessible to admins only
        if (!isAdmin) {
          console.log("[Files API] Non-admin trying to access career resume, forbidden");
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
        }
        
        // Admin can access, continue to generate signed URL
        const actualKey = careerApp.resumeUrl || key;
        
        if (!actualKey || actualKey.trim() === "") {
          console.log("[Files API] Career resume URL is empty");
          return NextResponse.json(
            { error: "Resume not available" },
            { status: 404 }
          );
        }
        
        // Set a flag so we know this is a career resume (no ownerId needed for admins)
        ownerId = "CAREER_RESUME";
        console.log("[Files API] Career resume found, setting ownerId flag, will use key:", actualKey);
      } else {
        console.log("[Files API] CareerApplication not found for key:", key);
        // Try to list sample resume URLs for debugging (only if table exists)
        try {
          const sampleApps = await prisma.careerApplication.findMany({
            take: 3,
            select: { id: true, resumeUrl: true },
          });
          console.log("[Files API] Sample resume URLs in database:", sampleApps.map(a => ({ id: a.id, url: a.resumeUrl })));
        } catch (sampleError) {
          console.error("[Files API] Error fetching sample apps (table may not exist):", sampleError);
        }
        return NextResponse.json(
          { error: "File not found" },
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
      console.log("[Files API] Generating signed URL for key:", key, "ownerId:", ownerId);
      const signedUrl = await getSignedDocumentUrl(key, 60);
      console.log("[Files API] Signed URL generated successfully, length:", signedUrl.length);
      return NextResponse.redirect(signedUrl);
    } catch (minioError) {
      console.error("[Files API] Error generating signed URL for file:", key, minioError);
      const errorMessage = minioError instanceof Error ? minioError.message : String(minioError);
      const errorStack = minioError instanceof Error ? minioError.stack : undefined;
      console.error("[Files API] MinIO error details:", { 
        message: errorMessage,
        stack: errorStack,
        error: minioError 
      });
      
      // Check if it's a career application and provide a better error message
      if (ownerId === "CAREER_RESUME") {
        try {
          const careerApp = await prisma.careerApplication.findFirst({
            where: { resumeUrl: key },
            select: { id: true },
          });
          
          if (careerApp) {
            return NextResponse.json(
              { 
                error: "Resume file not available. The file may have been deleted or moved from storage.",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
              },
              { status: 404 }
            );
          }
        } catch (careerQueryError) {
          console.error("[Files API] Error querying CareerApplication in error handler:", careerQueryError);
        }
      }
      
      return NextResponse.json(
        { 
          error: "File not found or unavailable",
          details: process.env.NODE_ENV === "development" ? errorMessage : undefined
        },
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


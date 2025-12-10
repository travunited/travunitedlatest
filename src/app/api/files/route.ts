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
      const careerApp = await prisma.careerApplication.findFirst({
        where: { resumeUrl: key },
        select: { id: true, resumeUrl: true },
      });

      if (careerApp) {
        // Career resumes are accessible to admins only
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
        }
        // Admin can access, continue to generate signed URL
        // Check if resumeUrl is valid
        if (!careerApp.resumeUrl || careerApp.resumeUrl.trim() === "") {
          return NextResponse.json(
            { error: "Resume not available" },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "File not found" },
          { status: 404 }
        );
      }
    }

    if (!isAdmin && ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    try {
      const signedUrl = await getSignedDocumentUrl(key, 60);
      return NextResponse.redirect(signedUrl);
    } catch (error) {
      console.error("Error generating signed URL for file:", key, error);
      // Check if it's a career application and provide a better error message
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
      
      return NextResponse.json(
        { error: "File not found or unavailable" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


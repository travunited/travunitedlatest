import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl } from "@/lib/minio";

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
        }
      }
    }

    if (!ownerId) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    if (!isAdmin && ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const signedUrl = await getSignedDocumentUrl(key, 60);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


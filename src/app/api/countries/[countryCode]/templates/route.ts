import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl } from "@/lib/minio";

export const dynamic = "force-dynamic";

// GET - Get templates for a country (public endpoint for applicants)
export async function GET(
  req: Request,
  { params }: { params: { countryCode: string } }
) {
  try {
    // Find country by code
    const country = await prisma.country.findUnique({
      where: {
        code: params.countryCode.toUpperCase(),
        isActive: true,
      },
    });

    if (!country) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    // Get active templates for this country
    const templates = await prisma.documentTemplate.findMany({
      where: {
        countryId: country.id,
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    // Generate signed URLs for each template (1 hour expiry)
    const templatesWithUrls = await Promise.all(
      templates.map(async (template) => {
        let downloadUrl = null;
        try {
          downloadUrl = await getSignedDocumentUrl(template.fileKey, 3600);
        } catch (error) {
          console.error(`Error generating signed URL for template ${template.id}:`, error);
        }
        return {
          id: template.id,
          name: template.name,
          description: template.description,
          fileName: template.fileName,
          fileSize: template.fileSize,
          mimeType: template.mimeType,
          downloadUrl,
        };
      })
    );

    return NextResponse.json(templatesWithUrls);
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

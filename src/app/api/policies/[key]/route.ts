import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> | { key: string } }
) {
  try {
    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const policy = await prisma.sitePolicy.findUnique({
      where: { key: resolvedParams.key },
    });

    if (!policy) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      key: policy.key,
      title: policy.title,
      content: policy.content,
      version: policy.version,
      updatedAt: policy.updatedAt,
    });
  } catch (error: any) {
    // Handle case where SitePolicy table doesn't exist
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      console.warn("SitePolicy table not found:", error.message);
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }
    console.error("Error fetching policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


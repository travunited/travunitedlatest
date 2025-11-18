import { NextResponse } from "next/server";
import { z } from "zod";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
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


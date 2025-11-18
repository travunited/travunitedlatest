import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids");

    let where: any = {};
    if (ids) {
      const applicationIds = ids.split(",");
      where.id = {
        in: applicationIds,
      };
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        processedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Generate CSV
    const headers = [
      "Application ID",
      "Country",
      "Visa Type",
      "Status",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Amount",
      "Assigned To",
      "Applied Date",
      "Updated Date",
    ];

    const rows = applications.map((app) => [
      app.id,
      app.country || "",
      app.visaType || "",
      app.status,
      app.user.name || "",
      app.user.email,
      app.user.phone || "",
      app.totalAmount.toString(),
      app.processedBy?.name || app.processedBy?.email || "Unassigned",
      new Date(app.createdAt).toISOString(),
      new Date(app.updatedAt).toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="applications-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


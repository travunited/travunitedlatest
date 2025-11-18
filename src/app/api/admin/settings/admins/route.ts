import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { notifyMultiple } from "@/lib/notifications";
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

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ["STAFF_ADMIN", "SUPER_ADMIN"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            processedApplications: true,
            processedBookings: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get last login times (would need a LastLogin model or track in session)
    // For now, use updatedAt as a proxy
    const adminsWithStats = admins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      lastLogin: admin.updatedAt, // Proxy for last login
      stats: {
        applicationsHandled: admin._count.processedApplications,
        bookingsHandled: admin._count.processedBookings,
        lastActive: admin.updatedAt,
      },
    }));

    return NextResponse.json(adminsWithStats);
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, role, password, generatePassword } = body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Generate or use provided password
    let passwordHash: string;
    let tempPassword: string | null = null;

    if (generatePassword) {
      tempPassword = crypto.randomBytes(8).toString("hex");
      passwordHash = await bcrypt.hash(tempPassword, 10);
    } else {
      if (!password || password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
      passwordHash = await bcrypt.hash(password, 10);
      tempPassword = password;
    }

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "STAFF_ADMIN",
        isActive: true,
      },
    });

    // Notify super admin about new admin creation
    const superAdmins = await prisma.user.findMany({
      where: {
        role: "SUPER_ADMIN",
        isActive: true,
        id: { not: admin.id }, // Don't notify the creator
      },
      select: { id: true },
    });

    if (superAdmins.length > 0) {
      await notifyMultiple(
        superAdmins.map((a) => a.id),
        {
          type: "ADMIN_ACCOUNT_CREATED",
          title: "New admin created",
          message: `A new ${admin.role === "SUPER_ADMIN" ? "Super Admin" : "Staff Admin"} has been created: ${admin.name} (${admin.email})`,
          link: `/admin/settings/admins`,
          data: {
            adminId: admin.id,
            adminName: admin.name,
            adminEmail: admin.email,
            adminRole: admin.role,
          },
          sendEmail: false,
        }
      );
    }

    // TODO: Send welcome email with password or reset link
    // For now, return the temp password (in production, send via email)
    return NextResponse.json({
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      tempPassword: generatePassword ? tempPassword : null,
      message: generatePassword 
        ? "Admin created. Temporary password generated. Please send via email."
        : "Admin created successfully",
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


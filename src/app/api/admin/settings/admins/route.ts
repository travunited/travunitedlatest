import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { notifyMultiple } from "@/lib/notifications";
import { sendAdminWelcomeEmail } from "@/lib/email";
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

    // Allow both STAFF_ADMIN and SUPER_ADMIN to fetch admin list
    // STAFF_ADMIN needs this for bulk assignment features
    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";

    // For SUPER_ADMIN, fetch with stats; for STAFF_ADMIN, fetch basic info only
    if (isSuperAdmin) {
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
              Application_Application_processedByIdToUser: true,
              Booking_Booking_processedByIdToUser: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const adminsWithStats = admins.map((admin) => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        lastLogin: admin.updatedAt, // Proxy for last login
        stats: {
          applicationsHandled: (admin._count as any).Application_Application_processedByIdToUser,
          bookingsHandled: (admin._count as any).Booking_Booking_processedByIdToUser,
          lastActive: admin.updatedAt,
        },
      }));

      return NextResponse.json(adminsWithStats);
    } else {
      // For STAFF_ADMIN, return basic info only (for assignment dropdown)
      // Only return active admins for assignment purposes
      const admins = await prisma.user.findMany({
        where: {
          role: {
            in: ["STAFF_ADMIN", "SUPER_ADMIN"],
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json(admins);
    }
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
        id: crypto.randomUUID(),
        updatedAt: new Date(),
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

    // Send welcome email with credentials
    const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
    try {
      await sendAdminWelcomeEmail(
        admin.email,
        admin.name || "Admin",
        admin.role,
        generatePassword ? tempPassword : null,
        loginUrl
      );
    } catch (emailError) {
      console.error("Error sending welcome email to admin:", emailError);
      // Don't fail the request if email fails, but log it
    }

    // Don't return temp password in response for security
    return NextResponse.json({
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      message: generatePassword
        ? "Admin created successfully. Welcome email with temporary password has been sent."
        : "Admin created successfully. Welcome email has been sent.",
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


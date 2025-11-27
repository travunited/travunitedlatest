import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmailServiceConfig } from "@/lib/email";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await getEmailServiceConfig();
    const configured = !!(config.resendApiKey && config.emailFromGeneral);

    return NextResponse.json({
      configured,
      resendApiKey: config.resendApiKey ? "***configured***" : "not set",
      emailFromGeneral: config.emailFromGeneral || "not set",
      emailFromVisa: config.emailFromVisa || "(defaults to general sender)",
      emailFromTours: config.emailFromTours || "(defaults to general sender)",
      message: configured
        ? "Email service is configured and ready to send emails."
        : "Email service is not fully configured. Please set the Resend API key and sender addresses in Admin → Settings → Email Service Configuration.",
    });
  } catch (error) {
    console.error("Error checking email configuration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


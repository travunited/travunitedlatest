import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmailServiceConfig, getLastEmailError } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "STAFF_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // Get email configuration
    const config = await getEmailServiceConfig();
    
    // Check database for email config
    const dbConfig = await prisma.setting.findUnique({
      where: { key: "EMAIL_CONFIG" },
    });

    // Check environment variables
    const envVars = {
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "✅ Set" : "❌ Missing",
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? "✅ Set" : "❌ Missing",
      AWS_REGION: process.env.AWS_REGION || process.env.AWS_SES_REGION || "❌ Missing",
      EMAIL_FROM: process.env.EMAIL_FROM || "❌ Missing",
    };

    // Get last email error
    const lastError = getLastEmailError();

    return NextResponse.json({
      status: "ok",
      config: {
        awsAccessKeyId: config.awsAccessKeyId ? "✅ Configured" : "❌ Missing",
        awsSecretAccessKey: config.awsSecretAccessKey ? "✅ Configured" : "❌ Missing",
        awsRegion: config.awsRegion || "❌ Missing",
        emailFromGeneral: config.emailFromGeneral || "❌ Missing",
        emailFromVisa: config.emailFromVisa || "❌ Missing",
        emailFromTours: config.emailFromTours || "❌ Missing",
      },
      environment: envVars,
      database: {
        hasConfig: !!dbConfig,
        configKeys: dbConfig?.value && typeof dbConfig.value === "object" 
          ? Object.keys(dbConfig.value as Record<string, unknown>)
          : [],
      },
      lastError: lastError || "None",
      recommendations: [
        !config.awsAccessKeyId && "Set AWS_ACCESS_KEY_ID in environment variables or admin settings",
        !config.awsSecretAccessKey && "Set AWS_SECRET_ACCESS_KEY in environment variables or admin settings",
        !config.awsRegion && "Set AWS_REGION in environment variables or admin settings",
        !config.emailFromGeneral && "Set EMAIL_FROM in environment variables or admin settings",
        lastError && `Last error: ${lastError}`,
      ].filter(Boolean),
    });
  } catch (error: any) {
    console.error("Email diagnostics error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


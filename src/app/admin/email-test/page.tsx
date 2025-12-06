"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Mail, Send, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";

export default function AdminEmailTestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
    timestamp?: string;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (
      session &&
      session.user.role !== "SUPER_ADMIN" &&
      session.user.role !== "STAFF_ADMIN"
    ) {
      router.push("/admin");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      setTestEmail(session.user.email);
    }
  }, [session]);

  const handleSendTest = async () => {
    if (!testEmail) {
      setResult({
        success: false,
        message: "Please enter a valid email address",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: testEmail,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.message,
          messageId: data.messageId,
          timestamp: data.timestamp,
        });
      } else {
        setResult({
          success: false,
          message: data.message || data.error || "Failed to send test email",
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Network error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary-100 rounded-lg">
            <Mail className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Email Test Center
            </h1>
            <p className="text-neutral-600">
              Test your email configuration and send test emails
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Email Configuration Status</p>
            <p>
              This tool sends a test email to verify your AWS SDK email
              configuration. Check your inbox (and spam folder) after sending.
            </p>
          </div>
        </div>

        {/* Test Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Recipient Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Defaults to your admin email: {session?.user?.email}
              </p>
            </div>


            {/* Send Button */}
            <button
              onClick={handleSendTest}
              disabled={loading || !testEmail}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending Test Email...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Test Email
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div
            className={`rounded-lg p-6 ${
              result.success
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold mb-1 ${
                    result.success ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {result.success ? "Success!" : "Error"}
                </h3>
                <p
                  className={`text-sm mb-3 ${
                    result.success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {result.message}
                </p>
                {result.success && result.messageId && (
                  <div className="bg-white bg-opacity-50 rounded p-3 text-xs font-mono">
                    <p className="text-neutral-600">
                      <strong>Message ID:</strong> {result.messageId}
                    </p>
                    {result.timestamp && (
                      <p className="text-neutral-600 mt-1">
                        <strong>Sent:</strong>{" "}
                        {new Date(result.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                {result.success && (
                  <div className="mt-4 text-sm text-green-800">
                    <p className="font-medium mb-2">Next steps:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Check your inbox at {testEmail}</li>
                      <li>Also check your spam/junk folder</li>
                      <li>Verify email content and formatting</li>
                      <li>Configure SNS webhook for bounce/complaint handling</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Setup Guide */}
        <div className="bg-neutral-50 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-neutral-900 mb-3">
            Email Configuration Guide
          </h3>
          <div className="space-y-2 text-sm text-neutral-700">
            <p>
              <strong>AWS SDK Configuration:</strong> Requires AWS_ACCESS_KEY_ID,
              AWS_SECRET_ACCESS_KEY, AWS_REGION
            </p>
            <p>
              <strong>From Address:</strong> Must be verified in Amazon SES
            </p>
            <p>
              <strong>Documentation:</strong> See SES_DEPLOYMENT_GUIDE.md in the project root
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-primary-600">18</div>
            <div className="text-sm text-neutral-600">Email Templates</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">AWS SDK</div>
            <div className="text-sm text-neutral-600">Email Provider</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">∞</div>
            <div className="text-sm text-neutral-600">Test Emails</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

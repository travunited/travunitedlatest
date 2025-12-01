"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface EmailTestResult {
  success: boolean;
  message: string;
  error?: string;
}

export default function EmailTestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, EmailTestResult>>({});
  const [testEmail, setTestEmail] = useState("");
  const [emailConfig, setEmailConfig] = useState<{
    configured: boolean;
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsRegion: string;
    emailFromGeneral: string;
    emailFromVisa: string;
    emailFromTours: string;
    message: string;
  } | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Check email configuration on mount (must be before early returns)
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch("/api/admin/email-test/config");
        if (response.ok) {
          const config = await response.json();
          setEmailConfig(config);
        }
      } catch (error) {
        console.error("Error checking email configuration:", error);
      } finally {
        setConfigLoading(false);
      }
    };
    checkConfig();
  }, []);

  if (status === "loading") {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
      </AdminLayout>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (session?.user?.role !== "SUPER_ADMIN") {
    router.push("/dashboard");
    return null;
  }

  const emailTests = [
    {
      id: "password-reset",
      name: "Password Reset Email",
      description: "Test password reset email with reset link",
      category: "Account & Security",
    },
    {
      id: "email-verification",
      name: "Email Verification",
      description: "Test email verification link",
      category: "Account & Security",
    },
    {
      id: "visa-payment-success",
      name: "Visa Payment Success",
      description: "Test visa payment success notification",
      category: "Visa",
    },
    {
      id: "visa-status-update",
      name: "Visa Status Update",
      description: "Test visa application status update",
      category: "Visa",
    },
    {
      id: "visa-document-rejected",
      name: "Visa Document Rejected",
      description: "Test visa document rejection notification",
      category: "Visa",
    },
    {
      id: "visa-approved",
      name: "Visa Approved",
      description: "Test visa approval notification",
      category: "Visa",
    },
    {
      id: "visa-rejected",
      name: "Visa Rejected",
      description: "Test visa rejection notification",
      category: "Visa",
    },
    {
      id: "tour-payment-success",
      name: "Tour Payment Success",
      description: "Test tour payment success notification",
      category: "Tours",
    },
    {
      id: "tour-confirmed",
      name: "Tour Confirmed",
      description: "Test tour confirmation notification",
      category: "Tours",
    },
    {
      id: "tour-payment-reminder",
      name: "Tour Payment Reminder",
      description: "Test tour payment reminder",
      category: "Tours",
    },
    {
      id: "tour-status-update",
      name: "Tour Status Update",
      description: "Test tour booking status update",
      category: "Tours",
    },
    {
      id: "tour-vouchers-ready",
      name: "Tour Vouchers Ready",
      description: "Test tour vouchers ready notification",
      category: "Tours",
    },
    {
      id: "corporate-lead-admin",
      name: "Corporate Lead (Admin)",
      description: "Test corporate lead notification to admin",
      category: "Corporate",
    },
    {
      id: "corporate-lead-confirmation",
      name: "Corporate Lead (Confirmation)",
      description: "Test corporate lead confirmation to customer",
      category: "Corporate",
    },
  ];

  const handleTestEmail = async (testId: string) => {
    if (!testEmail || !testEmail.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }
    if (emailConfig && !emailConfig.configured) {
      alert("Email service is not configured. Please update the Email Service Configuration in settings before sending test emails.");
      return;
    }

    setLoading(testId);
    setResults((prev) => ({
      ...prev,
      [testId]: { success: false, message: "Sending..." },
    }));

    try {
      const response = await fetch("/api/admin/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          email: testEmail,
        }),
      });

      const result = await response.json();

      setResults((prev) => ({
        ...prev,
        [testId]: {
          success: result.success || false,
          message: result.message || "Email sent successfully",
          error: result.error,
        },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [testId]: {
          success: false,
          message: "Failed to send test email",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    } finally {
      setLoading(null);
    }
  };

  const groupedTests = emailTests.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = [];
    }
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, typeof emailTests>);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Email Test Center</h1>
          <p className="text-neutral-600">
            Test all email functions to ensure they&apos;re working correctly. Enter your email address below and click &quot;Send Test&quot; for any email type.
          </p>
        </div>

        {/* Email Configuration Status */}
        {!configLoading && emailConfig && (
          <div className={`mb-6 rounded-lg p-4 border ${
            emailConfig.configured 
              ? "bg-green-50 border-green-200" 
              : "bg-red-50 border-red-200"
          }`}>
            <div className="flex items-start gap-3">
              {emailConfig.configured ? (
                <CheckCircle className="text-green-600 mt-0.5" size={20} />
              ) : (
                <AlertCircle className="text-red-600 mt-0.5" size={20} />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${
                  emailConfig.configured ? "text-green-900" : "text-red-900"
                }`}>
                  Email Service Status: {emailConfig.configured ? "Configured" : "Not Configured"}
                </h3>
                <p className={`text-sm mb-2 ${
                  emailConfig.configured ? "text-green-800" : "text-red-800"
                }`}>
                  {emailConfig.message}
                </p>
                <div
                  className={`text-xs space-y-1 mt-3 ${
                    emailConfig.configured ? "text-green-800" : "text-red-700"
                  }`}
                >
                  <p><strong>Configuration Details:</strong></p>
                  <ul className="space-y-1 ml-2">
                    <li>AWS Access Key ID: {emailConfig.awsAccessKeyId}</li>
                    <li>AWS Secret Access Key: {emailConfig.awsSecretAccessKey}</li>
                    <li>AWS Region: {emailConfig.awsRegion}</li>
                    <li>General Sender: {emailConfig.emailFromGeneral}</li>
                    <li>Visa Sender: {emailConfig.emailFromVisa}</li>
                    <li>Tours Sender: {emailConfig.emailFromTours}</li>
                  </ul>
                  {!emailConfig.configured && (
                    <p className="mt-2">
                      Update these values in <code className="bg-red-100 px-1 rounded">Admin → Settings → Email Service Configuration</code>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-medium p-6 mb-6 border border-neutral-200">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Test Email Address *
          </label>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={() => {
                if (session?.user?.email) {
                  setTestEmail(session.user.email);
                }
              }}
              className="px-4 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Use My Email
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            All test emails will be sent to this address
          </p>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedTests).map(([category, tests]) => (
            <div key={category} className="bg-white rounded-lg shadow-medium border border-neutral-200">
              <div className="p-4 border-b border-neutral-200 bg-neutral-50">
                <h2 className="text-lg font-semibold text-neutral-900">{category}</h2>
              </div>
              <div className="divide-y divide-neutral-200">
                {tests.map((test) => {
                  const result = results[test.id];
                  const isLoading = loading === test.id;

                  return (
                    <div key={test.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-neutral-900 mb-1">{test.name}</h3>
                          <p className="text-sm text-neutral-600">{test.description}</p>
                          {result && (
                            <div className={`mt-2 flex items-center gap-2 text-sm ${
                              result.success ? "text-green-600" : "text-red-600"
                            }`}>
                              {result.success ? (
                                <CheckCircle size={16} />
                              ) : (
                                <AlertCircle size={16} />
                              )}
                              <span>{result.message}</span>
                              {result.error && (
                                <span className="text-xs text-neutral-500">({result.error})</span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleTestEmail(test.id)}
                          disabled={
                            !testEmail ||
                            !!isLoading ||
                            (!!emailConfig && !emailConfig.configured)
                          }
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send size={16} />
                              Send Test
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Mail className="text-blue-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Email Configuration</h3>
              <p className="text-sm text-blue-800 mb-2">
                Emails are sent via AWS SES. Make sure <code className="bg-blue-100 px-1 rounded">AWS_ACCESS_KEY_ID</code>, <code className="bg-blue-100 px-1 rounded">AWS_SECRET_ACCESS_KEY</code>, <code className="bg-blue-100 px-1 rounded">AWS_REGION</code>, and <code className="bg-blue-100 px-1 rounded">EMAIL_FROM</code> are configured in your environment variables.
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>Required Environment Variables:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><code>AWS_ACCESS_KEY_ID</code> - Your AWS access key ID</li>
                  <li><code>AWS_SECRET_ACCESS_KEY</code> - Your AWS secret access key</li>
                  <li><code>AWS_REGION</code> - AWS region where SES is configured (e.g., us-east-1, ap-south-1)</li>
                  <li><code>EMAIL_FROM</code> - Sender email address (e.g., &quot;Travunited &lt;noreply@travunited.com&gt;&quot;)</li>
                </ul>
                <p className="mt-2"><strong>Note:</strong> If emails are not being sent, check your server logs for detailed error messages. Ensure your AWS SES account is out of sandbox mode to send emails to any recipient.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}


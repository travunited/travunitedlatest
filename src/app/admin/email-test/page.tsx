"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Mail, Send, CheckCircle, AlertCircle, Loader2, Info, RefreshCw } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: "general" | "visa" | "tours" | "admin" | "corporate" | "careers";
  requiresParams?: string[];
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  // General
  {
    id: "welcome",
    name: "Welcome Email",
    description: "Sent to new users after signup",
    category: "general",
    requiresParams: ["name"],
  },
  {
    id: "passwordReset",
    name: "Password Reset (Link)",
    description: "Password reset email with reset link",
    category: "general",
  },
  {
    id: "passwordResetOTP",
    name: "Password Reset (OTP)",
    description: "Password reset email with 6-digit OTP",
    category: "general",
  },
  {
    id: "emailVerification",
    name: "Email Verification",
    description: "Email verification link for new accounts",
    category: "general",
    requiresParams: ["name"],
  },
  // Visa
  {
    id: "visaPaymentSuccess",
    name: "Visa Payment Success",
    description: "Sent when visa payment is successful",
    category: "visa",
    requiresParams: ["country", "visaType", "amount"],
  },
  {
    id: "visaPaymentFailed",
    name: "Visa Payment Failed",
    description: "Sent when visa payment fails",
    category: "visa",
    requiresParams: ["country", "visaType", "amount", "reason"],
  },
  {
    id: "visaStatusUpdate",
    name: "Visa Status Update",
    description: "Sent when visa application status changes",
    category: "visa",
    requiresParams: ["country", "visaType", "status"],
  },
  {
    id: "visaDocumentRejected",
    name: "Visa Document Rejected",
    description: "Sent when a visa document is rejected",
    category: "visa",
    requiresParams: ["country", "visaType", "documentName", "reason"],
  },
  {
    id: "visaApproved",
    name: "Visa Approved",
    description: "Sent when visa application is approved",
    category: "visa",
    requiresParams: ["country", "visaType"],
  },
  {
    id: "visaRejected",
    name: "Visa Rejected",
    description: "Sent when visa application is rejected",
    category: "visa",
    requiresParams: ["country", "visaType", "reason"],
  },
  // Tours
  {
    id: "tourPaymentSuccess",
    name: "Tour Payment Success",
    description: "Sent when tour payment is successful",
    category: "tours",
    requiresParams: ["tourName", "amount", "isAdvance", "pendingBalance"],
  },
  {
    id: "tourPaymentFailed",
    name: "Tour Payment Failed",
    description: "Sent when tour payment fails",
    category: "tours",
    requiresParams: ["tourName", "amount", "reason"],
  },
  {
    id: "tourConfirmed",
    name: "Tour Confirmed",
    description: "Sent when tour booking is confirmed",
    category: "tours",
    requiresParams: ["tourName"],
  },
  {
    id: "tourPaymentReminder",
    name: "Tour Payment Reminder",
    description: "Sent as a reminder for pending tour payments",
    category: "tours",
    requiresParams: ["tourName", "amount", "dueDate"],
  },
  {
    id: "tourStatusUpdate",
    name: "Tour Status Update",
    description: "Sent when tour booking status changes",
    category: "tours",
    requiresParams: ["tourName", "status"],
  },
  {
    id: "tourVouchersReady",
    name: "Tour Vouchers Ready",
    description: "Sent when tour vouchers are ready for download",
    category: "tours",
    requiresParams: ["tourName"],
  },
  // Corporate
  {
    id: "corporateLeadAdmin",
    name: "Corporate Lead (Admin)",
    description: "Sent to admin when a corporate lead is submitted",
    category: "corporate",
    requiresParams: ["companyName", "contactName", "email", "phone", "message"],
  },
  {
    id: "corporateLeadConfirmation",
    name: "Corporate Lead (Confirmation)",
    description: "Sent to customer confirming corporate lead submission",
    category: "corporate",
    requiresParams: ["contactName", "companyName"],
  },
  // Careers
  {
    id: "careerApplicationStatus",
    name: "Career Application Status",
    description: "Sent when career application status is updated",
    category: "careers",
    requiresParams: ["name", "positionTitle", "status"],
  },
  // Admin
  {
    id: "adminWelcome",
    name: "Admin Welcome",
    description: "Sent to new admin users with login credentials",
    category: "admin",
    requiresParams: ["name", "password", "loginUrl"],
  },
];

const CATEGORY_COLORS = {
  general: "bg-blue-100 text-blue-800",
  visa: "bg-green-100 text-green-800",
  tours: "bg-purple-100 text-purple-800",
  admin: "bg-red-100 text-red-800",
  corporate: "bg-orange-100 text-orange-800",
  careers: "bg-pink-100 text-pink-800",
};

export default function AdminEmailTestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string; timestamp?: string }>>({});
  const [showParams, setShowParams] = useState<Record<string, boolean>>({});
  const [params, setParams] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (session && session.user.role !== "SUPER_ADMIN") {
      router.push("/admin");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      setTestEmail(session.user.email);
    }
  }, [session]);

  const handleTestEmail = async (template: EmailTemplate) => {
    if (!testEmail) {
      setResults((prev) => ({
        ...prev,
        [template.id]: {
          success: false,
          message: "Please enter a test email address",
        },
      }));
      return;
    }

    setLoading(template.id);
    setResults((prev) => ({
      ...prev,
      [template.id]: { success: false, message: "Sending..." },
    }));

    try {
      const response = await fetch("/api/admin/email/test-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailType: template.id,
          testEmail,
          ...(params[template.id] || {}),
        }),
      });

      const data = await response.json();

      setResults((prev) => ({
        ...prev,
        [template.id]: {
          success: data.success || false,
          message: data.message || data.error || "Unknown error",
          timestamp: data.timestamp,
        },
      }));
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        [template.id]: {
          success: false,
          message: error.message || "Network error occurred",
        },
      }));
    } finally {
      setLoading(null);
    }
  };

  const updateParam = (templateId: string, paramName: string, value: string) => {
    setParams((prev) => ({
      ...prev,
      [templateId]: {
        ...(prev[templateId] || {}),
        [paramName]: value,
      },
    }));
  };

  const getDefaultParamValue = (paramName: string): string => {
    const defaults: Record<string, string> = {
      name: "Test User",
      country: "United States",
      visaType: "Tourist Visa",
      amount: "5000",
      reason: "Test reason",
      documentName: "Passport",
      tourName: "Amazing Europe Tour",
      departureDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "UNDER_REVIEW",
      companyName: "Test Company",
      contactName: "John Doe",
      phone: "+1234567890",
      message: "Test message",
      positionTitle: "Software Engineer",
      password: "TempPassword123!",
      isAdvance: "false",
      pendingBalance: "0",
      loginUrl: typeof window !== "undefined" ? `${window.location.origin}/login` : "https://travunited.in/login",
    };
    return defaults[paramName] || "";
  };

  const groupedTemplates = EMAIL_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

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
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Mail className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                Email Template Testing Center
              </h1>
              <p className="text-neutral-600">
                Test all email templates from one place
              </p>
            </div>
          </div>
        </div>

        {/* Global Test Email Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Test Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-neutral-500">
                All test emails will be sent to this address
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How to Test</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Enter your test email address above</li>
              <li>Click on any email template to expand and see required parameters</li>
              <li>Fill in test parameters (defaults are provided)</li>
              <li>Click &quot;Send Test Email&quot; to test that template</li>
              <li>Check your inbox (and spam folder) for the test email</li>
            </ul>
          </div>
        </div>

        {/* Email Templates by Category */}
        {Object.entries(groupedTemplates).map(([category, templates]) => (
          <div key={category} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-neutral-900 capitalize">
                {category} Emails
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}`}>
                {templates.length} templates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg shadow-md border border-neutral-200 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-neutral-900">
                        {template.name}
                      </h3>
                      {results[template.id] && (
                        <div className="flex-shrink-0 ml-2">
                          {results[template.id].success ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mb-4">
                      {template.description}
                    </p>

                    {/* Parameters */}
                    {template.requiresParams && template.requiresParams.length > 0 && (
                      <div className="mb-4">
                        <button
                          onClick={() =>
                            setShowParams((prev) => ({
                              ...prev,
                              [template.id]: !prev[template.id],
                            }))
                          }
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          {showParams[template.id] ? "Hide" : "Show"} Parameters
                        </button>
                        {showParams[template.id] && (
                          <div className="mt-2 space-y-2">
                            {template.requiresParams.map((param) => (
                              <div key={param}>
                                <label className="block text-xs font-medium text-neutral-700 mb-1">
                                  {param}
                                </label>
                                <input
                                  type="text"
                                  value={params[template.id]?.[param] || getDefaultParamValue(param)}
                                  onChange={(e) =>
                                    updateParam(template.id, param, e.target.value)
                                  }
                                  className="w-full px-2 py-1 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                                  placeholder={getDefaultParamValue(param)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Test Button */}
                    <button
                      onClick={() => handleTestEmail(template)}
                      disabled={loading === template.id || !testEmail}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {loading === template.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Test Email
                        </>
                      )}
                    </button>

                    {/* Result */}
                    {results[template.id] && (
                      <div
                        className={`mt-3 p-2 rounded text-xs ${
                          results[template.id].success
                            ? "bg-green-50 text-green-800"
                            : "bg-red-50 text-red-800"
                        }`}
                      >
                        <p className="font-medium">
                          {results[template.id].success ? "\u2713 Sent" : "\u2717 Failed"}
                        </p>
                        <p className="mt-1">{results[template.id].message}</p>
                        {results[template.id].timestamp && (
                          <p className="mt-1 text-xs opacity-75">
                            {new Date(results[template.id].timestamp!).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Summary Stats */}
        <div className="bg-neutral-50 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-neutral-900 mb-4">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-neutral-900">
                {EMAIL_TEMPLATES.length}
              </div>
              <div className="text-sm text-neutral-600">Total Templates</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Object.values(results).filter((r) => r.success).length}
              </div>
              <div className="text-sm text-neutral-600">Successful Tests</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {Object.values(results).filter((r) => !r.success && r.message !== "Sending...").length}
              </div>
              <div className="text-sm text-neutral-600">Failed Tests</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(results).length}
              </div>
              <div className="text-sm text-neutral-600">Tests Run</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Save, Building2, Mail, CreditCard, BarChart3, Lock, AlertCircle, Settings, CheckCircle, Eye, EyeOff, Loader2, ExternalLink, FileText, User, Plane, Briefcase } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { TextInput, TextareaInput, CheckboxInput } from "@/components/admin/MemoizedInputs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface Settings {
  // Company Info
  companyName: string;
  companyLogo: string;
  companyAddress: string;
  gstin: string;
  supportEmail: string;
  supportPhone: string;
  
  // Email Basics - General
  emailWelcome: string;
  emailPasswordReset: string;
  emailVerification: string;
  
  // Email Basics - Visa
  emailVisaPaymentSuccess: string;
  emailVisaPaymentFailed: string;
  emailVisaStatusUpdate: string;
  emailVisaDocumentRejected: string;
  emailVisaApproved: string;
  emailVisaRejected: string;
  
  // Email Basics - Tours
  emailTourPaymentSuccess: string;
  emailTourPaymentFailed: string;
  emailTourConfirmed: string;
  emailTourPaymentReminder: string;
  emailTourStatusUpdate: string;
  emailTourVouchersReady: string;
  
  // Email Basics - Admin & Corporate
  emailAdminWelcome: string;
  emailCorporateLeadAdmin: string;
  emailCorporateLeadConfirmation: string;
  
  // Email Service Configuration
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  emailFromGeneral: string;
  emailFromVisa: string;
  emailFromTours: string;
  
  // Payment Settings (view-only)
  razorpayKeyId: string;
  paymentModes: string;
  
  // Analytics & Tracking
  googleAnalyticsId: string;
  metaPixelId: string;
  analyticsEnabled: boolean;
  
  // System Flags
  registrationsEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  
  // Feedback Settings
  feedbackEmailsEnabled: boolean;
  googleReviewUrl: string;
}

export default function AdminGeneralSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [emailConfigStatus, setEmailConfigStatus] = useState<{ configured: boolean; message: string } | null>(null);
  const [activeEmailTab, setActiveEmailTab] = useState<"general" | "visa" | "tours" | "admin">("general");

  const [settings, setSettings] = useState<Settings>({
    companyName: "",
    companyLogo: "",
    companyAddress: "",
    gstin: "",
    supportEmail: "",
    supportPhone: "",
    // General emails
    emailWelcome: "",
    emailPasswordReset: "",
    emailVerification: "",
    // Visa emails
    emailVisaPaymentSuccess: "",
    emailVisaPaymentFailed: "",
    emailVisaStatusUpdate: "",
    emailVisaDocumentRejected: "",
    emailVisaApproved: "",
    emailVisaRejected: "",
    // Tour emails
    emailTourPaymentSuccess: "",
    emailTourPaymentFailed: "",
    emailTourConfirmed: "",
    emailTourPaymentReminder: "",
    emailTourStatusUpdate: "",
    emailTourVouchersReady: "",
    // Admin & Corporate emails
    emailAdminWelcome: "",
    emailCorporateLeadAdmin: "",
    emailCorporateLeadConfirmation: "",
    // Email service config
    awsAccessKeyId: "",
    awsSecretAccessKey: "",
    awsRegion: "",
    emailFromGeneral: "",
    emailFromVisa: "",
    emailFromTours: "",
    razorpayKeyId: "",
    paymentModes: "All modes enabled",
    googleAnalyticsId: "",
    metaPixelId: "",
    analyticsEnabled: true,
    registrationsEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: "",
    // Feedback Settings
    feedbackEmailsEnabled: true,
    googleReviewUrl: "",
  });

  const checkEmailConfigStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/email-test/config");
      if (response.ok) {
        const config = await response.json();
        setEmailConfigStatus({
          configured: config.configured,
          message: config.message,
        });
      }
    } catch (error) {
      console.error("Error checking email config:", error);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/settings/general");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        checkEmailConfigStatus();
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }, [checkEmailConfigStatus]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
      const isStaffAdmin = session?.user?.role === "STAFF_ADMIN";
      setIsReadOnly(isStaffAdmin);
      
      if (!isSuperAdmin && !isStaffAdmin) {
        router.push("/dashboard");
      } else {
        fetchSettings();
      }
    }
  }, [session, status, router, fetchSettings]);

  const testEmailCredentials = async () => {
    if (!settings.awsAccessKeyId || !settings.awsSecretAccessKey || !settings.awsRegion || !settings.emailFromGeneral) {
      setEmailTestResult({
        success: false,
        message: "Please fill in all required AWS SES credentials and sender email before testing.",
      });
      return;
    }

    setTestingEmail(true);
    setEmailTestResult(null);

    try {
      // First save the settings
      const saveResponse = await fetch("/api/admin/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save settings");
      }

      // Wait a moment for cache refresh
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then test with password reset email (simple test)
      // Use session email for testing
      const testEmail = session?.user?.email;
      if (!testEmail) {
        setEmailTestResult({
          success: false,
          message: "Unable to determine test email address. Please ensure you're logged in.",
        });
        return;
      }

      const testResponse = await fetch("/api/admin/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: "password-reset",
          email: testEmail,
        }),
      });

      const result = await testResponse.json();

      if (result.success) {
        setEmailTestResult({
          success: true,
          message: "Email credentials are working! Test email sent successfully.",
        });
        checkEmailConfigStatus();
      } else {
        setEmailTestResult({
          success: false,
          message: result.error || result.message || "Failed to send test email. Please check your credentials.",
        });
      }
    } catch (error) {
      setEmailTestResult({
        success: false,
        message: error instanceof Error ? error.message : "An error occurred while testing email credentials.",
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const updateSetting = useCallback((field: keyof Settings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    if (isReadOnly) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert("Settings saved successfully");
        // Refresh email config status after saving
        await checkEmailConfigStatus();
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">General Settings</h1>
          <p className="text-neutral-600 mt-1">
            {isReadOnly 
              ? "View-only access. Contact Super Admin to modify settings." 
              : "Manage general application settings"}
          </p>
        </div>

        {isReadOnly && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle size={20} className="text-yellow-600" />
            <span className="text-sm text-yellow-800">You have view-only access to these settings.</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Company Info */}
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
            <div className="flex items-center space-x-2 mb-4">
              <Building2 size={24} className="text-primary-600" />
              <h2 className="text-xl font-bold text-neutral-900">Company Information</h2>
            </div>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Company Name</label>
                  <TextInput
                    type="text"
                    value={settings.companyName}
                    onChange={(value) => updateSetting("companyName", value)}
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Company Logo URL</label>
                  <TextInput
                    type="url"
                    value={settings.companyLogo}
                    onChange={(value) => updateSetting("companyLogo", value)}
                    disabled={isReadOnly}
                    placeholder="https://..."
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Company Address</label>
                <TextareaInput
                  value={settings.companyAddress}
                  onChange={(value) => updateSetting("companyAddress", value)}
                  disabled={isReadOnly}
                  rows={3}
                  className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">GSTIN</label>
                  <TextInput
                    type="text"
                    value={settings.gstin}
                    onChange={(value) => updateSetting("gstin", value)}
                    disabled={isReadOnly}
                    placeholder="29ABCDE1234F1Z5"
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Support Email</label>
                  <TextInput
                    type="email"
                    value={settings.supportEmail}
                    onChange={(value) => updateSetting("supportEmail", value)}
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Support Phone</label>
                  <TextInput
                    type="tel"
                    value={settings.supportPhone}
                    onChange={(value) => updateSetting("supportPhone", value)}
                    disabled={isReadOnly}
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Email Service Configuration */}
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Settings size={24} className="text-primary-600" />
                <h2 className="text-xl font-bold text-neutral-900">Email Service Configuration</h2>
              </div>
              {emailConfigStatus && (
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  emailConfigStatus.configured 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {emailConfigStatus.configured ? (
                    <CheckCircle size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{emailConfigStatus.configured ? "Configured" : "Not Configured"}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Configure AWS SES credentials and sender email addresses for different modules. These override environment variables.
            </p>
            
            {emailConfigStatus && !emailConfigStatus.configured && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800 font-medium mb-1">Email service not configured</p>
                    <p className="text-xs text-yellow-700">{emailConfigStatus.message}</p>
                    <p className="text-xs text-yellow-700 mt-2">
                      <a 
                        href="https://docs.aws.amazon.com/ses/latest/dg/setting-up.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline inline-flex items-center gap-1"
                      >
                        Learn how to set up AWS SES <ExternalLink size={12} />
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  AWS Access Key ID
                </label>
                <TextInput
                  type="text"
                  value={settings.awsAccessKeyId}
                  onChange={(value) => updateSetting("awsAccessKeyId", value)}
                  disabled={isReadOnly}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Stored securely in the database. Required for sending emails via AWS SES.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  AWS Secret Access Key
                </label>
                <div className="relative">
                  <TextInput
                    type={showSecretKey ? "text" : "password"}
                    value={settings.awsSecretAccessKey}
                    onChange={(value) => updateSetting("awsSecretAccessKey", value)}
                    disabled={isReadOnly}
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    className="w-full px-4 py-2 pr-10 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Stored securely in the database. Required for sending emails via AWS SES.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  AWS Region
                </label>
                <TextInput
                  type="text"
                  value={settings.awsRegion}
                  onChange={(value) => updateSetting("awsRegion", value)}
                  disabled={isReadOnly}
                  placeholder="us-east-1"
                  className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  AWS region where your SES service is configured (e.g., us-east-1, ap-south-1).
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    General Sender Email
                  </label>
                  <TextInput
                    type="email"
                    value={settings.emailFromGeneral}
                    onChange={(value) => updateSetting("emailFromGeneral", value)}
                    disabled={isReadOnly}
                    placeholder="Travunited <no-reply@travunited.in>"
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Used for notifications and account emails.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Visa Sender Email
                  </label>
                  <TextInput
                    type="email"
                    value={settings.emailFromVisa}
                    onChange={(value) => updateSetting("emailFromVisa", value)}
                    disabled={isReadOnly}
                    placeholder="Visa Desk <visa@travunited.in>"
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Used for visa-related communications.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Tours Sender Email
                  </label>
                  <TextInput
                    type="email"
                    value={settings.emailFromTours}
                    onChange={(value) => updateSetting("emailFromTours", value)}
                    disabled={isReadOnly}
                    placeholder="Tours Desk <tours@travunited.in>"
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Used for tour booking and itinerary emails.
                  </p>
                </div>
              </div>

              {/* Test Email Credentials */}
              <div className="pt-4 border-t border-neutral-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-1">Test Email Configuration</h3>
                    <p className="text-xs text-neutral-600">
                      Verify that your AWS SES credentials are working correctly by sending a test email.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={testEmailCredentials}
                    disabled={isReadOnly || testingEmail || !settings.awsAccessKeyId || !settings.awsSecretAccessKey || !settings.awsRegion || !settings.emailFromGeneral}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {testingEmail ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        <span>Test Email</span>
                      </>
                    )}
                  </button>
                </div>
                
                {emailTestResult && (
                  <div className={`mt-3 p-3 rounded-lg border ${
                    emailTestResult.success 
                      ? "bg-green-50 border-green-200" 
                      : "bg-red-50 border-red-200"
                  }`}>
                    <div className="flex items-start gap-2">
                      {emailTestResult.success ? (
                        <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          emailTestResult.success ? "text-green-800" : "text-red-800"
                        }`}>
                          {emailTestResult.success ? "Test Successful" : "Test Failed"}
                        </p>
                        <p className={`text-xs mt-1 ${
                          emailTestResult.success ? "text-green-700" : "text-red-700"
                        }`}>
                          {emailTestResult.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800 mb-2">
                    <strong>Quick Setup Guide:</strong>
                  </p>
                  <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
                    <li>Create an IAM user in AWS Console with SES permissions</li>
                    <li>Generate Access Key ID and Secret Access Key</li>
                    <li>Verify your sender email addresses in AWS SES</li>
                    <li>Request production access if you&apos;re in sandbox mode</li>
                    <li>Enter credentials above and click &quot;Test Email&quot; to verify</li>
                  </ol>
                  <p className="text-xs text-blue-700 mt-2">
                    <a 
                      href="https://docs.aws.amazon.com/ses/latest/dg/setting-up.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline inline-flex items-center gap-1"
                    >
                      View AWS SES Documentation <ExternalLink size={12} />
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Email Basics */}
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Mail size={24} className="text-primary-600" />
                <h2 className="text-xl font-bold text-neutral-900">Email Templates</h2>
              </div>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Customize email templates with HTML. Use variables like {"{"}name{"}"}, {"{"}applicationId{"}"}, {"{"}country{"}"}, etc. Leave empty to use default templates.
            </p>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 border-b border-neutral-200">
              <button
                type="button"
                onClick={() => setActiveEmailTab("general")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeEmailTab === "general"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <User size={16} className="inline mr-2" />
                General
              </button>
              <button
                type="button"
                onClick={() => setActiveEmailTab("visa")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeEmailTab === "visa"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <Plane size={16} className="inline mr-2" />
                Visa
              </button>
              <button
                type="button"
                onClick={() => setActiveEmailTab("tours")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeEmailTab === "tours"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <FileText size={16} className="inline mr-2" />
                Tours
              </button>
              <button
                type="button"
                onClick={() => setActiveEmailTab("admin")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeEmailTab === "admin"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <Briefcase size={16} className="inline mr-2" />
                Admin & Corporate
              </button>
            </div>

            {/* General Email Templates */}
            {activeEmailTab === "general" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Welcome Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}name{"}"}, {"{"}companyName{"}"}, {"{"}dashboardUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailWelcome}
                    onChange={(value) => updateSetting("emailWelcome", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Password Reset Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}resetLink{"}"}, {"{"}companyName{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailPasswordReset}
                    onChange={(value) => updateSetting("emailPasswordReset", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email Verification Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}name{"}"}, {"{"}verificationLink{"}"}, {"{"}companyName{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailVerification}
                    onChange={(value) => updateSetting("emailVerification", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Visa Email Templates */}
            {activeEmailTab === "visa" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Visa Payment Success Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}country{"}"}, {"{"}visaType{"}"}, {"{"}amount{"}"}, {"{"}applicationId{"}"}, {"{"}applicationUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailVisaPaymentSuccess}
                    onChange={(value) => updateSetting("emailVisaPaymentSuccess", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Visa Payment Failed Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}country{"}"}, {"{"}visaType{"}"}, {"{"}amount{"}"}, {"{"}reason{"}"}, {"{"}applicationUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailVisaPaymentFailed}
                    onChange={(value) => updateSetting("emailVisaPaymentFailed", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Visa Status Update Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}country{"}"}, {"{"}visaType{"}"}, {"{"}status{"}"}, {"{"}applicationUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailVisaStatusUpdate}
                    onChange={(value) => updateSetting("emailVisaStatusUpdate", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Visa Document Rejected Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}country{"}"}, {"{"}visaType{"}"}, {"{"}rejectedDocsList{"}"}, {"{"}applicationUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailVisaDocumentRejected}
                    onChange={(value) => updateSetting("emailVisaDocumentRejected", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Visa Approved Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}country{"}"}, {"{"}visaType{"}"}, {"{"}applicationUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailVisaApproved}
                    onChange={(value) => updateSetting("emailVisaApproved", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Visa Rejected Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}country{"}"}, {"{"}visaType{"}"}, {"{"}reason{"}"}, {"{"}applicationUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailVisaRejected}
                    onChange={(value) => updateSetting("emailVisaRejected", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Tour Email Templates */}
            {activeEmailTab === "tours" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Tour Payment Success Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}tourName{"}"}, {"{"}amount{"}"}, {"{"}pendingBalance{"}"}, {"{"}bookingId{"}"}, {"{"}bookingUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailTourPaymentSuccess}
                    onChange={(value) => updateSetting("emailTourPaymentSuccess", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Tour Payment Failed Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}tourName{"}"}, {"{"}amount{"}"}, {"{"}reason{"}"}, {"{"}bookingUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailTourPaymentFailed}
                    onChange={(value) => updateSetting("emailTourPaymentFailed", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Tour Confirmed Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}tourName{"}"}, {"{"}bookingUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailTourConfirmed}
                    onChange={(value) => updateSetting("emailTourConfirmed", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Tour Payment Reminder Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}tourName{"}"}, {"{"}pendingBalance{"}"}, {"{"}dueDate{"}"}, {"{"}bookingUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailTourPaymentReminder}
                    onChange={(value) => updateSetting("emailTourPaymentReminder", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Tour Status Update Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}tourName{"}"}, {"{"}status{"}"}, {"{"}bookingUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailTourStatusUpdate}
                    onChange={(value) => updateSetting("emailTourStatusUpdate", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Tour Vouchers Ready Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}tourName{"}"}, {"{"}bookingUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailTourVouchersReady}
                    onChange={(value) => updateSetting("emailTourVouchersReady", value)}
                    disabled={isReadOnly}
                    rows={8}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Admin & Corporate Email Templates */}
            {activeEmailTab === "admin" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Admin Welcome Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}name{"}"}, {"{"}email{"}"}, {"{"}role{"}"}, {"{"}tempPassword{"}"}, {"{"}loginUrl{"}"}, {"{"}companyName{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailAdminWelcome}
                    onChange={(value) => updateSetting("emailAdminWelcome", value)}
                    disabled={isReadOnly}
                    rows={10}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Corporate Lead Admin Notification Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}companyNameLead{"}"}, {"{"}contactName{"}"}, {"{"}email{"}"}, {"{"}message{"}"}, {"{"}createdAt{"}"}, {"{"}dashboardUrl{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailCorporateLeadAdmin}
                    onChange={(value) => updateSetting("emailCorporateLeadAdmin", value)}
                    disabled={isReadOnly}
                    rows={10}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Corporate Lead Confirmation Email
                    <span className="text-xs text-neutral-500 ml-2">Variables: {"{"}contactName{"}"}, {"{"}companyNameLead{"}"}, {"{"}supportEmail{"}"}, {"{"}supportPhone{"}"}, {"{"}companyName{"}"}</span>
                  </label>
                  <TextareaInput
                    value={settings.emailCorporateLeadConfirmation}
                    onChange={(value) => updateSetting("emailCorporateLeadConfirmation", value)}
                    disabled={isReadOnly}
                    rows={10}
                    placeholder="Leave empty to use default template..."
                    className="w-full px-4 py-2 font-mono text-sm disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 mb-2">
                <strong>Template Variables Guide:</strong>
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>User:</strong> {"{"}name{"}"}, {"{"}email{"}"}</p>
                <p><strong>Application:</strong> {"{"}applicationId{"}"}, {"{"}applicationIdShort{"}"}, {"{"}country{"}"}, {"{"}visaType{"}"}, {"{"}status{"}"}, {"{"}amount{"}"}, {"{"}reason{"}"}</p>
                <p><strong>Booking:</strong> {"{"}bookingId{"}"}, {"{"}bookingIdShort{"}"}, {"{"}tourName{"}"}, {"{"}pendingBalance{"}"}, {"{"}dueDate{"}"}</p>
                <p><strong>Links:</strong> {"{"}resetLink{"}"}, {"{"}verificationLink{"}"}, {"{"}dashboardUrl{"}"}, {"{"}applicationUrl{"}"}, {"{"}bookingUrl{"}"}</p>
                <p><strong>Company:</strong> {"{"}companyName{"}"}, {"{"}supportEmail{"}"}, {"{"}supportPhone{"}"}</p>
                <p><strong>Special:</strong> {"{"}rejectedDocsList{"}"} (for document rejection emails)</p>
              </div>
            </div>
          </div>

          {/* Payment Settings (View-Only) */}
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
            <div className="flex items-center space-x-2 mb-4">
              <CreditCard size={24} className="text-primary-600" />
              <h2 className="text-xl font-bold text-neutral-900">Payment Settings</h2>
              <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded">View Only</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Razorpay Key ID</label>
                <input
                  type="text"
                  value={settings.razorpayKeyId ? `****${settings.razorpayKeyId.slice(-4)}` : ""}
                  disabled
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 cursor-not-allowed"
                  placeholder="Configured in environment variables"
                />
                <p className="text-xs text-neutral-500 mt-1">Configured via RAZORPAY_KEY_ID environment variable</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Payment Modes</label>
                <input
                  type="text"
                  value={settings.paymentModes}
                  disabled
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Analytics & Tracking */}
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 size={24} className="text-primary-600" />
              <h2 className="text-xl font-bold text-neutral-900">Analytics & Tracking</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <CheckboxInput
                  checked={settings.analyticsEnabled}
                  onChange={(checked) => updateSetting("analyticsEnabled", checked)}
                  disabled={isReadOnly}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                />
                <label className="text-sm font-medium text-neutral-700">Enable Analytics & Tracking</label>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Google Analytics ID</label>
                  <TextInput
                    type="text"
                    value={settings.googleAnalyticsId}
                    onChange={(value) => updateSetting("googleAnalyticsId", value)}
                    disabled={isReadOnly || !settings.analyticsEnabled}
                    placeholder="G-XXXXXXXXXX"
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Meta Pixel ID</label>
                  <TextInput
                    type="text"
                    value={settings.metaPixelId}
                    onChange={(value) => updateSetting("metaPixelId", value)}
                    disabled={isReadOnly || !settings.analyticsEnabled}
                    placeholder="123456789012345"
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* System Flags */}
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
            <div className="flex items-center space-x-2 mb-4">
              <Lock size={24} className="text-primary-600" />
              <h2 className="text-xl font-bold text-neutral-900">System Flags</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CheckboxInput
                  checked={settings.registrationsEnabled}
                  onChange={(checked) => updateSetting("registrationsEnabled", checked)}
                  disabled={isReadOnly}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                />
                <label className="text-sm font-medium text-neutral-700">Allow New Registrations</label>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <CheckboxInput
                  checked={settings.maintenanceMode}
                  onChange={(checked) => updateSetting("maintenanceMode", checked)}
                  disabled={isReadOnly}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                />
                <label className="text-sm font-medium text-neutral-700">Enable Maintenance Mode</label>
              </div>
              {settings.maintenanceMode && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Maintenance Message</label>
                  <TextareaInput
                    value={settings.maintenanceMessage}
                    onChange={(value) => updateSetting("maintenanceMessage", value)}
                    disabled={isReadOnly}
                    rows={3}
                    placeholder="Message shown to users during maintenance..."
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-neutral-500 mt-1">This message will appear as a global banner on the frontend</p>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Email Settings */}
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
            <div className="flex items-center space-x-2 mb-4">
              <Mail size={24} className="text-primary-600" />
              <h2 className="text-xl font-bold text-neutral-900">Feedback Email Settings</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>How it works:</strong> When a visa is approved and submitted to the user, after 24 hours, a feedback email will be automatically sent asking them to rate your service on Google.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <CheckboxInput
                  checked={settings.feedbackEmailsEnabled}
                  onChange={(checked) => updateSetting("feedbackEmailsEnabled", checked)}
                  disabled={isReadOnly}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                />
                <div>
                  <label className="text-sm font-medium text-neutral-700">Enable Feedback Emails</label>
                  <p className="text-xs text-neutral-500 mt-1">Automatically send feedback emails 24 hours after visa approval</p>
                </div>
              </div>
              {settings.feedbackEmailsEnabled && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Google Review URL
                    <span className="text-xs text-neutral-500 ml-2">(Required if feedback emails are enabled)</span>
                  </label>
                  <TextInput
                    type="url"
                    value={settings.googleReviewUrl}
                    onChange={(value) => updateSetting("googleReviewUrl", value)}
                    disabled={isReadOnly}
                    placeholder="https://g.page/r/YOUR_GOOGLE_BUSINESS_REVIEW_LINK"
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Get your Google Business review link from your Google Business Profile. This link will be included in feedback emails.
                  </p>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const response = await fetch("/api/admin/visa-feedback/send", {
                            method: "GET",
                          });
                          const result = await response.json();
                          if (response.ok) {
                            alert(`Feedback email test completed.\n\nSent: ${result.sent}\nChecked: ${result.checked}\nErrors: ${result.errors || 0}`);
                          } else {
                            alert(`Error: ${result.error || "Failed to send test"}`);
                          }
                        } catch (error: any) {
                          alert(`Error: ${error.message || "Failed to test feedback emails"}`);
                        }
                      }}
                      disabled={isReadOnly}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Test Feedback Email System
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          {!isReadOnly && (
            <div className="flex items-center justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save size={16} />
                <span>{saving ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Save, Building2, Mail, CreditCard, BarChart3, Lock, AlertCircle, Settings } from "lucide-react";
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
  
  // Email Basics
  emailVisaSubmitted: string;
  emailDocsRejected: string;
  emailVisaApproved: string;
  emailTourBooked: string;
  emailTourConfirmed: string;
  emailVouchersReady: string;
  resendApiKey: string;
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
}

export default function AdminGeneralSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const [settings, setSettings] = useState<Settings>({
    companyName: "",
    companyLogo: "",
    companyAddress: "",
    gstin: "",
    supportEmail: "",
    supportPhone: "",
    emailVisaSubmitted: "",
    emailDocsRejected: "",
    emailVisaApproved: "",
    emailTourBooked: "",
    emailTourConfirmed: "",
    emailVouchersReady: "",
    resendApiKey: "",
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
  });

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
  }, [session, status, router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings/general");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
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
            <div className="flex items-center space-x-2 mb-4">
              <Settings size={24} className="text-primary-600" />
              <h2 className="text-xl font-bold text-neutral-900">Email Service Configuration</h2>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Configure Resend API key and sender email addresses for different modules. These override environment variables.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Resend API Key
                </label>
                <TextInput
                  type="password"
                  value={settings.resendApiKey}
                  onChange={(value) => updateSetting("resendApiKey", value)}
                  disabled={isReadOnly}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Stored securely in the database. Required for sending emails via Resend.
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
                    placeholder="Travunited <noreply@travunited.com>"
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
                    placeholder="Visa Desk <visa@travunited.com>"
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
                    placeholder="Tours Desk <tours@travunited.com>"
                    className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Used for tour booking and itinerary emails.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Email Basics */}
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
            <div className="flex items-center space-x-2 mb-4">
              <Mail size={24} className="text-primary-600" />
              <h2 className="text-xl font-bold text-neutral-900">Email Basics</h2>
            </div>
            <p className="text-sm text-neutral-600 mb-4">Editable text snippets for key emails (subject/intro lines)</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Visa Submitted Email</label>
                <TextareaInput
                  value={settings.emailVisaSubmitted}
                  onChange={(value) => updateSetting("emailVisaSubmitted", value)}
                  disabled={isReadOnly}
                  rows={2}
                  placeholder="Subject line and intro text..."
                  className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Docs Rejected Email</label>
                <TextareaInput
                  value={settings.emailDocsRejected}
                  onChange={(value) => updateSetting("emailDocsRejected", value)}
                  disabled={isReadOnly}
                  rows={2}
                  placeholder="Subject line and intro text..."
                  className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Visa Approved Email</label>
                <TextareaInput
                  value={settings.emailVisaApproved}
                  onChange={(value) => updateSetting("emailVisaApproved", value)}
                  disabled={isReadOnly}
                  rows={2}
                  placeholder="Subject line and intro text..."
                  className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Tour Booked Email</label>
                <TextareaInput
                  value={settings.emailTourBooked}
                  onChange={(value) => updateSetting("emailTourBooked", value)}
                  disabled={isReadOnly}
                  rows={2}
                  placeholder="Subject line and intro text..."
                  className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Tour Confirmed Email</label>
                <TextareaInput
                  value={settings.emailTourConfirmed}
                  onChange={(value) => updateSetting("emailTourConfirmed", value)}
                  disabled={isReadOnly}
                  rows={2}
                  placeholder="Subject line and intro text..."
                  className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Vouchers Ready Email</label>
                <TextareaInput
                  value={settings.emailVouchersReady}
                  onChange={(value) => updateSetting("emailVouchersReady", value)}
                  disabled={isReadOnly}
                  rows={2}
                  placeholder="Subject line and intro text..."
                  className="w-full px-4 py-2 disabled:bg-neutral-50 disabled:cursor-not-allowed"
                />
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

"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, User, Trash2, CheckCircle, AlertCircle, Shield, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function AccountSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setNewName(session.user.name || "");
      setNewEmail(session.user.email?.includes("@user.travunited") ? "" : session.user.email || "");
    }
  }, [session]);
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else {
      checkEmailVerification();
    }
  }, [session, status, router]);

  const checkEmailVerification = async () => {
    try {
      const response = await fetch("/api/auth/verify-email");
      if (response.ok) {
        const data = await response.json();
        setEmailVerified(data.emailVerified);
      }
    } catch (error) {
      console.error("Error checking email verification:", error);
    }
  };

  const handleVerifyEmail = async () => {
    // Redirect to verify-email page if email exists
    if (session?.user?.email && !session.user.email.includes("@user.travunited")) {
      router.push(`/verify-email?email=${encodeURIComponent(session.user.email)}&redirect=${encodeURIComponent("/dashboard/settings")}`);
      return;
    }
    
    // If no email, show error
    setError("Please add your email address first.");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setError("");

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      setOtpLoading(false);
      return;
    }

    try {
      const email = session?.user?.email;
      if (!email || email.includes("@user.travunited")) {
        setError("Invalid email address");
        setOtpLoading(false);
        return;
      }

      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "OTP verification failed");
      } else {
        setEmailVerified(true);
        setShowOtpForm(false);
        setOtp("");
        setSuccess("Email verified successfully!");
        // Refresh session to get updated verification status
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError("");

    try {
      const email = session?.user?.email;
      if (!email || email.includes("@user.travunited")) {
        setError("Invalid email address");
        setResendLoading(false);
        return;
      }

      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to resend OTP");
      } else {
        setSuccess("OTP sent successfully! Please check your email.");
        setOtp("");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setSuccess("Password changed successfully! You will be logged out for security reasons.");

        // Wait a moment to show the success message, then sign out
        setTimeout(async () => {
          // Sign out from NextAuth session
          await signOut({ redirect: false });

          // Clear any local storage
          localStorage.clear();

          // Redirect to login page with message about new password
          router.push("/login?passwordChanged=true");
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to change password. Please check your current password.");
        setLoading(false);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.otpSent) {
          setSuccess("Profile updated successfully! Please check your email for verification OTP.");
          setShowOtpForm(true);
          // Reset email verified status since new email needs verification
          setEmailVerified(false);
        } else {
          setSuccess("Profile updated successfully!");
        }
        setIsEditingProfile(false);
        // Refresh session to show new data and check verification status
        await router.refresh();
        // Wait a bit for session to update, then check verification
        setTimeout(() => {
          checkEmailVerification();
        }, 500);
      } else {
        setError(data.error || "Failed to update profile");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setError("Please type DELETE to confirm");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        // Sign out from NextAuth session
        const { signOut } = await import("next-auth/react");
        await signOut({ redirect: false });

        // Clear any local storage
        localStorage.clear();

        // Redirect to homepage
        window.location.href = "/";
      } else {
        setError(data.error || "Failed to delete account. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900">Account Settings</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Information */}
        <div className="bg-white rounded-2xl shadow-medium p-6 mb-6 border border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">Account Information</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-neutral-200">
              <div className="flex items-center space-x-3">
                <User className="text-neutral-400" size={20} />
                <div>
                  <div className="text-sm text-neutral-600">Name</div>
                  <div className="font-medium text-neutral-900">{session?.user?.name || "Not set"}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-neutral-200">
              <div className="flex items-center space-x-3">
                <Mail className="text-neutral-400" size={20} />
                <div>
                  <div className="text-sm text-neutral-600">Email</div>
                  <div className="font-medium text-neutral-900">
                    {session?.user?.email?.includes("@user.travunited")
                      ? "Not provided (Action Required)"
                      : session?.user?.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!session?.user?.email?.includes("@user.travunited") && (
                  emailVerified ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <CheckCircle size={14} />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center space-x-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        <AlertCircle size={14} />
                        <span>Not Verified</span>
                      </span>
                      <button
                        onClick={handleVerifyEmail}
                        disabled={loading}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Verify
                      </button>
                    </>
                  )
                )}
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {isEditingProfile ? "Cancel" : "Edit"}
                </button>
              </div>
            </div>

            {isEditingProfile && (
              <motion.form
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleUpdateProfile}
                className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-4 my-2"
              >
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                    placeholder="Enter your real email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium"
                >
                  {loading ? "Updating..." : "Save Changes"}
                </button>
              </motion.form>
            )}

            {session?.user?.role && (
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <Shield className="text-neutral-400" size={20} />
                  <div>
                    <div className="text-sm text-neutral-600">Account Type</div>
                    <div className="font-medium text-neutral-900 capitalize">
                      {session.user.role.replace("_", " ")}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl shadow-medium p-6 mb-6 border border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">Security</h2>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <Lock size={18} />
              <span>Change Password</span>
            </button>
          ) : (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handleChangePassword}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  minLength={8}
                />
                <p className="text-xs text-neutral-500 mt-1">Must be at least 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Changing..." : "Change Password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                    setError("");
                  }}
                  className="px-6 py-3 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </div>

        {/* Email Verification Notice */}
        {!emailVerified && !session?.user?.email?.includes("@user.travunited") && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">Email Not Verified</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  Your email address hasn&rsquo;t been verified yet. Email verification is optional and won&rsquo;t block payments,
                  but we recommend verifying your email for account security.
                </p>
                {!showOtpForm ? (
                  <button
                    onClick={handleVerifyEmail}
                    disabled={loading}
                    className="text-sm bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  >
                    Verify Email Now
                  </button>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    onSubmit={handleVerifyOtp}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-sm font-medium text-yellow-900 mb-1">
                        Enter 6-digit OTP sent to {session?.user?.email}
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-center text-lg tracking-widest"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        disabled={otpLoading || otp.length !== 6}
                        className="flex-1 text-sm bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {otpLoading ? "Verifying..." : "Verify OTP"}
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendLoading}
                        className="text-sm bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
                      >
                        {resendLoading ? "Sending..." : "Resend"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowOtpForm(false);
                          setOtp("");
                          setError("");
                        }}
                        className="text-sm text-yellow-700 px-4 py-2 rounded-lg hover:bg-yellow-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2 text-green-700 mb-6">
            <CheckCircle size={20} />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2 text-red-700 mb-6">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-medium p-6 border border-red-200">
          <h2 className="text-xl font-bold text-red-900 mb-2">Danger Zone</h2>
          <p className="text-sm text-neutral-600 mb-6">
            Once you delete your account, you will lose access to your dashboard and all your applications/bookings.
            This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <Trash2 size={18} />
              <span>Delete My Account</span>
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="DELETE"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading || deleteConfirmText !== "DELETE"}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Trash2 size={18} />
                  <span>{loading ? "Deleting..." : "Confirm Deletion"}</span>
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                    setError("");
                  }}
                  className="px-6 py-3 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}


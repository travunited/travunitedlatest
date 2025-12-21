"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";

interface AccountGateProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  email?: string;
  redirectUrl?: string;
}

export function AccountGate({ isOpen, onClose, onContinue, email = "", redirectUrl }: AccountGateProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [formData, setFormData] = useState({
    name: "",
    email: email || "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      if (data.requiresVerification) {
        // Redirect to email verification page instead of showing OTP inline
        // This allows user to continue filling form while verifying
        const currentUrl = typeof window !== "undefined" ? window.location.pathname : redirectUrl || "/dashboard";
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&redirect=${encodeURIComponent(currentUrl)}`);
        // Don't close modal yet - let redirect happen
        return;
      } else {
        // Auto login after signup (fallback for non-OTP flow)
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.ok) {
          // Merge guest application
          await mergeGuestApplication();
          onContinue();
        } else {
          setError("Signup successful but login failed. Please login manually.");
        }
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.ok) {
        // Merge guest application
        await mergeGuestApplication();
        onContinue();
      } else {
        setError(result?.error || "Invalid email or password");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setOtpLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.error || "Invalid OTP");
        setOtpLoading(false);
        return;
      }

      // Auto login after verification
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.ok) {
        // Merge guest application
        const mergeResult = await mergeGuestApplication();
        
        // Close modal
        onClose();
        
        // Redirect to continue application if we have guest data
        if (mergeResult && mergeResult.formData) {
          // Reload page to restore merged data - onContinue will handle this
          onContinue();
        } else {
          onContinue();
        }
      } else {
        setOtpError("Verification successful but login failed. Please login manually.");
      }
    } catch (error) {
      setOtpError("An error occurred. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const mergeGuestApplication = async () => {
    try {
      const response = await fetch("/api/guest-applications/merge", {
        method: "POST",
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("Error merging guest application:", error);
      // Don't block the flow if merge fails
      return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-neutral-900">
                {showOtpVerification ? "Verify Your Email" : mode === "signup" ? "Create Account" : "Login"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {showOtpVerification ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    We've sent a 6-digit verification code to <strong>{formData.email}</strong>. 
                    Please enter it below to verify your email.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-2xl tracking-widest"
                    placeholder="000000"
                  />
                </div>

                {otpError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                    <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800">{otpError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={otpLoading || otp.length !== 6}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {otpLoading ? "Verifying..." : "Verify Email"}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      setOtpError("");
                      try {
                        const response = await fetch("/api/auth/resend-otp", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: formData.email }),
                        });
                        if (response.ok) {
                          setOtpError(""); // Clear any errors
                          // Show success message briefly
                          const successMsg = "Verification code resent! Please check your email.";
                          // You could add a success state here if needed
                          alert(successMsg);
                        } else {
                          const data = await response.json();
                          setOtpError(data.error || "Failed to resend code. Please try again.");
                        }
                      } catch (error) {
                        setOtpError("Failed to resend code. Please try again.");
                      }
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    Create an account to save your visa application, upload documents securely, and track visa status.
                  </p>
                </div>

                <div className="flex border-b border-neutral-200 mb-6">
                  <button
                    onClick={() => {
                      setMode("signup");
                      setError("");
                    }}
                    className={`flex-1 py-2 text-sm font-medium ${
                      mode === "signup"
                        ? "text-primary-600 border-b-2 border-primary-600"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                    className={`flex-1 py-2 text-sm font-medium ${
                      mode === "login"
                        ? "text-primary-600 border-b-2 border-primary-600"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    Login
                  </button>
                </div>

                {mode === "signup" ? (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                          minLength={8}
                          className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="At least 8 characters"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          required
                          minLength={8}
                          className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Confirm your password"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="10 digits"
                      />
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                        <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>{loading ? "Creating Account..." : "Create Account"}</span>
                      <ArrowRight size={20} />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Enter your password"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded border-neutral-300" />
                        <span className="text-sm text-neutral-600">Remember me</span>
                      </label>
                      <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                        Forgot password?
                      </Link>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                        <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>{loading ? "Logging in..." : "Login"}</span>
                      <ArrowRight size={20} />
                    </button>
                  </form>
                )}

                <div className="mt-6 text-center text-sm text-neutral-600">
                  By continuing, you agree to our{" "}
                  <Link href="/terms" className="text-primary-600 hover:text-primary-700">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary-600 hover:text-primary-700">
                    Privacy Policy
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


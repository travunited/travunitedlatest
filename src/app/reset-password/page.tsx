"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Lock, CheckCircle, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resetId = searchParams.get("id") || searchParams.get("resetId");
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | null>(null);

  useEffect(() => {
    // Validate magic link token on mount
    const validateToken = async () => {
      if (!resetId || !token) {
        setError("Invalid reset link. Missing reset ID or token.");
        setValidating(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/validate-reset-token?id=${encodeURIComponent(resetId)}&token=${encodeURIComponent(token)}`
        );

        const data = await response.json();
        
        // Debug: Log validation response
        console.log("[Reset Password] Token validation response:", {
          status: response.status,
          ok: response.ok,
          data,
          valid: data.valid,
          hasError: !!data.error,
        });

        if (response.ok && data.valid) {
          setTokenValid(true);
          setEmail(data.email || null);
        } else {
          setError(data.error || "Invalid or expired reset link. Please request a new one.");
        }
      } catch (err) {
        console.error("Error validating reset link:", err);
        setError("An error occurred. Please try again.");
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [resetId, token]);

  // Password strength checker
  useEffect(() => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }
    
    let strength: "weak" | "medium" | "strong" = "weak";
    if (password.length >= 8) {
      strength = "medium";
      if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) {
        strength = "strong";
      } else if (password.length >= 10 && (/[A-Z]/.test(password) || /[0-9]/.test(password))) {
        strength = "medium";
      }
    }
    setPasswordStrength(strength);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!resetId || !token) {
      setError("Invalid reset session. Please request a new link.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetId, token, password }),
      });

      const data = await response.json();
      
      // Debug: Log the response
      console.log("[Reset Password] API Response:", {
        status: response.status,
        ok: response.ok,
        data,
        hasError: !!data.error,
      });

      if (response.ok) {
        setSuccess(true);
        // Auto-login after successful password reset
        if (email) {
          try {
            const signInResult = await signIn("credentials", {
              email,
              password,
              redirect: false,
            });
            
            if (signInResult?.ok) {
              // Wait a moment for session to update
              setTimeout(async () => {
                router.refresh();
                // Fetch session to get user role
                const sessionRes = await fetch("/api/auth/session");
                const session = await sessionRes.json();
                const role = session?.user?.role;
                
                // Redirect based on role
                if (role === "STAFF_ADMIN" || role === "SUPER_ADMIN") {
                  router.push("/admin");
                } else {
                  router.push("/dashboard");
                }
              }, 500);
            } else {
              // If auto-login fails, redirect to login page
              setTimeout(() => router.push("/login"), 2000);
            }
          } catch (signInError) {
            console.error("Auto-login failed:", signInError);
            setTimeout(() => router.push("/login"), 2000);
          }
        } else {
          setTimeout(() => router.push("/login"), 2000);
        }
      } else {
        setError(data.error || "Failed to reset password. Please try again.");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" />
          <p className="text-neutral-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid || !resetId || !token) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-large p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Invalid Reset Link
          </h1>
          <p className="text-neutral-600 mb-6">
            {error || "This password reset link is invalid or has expired."}
          </p>
          <Link
            href="/forgot-password"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-large p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4"
          >
            <CheckCircle size={32} className="text-green-600" />
          </motion.div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Password Reset Successful!
          </h1>
          <p className="text-neutral-600 mb-4">
            Your password has been reset successfully.
          </p>
          {email && (
            <p className="text-sm text-neutral-500 mb-6">
              Logging you in as <strong>{email}</strong>...
            </p>
          )}
          <div className="flex items-center justify-center space-x-2 text-neutral-400">
            <Loader2 className="animate-spin" size={16} />
            <span className="text-sm">Redirecting...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-large p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Lock size={32} className="text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Reset Your Password
            </h1>
            {email && (
              <p className="text-neutral-600 mb-1">
                Resetting password for <strong className="text-neutral-900">{email}</strong>
              </p>
            )}
            <p className="text-sm text-neutral-500">
              Enter your new password below. Must be at least 8 characters.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2 text-red-700 mb-6">
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  required
                  minLength={8}
                  disabled={loading}
                  className="w-full pl-10 pr-12 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`flex-1 h-2 rounded-full ${
                      passwordStrength === "weak" ? "bg-red-200" :
                      passwordStrength === "medium" ? "bg-yellow-200" :
                      passwordStrength === "strong" ? "bg-green-200" : "bg-neutral-200"
                    }`}>
                      <div className={`h-full rounded-full transition-all ${
                        passwordStrength === "weak" ? "bg-red-500 w-1/3" :
                        passwordStrength === "medium" ? "bg-yellow-500 w-2/3" :
                        passwordStrength === "strong" ? "bg-green-500 w-full" : ""
                      }`} />
                    </div>
                    {passwordStrength && (
                      <span className={`text-xs font-medium ${
                        passwordStrength === "weak" ? "text-red-600" :
                        passwordStrength === "medium" ? "text-yellow-600" :
                        "text-green-600"
                      }`}>
                        {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {password.length < 8 ? "At least 8 characters required" :
                     passwordStrength === "weak" ? "Consider adding numbers or uppercase letters" :
                     passwordStrength === "medium" ? "Good password" : "Strong password"}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  required
                  minLength={8}
                  disabled={loading}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors ${
                    confirmPassword && password !== confirmPassword ? "border-red-300" : "border-neutral-300"
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
              {confirmPassword && password === confirmPassword && password.length >= 8 && (
                <p className="mt-1 text-sm text-green-600 flex items-center space-x-1">
                  <CheckCircle size={14} />
                  <span>Passwords match</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || password.length < 8 || password !== confirmPassword}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Resetting password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

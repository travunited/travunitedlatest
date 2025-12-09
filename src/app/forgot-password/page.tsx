"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { shouldShowErrors } from "@/lib/client-config";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailValid, setEmailValid] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Validate email format
    if (!email.trim()) {
      setError("Please enter your email address");
      setEmailValid(false);
      return;
    }
    
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setEmailValid(false);
      return;
    }
    
    setEmailValid(true);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();
      
      // Debug: Log the exact response from API with full details
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[Forgot Password] 📨 API Response Received:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("Status:", response.status);
      console.log("OK:", response.ok);
      console.log("Full Response Data:", JSON.stringify(data, null, 2));
      console.log("Has emailSent field:", typeof data.emailSent !== "undefined");
      console.log("emailSent value:", data.emailSent);
      console.log("emailSent type:", typeof data.emailSent);
      console.log("Has error field:", typeof data.error !== "undefined");
      console.log("Error value:", data.error || "none");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      if (response.ok) {
        // Check if emailSent is explicitly false (not just undefined)
        if (data.emailSent === false && shouldShowErrors()) {
          setError(
            "We encountered an issue sending the email. Please check your spam folder, or try again. " +
            (data.error ? `Error: ${data.error}` : "")
          );
        } else {
          setError("");
          setSuccess("Reset link sent successfully!");
        }
        setStep("sent");
        setResendCooldown(60);
        
        // Clear any existing timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        // Start new timer
        timerRef.current = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.error || "Failed to send reset link. Please try again.");
      }
    } catch (err) {
      console.error("Error sending reset link request:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async () => {
    if (resendCooldown > 0) return;
    
    setError("");
    setLoading(true);

    try {
      // Normalize email same as handleSendLink
      const normalizedEmail = email.trim().toLowerCase();
      
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.emailSent === false && shouldShowErrors()) {
          setError(
            "We encountered an issue sending the email. Please check your spam folder, or try again. " +
            (data.error ? `Error: ${data.error}` : "")
          );
        } else {
          setError("");
        }
        setResendCooldown(60);
        
        // Clear any existing timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        // Start new timer
        timerRef.current = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.error || "Failed to resend link. Please try again.");
      }
    } catch (err) {
      console.error("Error resending reset link:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-large p-8">
          {step === "email" ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                  <Mail size={32} className="text-primary-600" />
                </div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                  Forgot Password?
                </h1>
                <p className="text-neutral-600">
                  Enter your email address and we&rsquo;ll send you a secure reset link.
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2 text-red-700 mb-6"
                >
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2 text-green-700 mb-6"
                >
                  <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{success}</span>
                </motion.div>
              )}

              <form onSubmit={handleSendLink} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${emailValid ? 'text-neutral-400' : 'text-red-400'}`} size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailValid(true);
                        setError("");
                      }}
                      required
                      disabled={loading}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors ${
                        !emailValid ? 'border-red-300 focus:ring-red-500' : 'border-neutral-300'
                      }`}
                      placeholder="your.email@example.com"
                    />
                  </div>
                  {!emailValid && (
                    <p className="mt-1 text-sm text-red-600">Please enter a valid email address</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send reset link</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  ← Back to Login
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                Check your email
              </h1>
              <p className="text-neutral-600 mb-2">
                We sent a magic reset link to <strong className="text-neutral-900">{email}</strong>.
              </p>
              <p className="text-sm text-neutral-500">
                Click the link in your email to reset your password. The link will expire in 1 hour.
              </p>
              <p className="text-sm text-neutral-500 mt-3">
                Didn't receive it? Check your spam folder or resend below.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2 text-red-700 my-4">
                  <AlertCircle size={20} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleResendLink}
                  disabled={resendCooldown > 0 || loading}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {resendCooldown > 0 ? (
                    <span>Resend in {resendCooldown}s</span>
                  ) : (
                    <>
                      <span>Resend link</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Clear timer when changing email
                    if (timerRef.current) {
                      clearInterval(timerRef.current);
                      timerRef.current = null;
                    }
                    setStep("email");
                    setError("");
                    setResendCooldown(0);
                  }}
                  className="w-full text-sm text-neutral-600 hover:text-neutral-900"
                >
                  ← Change email
                </button>
                <Link
                  href="/login"
                  className="block text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle, AlertCircle, ArrowRight, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setError("Invalid verification link. No token provided.");
    }
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;
    
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard/settings");
        }, 3000);
      } else {
        setError(data.error || "Failed to verify email. The link may be invalid or expired.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-large p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-large p-8 text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Email Verified Successfully!
          </h1>
          <p className="text-neutral-600 mb-6">
            Your email address has been verified. Redirecting to your account settings...
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <span>Go to Settings</span>
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-large p-8 text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <AlertCircle size={32} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Verification Failed
        </h1>
        <p className="text-neutral-600 mb-6">
          {error || "This verification link is invalid or has expired."}
        </p>
        <div className="space-y-3">
          <Link
            href="/dashboard/settings"
            className="block w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Go to Account Settings
          </Link>
          <Link
            href="/"
            className="block w-full border border-neutral-300 text-neutral-700 px-6 py-3 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </motion.div>
    </div>
  );
}


"use client";

import { Suspense, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Smartphone, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";

function VerifyMobileContent() {
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [verified, setVerified] = useState(false);

    const phone = searchParams?.get("phone") || "";
    const email = searchParams?.get("email") || session?.user?.email || "";
    const redirectUrl = searchParams?.get("redirect") || "/dashboard";

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setOtpError("");
        setOtpLoading(true);

        if (otp.length !== 6) {
            setOtpError("Please enter a valid 6-digit OTP");
            setOtpLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/mobile/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, otp }),
            });

            const data = await response.json();

            if (!response.ok) {
                setOtpError(data.error || "OTP verification failed");
            } else {
                setVerified(true);

                // Merge guest application
                try {
                    await fetch("/api/guest-applications/merge", { method: "POST" });
                } catch (error) {
                    console.error("Error merging guest application:", error);
                }

                // Redirect to login or dashboard
                setTimeout(() => {
                    if (sessionStatus === "authenticated") {
                        router.push(redirectUrl);
                    } else {
                        router.push(`/login?email=${encodeURIComponent(email)}&verified=true`);
                    }
                }, 1500);
            }
        } catch (err) {
            setOtpError("An error occurred. Please try again.");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setOtpError("");
        setResendLoading(true);
        setResendSuccess(false);

        try {
            const response = await fetch("/api/auth/mobile/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, type: "signup" }),
            });

            if (response.ok) {
                setResendSuccess(true);
                setOtp("");
                setTimeout(() => setResendSuccess(false), 3000);
            } else {
                const data = await response.json();
                setOtpError(data.error || "Failed to resend OTP");
            }
        } catch (err) {
            setOtpError("An error occurred. Please try again.");
        } finally {
            setResendLoading(false);
        }
    };

    if (verified) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-md w-full text-center"
                >
                    <div className="bg-white rounded-2xl shadow-large p-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                            <CheckCircle size={40} className="text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
                            Mobile Verified Successfully!
                        </h1>
                        <p className="text-neutral-600 mb-6">
                            Redirecting you...
                        </p>
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
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                            <Smartphone size={32} className="text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                            Verify Your Mobile
                        </h1>
                        <p className="text-neutral-600">
                            We've sent a 6-digit verification code to
                        </p>
                        <p className="text-neutral-900 font-medium mt-1">{phone}</p>
                    </div>

                    <form onSubmit={handleVerifyOtp} className="space-y-4">
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

                        {resendSuccess && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2">
                                <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-green-800">Verification code resent successfully!</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={otpLoading || otp.length !== 6}
                            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                        >
                            <span>{otpLoading ? "Verifying..." : "Verify Mobile"}</span>
                            {!otpLoading && <ArrowRight size={20} />}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={resendLoading}
                                className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mx-auto"
                            >
                                {resendLoading ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={16} />
                                        <span>Resend Code</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}

export default function VerifyMobilePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyMobileContent />
        </Suspense>
    );
}

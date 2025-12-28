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
            <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                {/* Background Image with Overlay */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('/images/login-bg.png')" }}
                >
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-md w-full relative z-10"
                >
                    <div className="glass rounded-2xl shadow-2xl p-8 border border-white/20 text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100/80 rounded-full mb-6 backdrop-blur-sm">
                            <CheckCircle size={48} className="text-green-600" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-neutral-900 mb-4 tracking-tight">
                            Verified!
                        </h1>
                        <p className="text-neutral-700 font-medium text-lg mb-6">
                            Securely verified your mobile. Redirecting...
                        </p>
                        <div className="flex justify-center">
                            <RefreshCw className="animate-spin text-primary-600" size={32} />
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/images/login-bg.png')" }}
            >
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-md w-full relative z-10"
            >
                <div className="glass rounded-2xl shadow-2xl p-8 border border-white/20">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100/80 rounded-full mb-6 backdrop-blur-sm">
                            <Smartphone size={40} className="text-primary-600" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-neutral-900 mb-2 tracking-tight">
                            Verify Mobile
                        </h1>
                        <p className="text-neutral-700 font-semibold text-lg">
                            {phone.startsWith("91") && phone.length === 12 ? `+${phone}` : phone}
                        </p>
                    </div>

                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-neutral-800 mb-2 text-center">
                                Enter the 6-digit code sent to you
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                required
                                className="w-full px-4 py-4 bg-white/70 border border-neutral-300 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-center text-4xl font-bold tracking-[0.5em] transition-all outline-none"
                                placeholder="000000"
                            />
                        </div>

                        {otpError && (
                            <div className="bg-red-50/90 border border-red-200 rounded-lg p-4 flex items-start space-x-2 text-red-700 backdrop-blur-sm animate-fade-in">
                                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                                <p className="text-sm font-medium">{otpError}</p>
                            </div>
                        )}

                        {resendSuccess && (
                            <div className="bg-green-50/90 border border-green-200 rounded-lg p-4 flex items-start space-x-2 text-green-700 backdrop-blur-sm animate-fade-in">
                                <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
                                <p className="text-sm font-medium">New code sent successfully!</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={otpLoading || otp.length !== 6}
                            className="w-full bg-primary-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-primary-700 shadow-xl hover:shadow-primary-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none"
                        >
                            <span className="text-lg">{otpLoading ? "Verifying..." : "Verify Mobile"}</span>
                            {!otpLoading && <ArrowRight size={22} />}
                        </button>

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={resendLoading}
                                className="text-sm font-bold text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mx-auto transition-colors"
                            >
                                {resendLoading ? (
                                    <>
                                        <RefreshCw size={18} className="animate-spin" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={18} />
                                        <span>Resend Verification Code</span>
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

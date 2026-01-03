"use client";

import { Suspense, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Smartphone, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";
import Msg91OtpWidget from "@/components/auth/Msg91OtpWidget";

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

    const handleVerifyOtp = async (e?: React.FormEvent, accessToken?: string) => {
        if (e) e.preventDefault();
        setOtpError("");
        setOtpLoading(true);

        if (!accessToken && otp.length !== 6) {
            setOtpError("Please enter a valid 6-digit OTP");
            setOtpLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/mobile/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: accessToken ? undefined : phone,
                    otp: accessToken ? undefined : otp,
                    accessToken: accessToken
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setOtpError(data.error || "Verification failed");
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

                    <div className="space-y-6">
                        {phone ? (
                            <Msg91OtpWidget
                                identifier={phone}
                                onSuccess={(data) => {
                                    const token = data.accessToken;
                                    if (token) {
                                        handleVerifyOtp(undefined, token);
                                    }
                                }}
                                onFailure={(error) => {
                                    setOtpError(error.message || "OTP Widget failed to load");
                                }}
                            />
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-neutral-600">No phone number provided for verification.</p>
                                <Link
                                    href="/login"
                                    className="text-primary-600 font-bold hover:underline mt-4 inline-block"
                                >
                                    Return to Login
                                </Link>
                            </div>
                        )}

                        {otpError && (
                            <div className="bg-red-50/90 border border-red-200 rounded-lg p-4 flex items-start space-x-2 text-red-700 backdrop-blur-sm animate-fade-in">
                                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                                <p className="text-sm font-medium">{otpError}</p>
                            </div>
                        )}

                        <div className="text-center pt-2">
                            <p className="text-xs text-neutral-500">
                                Protected by MSG91 Secure Verification
                            </p>
                        </div>
                    </div>
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

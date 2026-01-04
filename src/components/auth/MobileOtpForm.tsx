"use client";

import { useState } from "react";
import { Phone, ArrowRight, Loader2 } from "lucide-react";

interface MobileOtpFormProps {
    onSuccess: (phone: string, otp: string) => void;
    onError?: (error: string) => void;
    showName?: boolean;
    name?: string;
    onNameChange?: (name: string) => void;
}

export function MobileOtpForm({
    onSuccess,
    onError,
    showName = false,
    name = "",
    onNameChange
}: MobileOtpFormProps) {
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(0);

    const sendOtp = async () => {
        if (!phone || phone.length < 10) {
            setError("Please enter a valid 10-digit mobile number");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/mobile/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: `91${phone}` }),
            });

            const data = await response.json();

            if (response.ok) {
                setStep("otp");
                setCountdown(30);
                const timer = setInterval(() => {
                    setCountdown((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                setError(data.error || "Failed to send OTP");
                if (onError) onError(data.error);
            }
        } catch (err) {
            setError("Failed to send OTP. Please try again.");
            if (onError) onError("Network error");
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (!otp || otp.length !== 4) {
            setError("Please enter the 4-digit OTP");
            return;
        }

        setLoading(true);
        setError("");

        try {
            onSuccess(`91${phone}`, otp);
        } catch (err) {
            setError("OTP verification failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {step === "phone" ? (
                <>
                    {showName && (
                        <div>
                            <label className="block text-sm font-semibold text-neutral-800 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => onNameChange?.(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/70 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-neutral-800 mb-2">
                            Mobile Number
                        </label>
                        <div className="relative group flex">
                            <span className="inline-flex items-center px-3 py-3 bg-neutral-100 border border-r-0 border-neutral-300 rounded-l-lg text-neutral-600 text-sm font-medium">
                                +91
                            </span>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                required
                                maxLength={10}
                                className="flex-1 px-4 py-3 bg-white/70 border border-neutral-300 rounded-r-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                                placeholder="9876543210"
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={sendOtp}
                        disabled={loading || phone.length < 10}
                        className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Sending OTP...</span>
                            </>
                        ) : (
                            <>
                                <span>Get OTP</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </>
            ) : (
                <>
                    <div className="text-center mb-4">
                        <p className="text-sm text-neutral-600">
                            OTP sent to <span className="font-semibold">+91 {phone}</span>
                        </p>
                        <button
                            type="button"
                            onClick={() => setStep("phone")}
                            className="text-primary-600 text-sm font-semibold hover:underline"
                        >
                            Change number
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-neutral-800 mb-2">
                            Enter 4-Digit OTP
                        </label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            required
                            maxLength={4}
                            className="w-full px-4 py-3 bg-white/70 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-center text-3xl tracking-[1em] font-bold"
                            placeholder="0000"
                            autoFocus
                        />
                    </div>

                    <button
                        type="button"
                        onClick={verifyOtp}
                        disabled={loading || otp.length !== 4}
                        className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Verifying...</span>
                            </>
                        ) : (
                            <>
                                <span>Verify & Login</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    <div className="text-center">
                        {countdown > 0 ? (
                            <p className="text-sm text-neutral-500">
                                Resend OTP in {countdown}s
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={sendOtp}
                                disabled={loading}
                                className="text-primary-600 text-sm font-semibold hover:underline"
                            >
                                Resend OTP
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

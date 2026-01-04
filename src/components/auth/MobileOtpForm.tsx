"use client";

import { useState, useEffect } from "react";
import { Phone, ArrowRight, Loader2 } from "lucide-react";

interface MobileOtpFormProps {
    onSuccess: (phone: string, token: string, requestId?: string) => void;
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
    const [sdkLoaded, setSdkLoaded] = useState(false);
    const [requestId, setRequestId] = useState("");

    // Initialize MSG91 SDK with exposeMethods
    useEffect(() => {
        if (typeof window === "undefined") return;

        const scriptId = "msg91-otp-sdk";
        if (document.getElementById(scriptId)) {
            setSdkLoaded(true);
            return;
        }

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://verify.msg91.com/otp-provider.js";
        script.defer = true;
        script.onload = () => {
            const configuration = {
                widgetId: process.env.NEXT_PUBLIC_MSG91_WIDGET_ID,
                tokenAuth: process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH,
                exposeMethods: true,
                success: (data: any) => {
                    // This is triggered if verifyOtp is successful without its own callback
                    console.log('[Auth] Global success:', data);
                },
                failure: (error: any) => {
                    console.error('[Auth] Global failure:', error);
                }
            };

            if ((window as any).initSendOTP) {
                (window as any).initSendOTP(configuration);
                setSdkLoaded(true);
                console.log("[Auth] SDK initialized with exposeMethods: true");
            }
        };
        document.body.appendChild(script);
    }, []);

    const sendOtp = async () => {
        if (!phone || phone.length < 10) {
            setError("Please enter a valid 10-digit mobile number");
            return;
        }

        if (!sdkLoaded || !(window as any).sendOtp) {
            setError("Authentication service is initializing. Please wait.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            console.log(`[Auth] Triggering SDK sendOtp for: 91${phone}`);
            (window as any).sendOtp(
                `91${phone}`,
                (data: any) => {
                    console.log('[Auth] SDK send successful:', data);
                    // Capturing requestId/message for potential manual verification
                    const reqId = data.message || data.requestId;
                    if (reqId && typeof reqId === 'string' && reqId.length > 5) {
                        setRequestId(reqId);
                    }

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
                    setLoading(false);
                },
                (error: any) => {
                    console.error('[Auth] SDK send failed:', error);
                    setError(error.message || "Failed to send OTP");
                    setLoading(false);
                }
            );
        } catch (err) {
            console.error('[Auth] Exception in sendOtp:', err);
            setError("Failed to send OTP. Please try again.");
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (!otp || otp.length !== 4) {
            setError("Please enter the 4-digit OTP");
            return;
        }

        if (!sdkLoaded || !(window as any).verifyOtp) {
            setError("Verification service unavailable");
            return;
        }

        setLoading(true);
        setError("");

        try {
            console.log(`[Auth] Triggering SDK verifyOtp for code: ${otp}`);
            (window as any).verifyOtp(
                otp,
                (data: any) => {
                    console.log('[Auth] SDK verification successful:', data);

                    // The SDK gives us a token/JWT on success
                    let token = data.access_token || data.message || data.requestId;

                    if (token) {
                        onSuccess(`91${phone}`, token, requestId);
                    } else {
                        // Fallback: If no token in data, pass the OTP itself as token 
                        // and let the server verify manually with requestId
                        onSuccess(`91${phone}`, otp, requestId);
                    }
                    setLoading(false);
                },
                (error: any) => {
                    console.error('[Auth] SDK verification failed:', error);
                    if (error.message === "otp already verified") {
                        setError("OTP already verified. Try logging in again.");
                    } else {
                        setError(error.message || "Invalid OTP");
                    }
                    setLoading(false);
                },
                requestId // Optional: Passing requestId back to widget
            );
        } catch (err) {
            console.error('[Auth] Exception in verifyOtp:', err);
            setError("OTP verification failed");
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
                                onClick={() => {
                                    if ((window as any).retryOtp) {
                                        setLoading(true);
                                        setError("");
                                        (window as any).retryOtp(
                                            null, // default channel
                                            (data: any) => {
                                                console.log('[Auth] OTP Resend successful:', data);
                                                setCountdown(30);
                                                setLoading(false);
                                            },
                                            (error: any) => {
                                                console.error('[Auth] OTP Resend failed:', error);
                                                setError(error.message || "Failed to resend OTP");
                                                setLoading(false);
                                            },
                                            requestId
                                        );
                                    } else {
                                        sendOtp();
                                    }
                                }}
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

"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, ArrowRight, ArrowLeft, AlertCircle, CheckCircle, Smartphone } from "lucide-react";
import Link from "next/link";
import Msg91OtpWidget from "@/components/auth/Msg91OtpWidget";

interface UnifiedAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultEmail?: string;
    redirectUrl?: string;
    title?: string;
    subtitle?: string;
}

type AuthMode = "login" | "signup";
type AuthMethod = "email" | "phone";

export function UnifiedAuthModal({
    isOpen,
    onClose,
    onSuccess,
    defaultEmail = "",
    redirectUrl,
    title = "Join Travunited",
    subtitle = "Start your journey with us today",
}: UnifiedAuthModalProps) {
    const router = useRouter();

    // Auth state
    const [mode, setMode] = useState<AuthMode>("login");
    const [method, setMethod] = useState<AuthMethod | "selection">("selection");

    // Form data
    const [formData, setFormData] = useState({
        name: "",
        email: defaultEmail,
        password: "",
        confirmPassword: "",
        phone: "",
    });
    const [otpRequested, setOtpRequested] = useState(false);

    // UI state
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Merge guest application after login
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
            return null;
        }
    };

    // Handle successful authentication
    const handleAuthSuccess = async () => {
        await mergeGuestApplication();
        router.refresh();
        onSuccess();
    };

    // Handle Email+Password Login
    const handleEmailLogin = async (e: React.FormEvent) => {
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
                await handleAuthSuccess();
            } else {
                const errorMsg = result?.error || "";
                if (errorMsg.includes("EMAIL_NOT_VERIFIED") || errorMsg === "EMAIL_NOT_VERIFIED") {
                    const currentUrl = redirectUrl || (typeof window !== "undefined" ? window.location.pathname : "/dashboard");
                    router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&redirect=${encodeURIComponent(currentUrl)}`);
                    onClose();
                    return;
                } else if (errorMsg.includes("CredentialsSignin") || errorMsg === "CredentialsSignin") {
                    setError("Invalid email or password. Please check your credentials.");
                } else {
                    setError(errorMsg || "Login failed. Please try again.");
                }
            }
        } catch (error) {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Email Signup
    const handleEmailSignup = async (e: React.FormEvent) => {
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
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Signup failed");
                setLoading(false);
                return;
            }

            if (data.requiresVerification) {
                const currentUrl = redirectUrl || (typeof window !== "undefined" ? window.location.pathname : "/dashboard");
                router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&redirect=${encodeURIComponent(currentUrl)}`);
                onClose();
            } else {
                // Auto login after signup
                const result = await signIn("credentials", {
                    email: formData.email,
                    password: formData.password,
                    redirect: false,
                });

                if (result?.ok) {
                    await handleAuthSuccess();
                } else {
                    setError("Account created but login failed. Please login manually.");
                }
            }
        } catch (error) {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Phone OTP Success (from MSG91 Widget)
    const handlePhoneSuccess = useCallback(async (data: any) => {
        setLoading(true);
        setError("");

        try {
            const token = data.accessToken || data.access_token || data.token || "WIDGET_VERIFIED";

            // BYPASS NEXTAUTH: Call our custom verify route that sets the session directly
            const response = await fetch("/api/auth/verify-mobile-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accessToken: token,
                    phone: formData.phone,
                    name: formData.name,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                const errorMsg = result.error || "Authentication failed";
                if (errorMsg.includes("inactive")) {
                    setError("Account is inactive. Please contact support.");
                } else {
                    setError(errorMsg || "Authentication failed. Please try again.");
                }
            } else {
                // Success! The cookie is now set by the backend
                await handleAuthSuccess();
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [mode, formData.name, router, onSuccess, onClose]);

    // Handle Phone OTP Failure
    const handlePhoneFailure = useCallback((err: any) => {
        // Log the error but don't show it immediately if it's a user cancellation
        console.error("OTP verification failed:", err);

        // If user cancelled, just reset the view so they can try again
        if (err?.closeByUser || err?.message?.includes("cancelled")) {
            setOtpRequested(false);
            return;
        }

        setError(err?.message || "OTP verification failed");
        // Don't unmount immediately to avoid widget issues
        setTimeout(() => {
            setOtpRequested(false);
        }, 100);
    }, []);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-8">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">{title}</h2>
                                <p className="text-base text-neutral-500 mt-2">{subtitle}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-3">
                                <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        {/* INITIAL SELECTION VIEW */}
                        {method === "selection" && (
                            <div className="space-y-4 py-4">
                                <button
                                    onClick={() => { setMethod("phone"); setError(""); }}
                                    className="w-full flex items-center justify-between p-4 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-2xl transition-all group"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-primary-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
                                            <Smartphone size={24} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-lg text-neutral-900">Mobile OTP</p>
                                            <p className="text-sm text-neutral-500">Fast & secure verification</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={20} className="text-primary-600 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <button
                                    onClick={() => { setMethod("email"); setError(""); }}
                                    className="w-full flex items-center justify-between p-4 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-2xl transition-all group"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-neutral-800 text-white rounded-xl flex items-center justify-center">
                                            <Mail size={24} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-lg text-neutral-900">Email Login</p>
                                            <p className="text-sm text-neutral-500">Continue with password</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={20} className="text-neutral-400 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}

                        {/* PHONE OTP VIEW */}
                        {method === "phone" && (
                            <div className="space-y-6">
                                <button
                                    onClick={() => { setMethod("selection"); setOtpRequested(false); setError(""); }}
                                    className="flex items-center text-primary-600 hover:text-primary-700 font-semibold text-sm transition-colors mb-2"
                                >
                                    <ArrowLeft size={16} className="mr-2" />
                                    Back to options
                                </button>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                            Full Name
                                        </label>
                                        <div className="relative">
                                            <User size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                                            <input
                                                type="text"
                                                autoFocus
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-neutral-900"
                                                placeholder="Enter your name"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                            Mobile Number
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, phone: e.target.value.replace(/[^\d+]/g, "") });
                                                    setOtpRequested(false);
                                                }}
                                                className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-neutral-900 tracking-wide font-medium"
                                                placeholder="eg. +918660025993"
                                                disabled={otpRequested}
                                            />
                                        </div>
                                        {!otpRequested && (
                                            <p className="mt-2 text-xs text-neutral-500 flex items-center">
                                                <Lock size={12} className="mr-1" />
                                                Verified via secure MSG91 engine
                                            </p>
                                        )}
                                    </div>

                                    {!otpRequested ? (
                                        <button
                                            type="button"
                                            disabled={formData.phone.length < 7 || loading}
                                            onClick={() => setOtpRequested(true)}
                                            className="w-full bg-primary-600 text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                                        >
                                            {loading ? (
                                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <span>Request OTP</span>
                                                    <ArrowRight size={20} />
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-4"
                                        >
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-neutral-600">Enter code sent to <span className="font-bold text-neutral-900">{formData.phone}</span></span>
                                                <button
                                                    type="button"
                                                    onClick={() => setOtpRequested(false)}
                                                    className="text-primary-600 hover:underline font-bold"
                                                >
                                                    Change
                                                </button>
                                            </div>
                                            <Msg91OtpWidget
                                                identifier={formData.phone}
                                                onSuccess={handlePhoneSuccess}
                                                onFailure={handlePhoneFailure}
                                                className="w-full overflow-hidden rounded-2xl border border-neutral-100 shadow-sm"
                                            />
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* EMAIL FLOW VIEW */}
                        {method === "email" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                    <button
                                        onClick={() => { setMethod("selection"); setError(""); }}
                                        className="flex items-center text-primary-600 hover:text-primary-700 font-semibold text-sm transition-colors"
                                    >
                                        <ArrowLeft size={16} className="mr-2" />
                                        Back
                                    </button>

                                    <div className="flex bg-neutral-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => { setMode("login"); setError(""); }}
                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${mode === "login" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-500"}`}
                                        >
                                            Login
                                        </button>
                                        <button
                                            onClick={() => { setMode("signup"); setError(""); }}
                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${mode === "signup" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-500"}`}
                                        >
                                            Join
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={mode === "login" ? handleEmailLogin : handleEmailSignup} className="space-y-4">
                                    {mode === "signup" && (
                                        <div>
                                            <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                                Full Name
                                            </label>
                                            <div className="relative">
                                                <User size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    required
                                                    className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-700 mb-2 font-inter">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                                minLength={mode === "signup" ? 8 : undefined}
                                                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    {mode === "signup" && (
                                        <div>
                                            <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                                Confirm Password
                                            </label>
                                            <div className="relative">
                                                <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                                                <input
                                                    type="password"
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                    required
                                                    className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                    placeholder="Repeat password"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {mode === "login" && (
                                        <div className="flex justify-end">
                                            <Link href="/forgot-password" title="reset password" className="text-sm font-bold text-primary-600 hover:text-primary-700">
                                                Forgot password?
                                            </Link>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-neutral-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-black active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                                    >
                                        <span>{loading ? "Processing..." : (mode === "login" ? "Sign In" : "Create Account")}</span>
                                        {!loading && <ArrowRight size={20} />}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-10 pt-6 border-t border-neutral-100 flex flex-col items-center">
                            <label className="flex items-start space-x-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    required
                                    defaultChecked
                                    className="mt-1 w-4 h-4 text-primary-600 bg-neutral-100 border-neutral-300 rounded focus:ring-primary-500"
                                />
                                <span className="text-xs text-neutral-500 leading-relaxed text-center">
                                    I agree to the <Link href="/terms" className="text-secondary-600 font-bold hover:underline">Terms & Conditions</Link> and <Link href="/privacy" className="text-secondary-600 font-bold hover:underline">Privacy Policy</Link>
                                </span>
                            </label>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

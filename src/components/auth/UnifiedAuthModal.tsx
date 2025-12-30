"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle, Smartphone } from "lucide-react";
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
    title = "Continue with Travunited",
    subtitle = "Login or create an account to continue",
}: UnifiedAuthModalProps) {
    const router = useRouter();

    // Auth state
    const [mode, setMode] = useState<AuthMode>("login");
    const [method, setMethod] = useState<AuthMethod>("email");

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
            const verifiedPhone = data.mobileNumber || data.identifier;
            const token = data.access_token || data.token || "WIDGET_VERIFIED";

            // Unified Phone Login/Signup
            // We pass the name so the server can simple create the user if they don't exist (Implicit Signup)
            const result = await signIn("mobile-otp", {
                phone: verifiedPhone,
                otp: token,
                name: formData.name, // Pass name for implicit signup
                redirect: false,
            });

            if (result?.error) {
                if (result.error === "USER_INACTIVE") {
                    setError("Account is inactive. Please contact support.");
                } else {
                    // If it fails with USER_NOT_FOUND, it means name wasn't provided (unlikely with UI) or db error
                    setError("Authentication failed. Please try again.");
                }
            } else {
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
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-neutral-900">{title}</h2>
                                <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Login/Signup Toggle */}
                        <div className="flex p-1 bg-neutral-100 rounded-xl mb-6">
                            <button
                                type="button"
                                onClick={() => { setMode("login"); setError(""); setOtpRequested(false); }}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === "login"
                                    ? "bg-white text-primary-600 shadow-sm"
                                    : "text-neutral-600 hover:text-neutral-900"
                                    }`}
                            >
                                Login
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode("signup"); setError(""); setOtpRequested(false); }}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === "signup"
                                    ? "bg-white text-primary-600 shadow-sm"
                                    : "text-neutral-600 hover:text-neutral-900"
                                    }`}
                            >
                                Sign Up
                            </button>
                        </div>

                        {/* Email/Phone Method Toggle */}
                        <div className="flex p-1 bg-neutral-100 rounded-xl mb-6">
                            <button
                                type="button"
                                onClick={() => { setMethod("email"); setError(""); setOtpRequested(false); }}
                                className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-medium rounded-lg transition-all ${method === "email"
                                    ? "bg-white text-primary-600 shadow-sm"
                                    : "text-neutral-600 hover:text-neutral-900"
                                    }`}
                            >
                                <Mail size={16} />
                                <span>Email</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMethod("phone"); setError(""); setOtpRequested(false); }}
                                className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-medium rounded-lg transition-all ${method === "phone"
                                    ? "bg-white text-primary-600 shadow-sm"
                                    : "text-neutral-600 hover:text-neutral-900"
                                    }`}
                            >
                                <Smartphone size={16} />
                                <span>Phone</span>
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                                <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {/* Email Form */}
                        {method === "email" && (
                            <form onSubmit={mode === "login" ? handleEmailLogin : handleEmailSignup} className="space-y-4">
                                {mode === "signup" && (
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
                                )}

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
                                            minLength={mode === "signup" ? 8 : undefined}
                                            className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                                        />
                                    </div>
                                </div>

                                {mode === "signup" && (
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
                                )}

                                {mode === "login" && (
                                    <div className="flex justify-end">
                                        <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                                            Forgot password?
                                        </Link>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                                >
                                    <span>{loading ? (mode === "login" ? "Signing in..." : "Creating account...") : (mode === "login" ? "Sign In" : "Create Account")}</span>
                                    {!loading && <ArrowRight size={20} />}
                                </button>
                            </form>
                        )}

                        {/* Phone Form */}
                        {method === "phone" && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                                        <input
                                            type="text"
                                            autoFocus
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Mobile Number
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 font-semibold border-r border-neutral-300 pr-2">+91</span>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => {
                                                setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) });
                                                setOtpRequested(false);
                                            }}
                                            className="w-full pl-16 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 tracking-wider"
                                            placeholder="9876543210"
                                            disabled={otpRequested}
                                        />
                                    </div>
                                    {!otpRequested && (
                                        <p className="mt-2 text-xs text-neutral-500">We&rsquo;ll send a secure OTP to this number</p>
                                    )}
                                </div>

                                {!otpRequested ? (
                                    <motion.div
                                        key="phone-input"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <button
                                            type="button"
                                            disabled={formData.phone.length < 10 || loading}
                                            onClick={() => setOtpRequested(true)}
                                            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                                        >
                                            <span>{loading ? "Requesting OTP..." : "Request OTP"}</span>
                                            {!loading && <ArrowRight size={20} />}
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="otp-widget"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-3"
                                    >
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-neutral-600">Enter OTP sent to +91 {formData.phone}</span>
                                            <button
                                                type="button"
                                                onClick={() => setOtpRequested(false)}
                                                className="text-primary-600 hover:text-primary-700 font-semibold"
                                            >
                                                Change
                                            </button>
                                        </div>
                                        <Msg91OtpWidget
                                            identifier={`91${formData.phone}`}
                                            onSuccess={handlePhoneSuccess}
                                            onFailure={handlePhoneFailure}
                                            className="w-full overflow-hidden rounded-lg"
                                        />
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-6 pt-4 border-t border-neutral-200 text-center text-sm text-neutral-600">
                            By continuing, you agree to our{" "}
                            <Link href="/terms" className="text-primary-600 hover:text-primary-700">
                                Terms
                            </Link>{" "}
                            and{" "}
                            <Link href="/privacy" className="text-primary-600 hover:text-primary-700">
                                Privacy Policy
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

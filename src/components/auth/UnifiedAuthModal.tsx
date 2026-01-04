"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, ArrowRight, AlertCircle, Phone } from "lucide-react";
import Link from "next/link";
import { MobileOtpForm } from "./MobileOtpForm";

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
    const [method, setMethod] = useState<AuthMethod>("email");

    // Form data
    const [formData, setFormData] = useState({
        name: "",
        email: defaultEmail,
        password: "",
        confirmPassword: "",
    });

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

    // Handle Mobile OTP Success
    const handleMobileSuccess = async (data: any) => {
        setLoading(true);
        setError("");

        try {
            // The data object from MSG91 widget usually contains the verified phone and a requestId/token
            // Depending on the widget version, we might need to verify the token server-side
            const result = await signIn("mobile-otp", {
                phone: data.mobileNumber || data.phone || data.requestId, // Adjust based on MSG91 response
                token: data.requestId || data.token,
                name: formData.name,
                redirect: false,
            });

            if (result?.ok) {
                await handleAuthSuccess();
            } else {
                setError(result?.error || "Mobile verification failed");
            }
        } catch (err) {
            setError("An error occurred during mobile login");
        } finally {
            setLoading(false);
        }
    };

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

                        <div className="space-y-6">
                            {/* Mode Switcher: Login vs Signup */}
                            <div className="flex items-center justify-center mb-2">
                                <div className="flex bg-neutral-100 p-1 rounded-lg w-full">
                                    <button
                                        type="button"
                                        onClick={() => { setMode("login"); setError(""); }}
                                        className={`flex-1 px-3 py-2 text-sm font-bold rounded-md transition-all ${mode === "login" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-500"}`}
                                    >
                                        Login
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setMode("signup"); setError(""); }}
                                        className={`flex-1 px-3 py-2 text-sm font-bold rounded-md transition-all ${mode === "signup" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-500"}`}
                                    >
                                        Create Account
                                    </button>
                                </div>
                            </div>

                            {/* Method Switcher: Email vs Mobile */}
                            <div className="flex items-center justify-center mb-6">
                                <div className="flex bg-neutral-100 p-1 rounded-lg w-full">
                                    <button
                                        type="button"
                                        onClick={() => { setMethod("email"); setError(""); }}
                                        className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-xs font-bold rounded-md transition-all ${method === "email" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-500"}`}
                                    >
                                        <Mail size={14} />
                                        <span>Email</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setMethod("phone"); setError(""); }}
                                        className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-xs font-bold rounded-md transition-all ${method === "phone" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-500"}`}
                                    >
                                        <Phone size={14} />
                                        <span>Mobile</span>
                                    </button>
                                </div>
                            </div>

                            {method === "email" ? (
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
                            ) : (
                                <div className="space-y-4">
                                    <MobileOtpForm
                                        onSuccess={(phone, otp) => handleMobileSuccess({ mobileNumber: phone, requestId: otp })}
                                        onError={(err: string) => setError(err)}
                                        showName={mode === "signup"}
                                        name={formData.name}
                                        onNameChange={(name) => setFormData({ ...formData, name })}
                                    />
                                </div>
                            )}
                        </div>

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
        </AnimatePresence >
    );
}


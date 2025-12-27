"use client";

import { useState, useEffect, Suspense } from "react";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle, Smartphone } from "lucide-react";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams?.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [loginMethod, setLoginMethod] = useState<"email" | "mobile">("email");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handlePostLogin = () => {
    // Wait a moment for session to update, then check for guest applications and redirect
    setTimeout(async () => {
      router.refresh();

      // Check for guest application to merge
      try {
        const mergeResponse = await fetch("/api/guest-applications/merge", {
          method: "POST",
        });
        if (mergeResponse.ok) {
          const mergeData = await mergeResponse.json();
          // If we have merged guest application with visa data, redirect to visa application
          if (mergeData.formData && mergeData.formData.country && mergeData.formData.visaType) {
            router.push(`/apply/visa/${mergeData.formData.country}/${mergeData.formData.visaType}?restored=true`);
            return;
          }
        }
      } catch (error) {
        console.error("Error merging guest application:", error);
      }

      // Fetch session to get user role
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      const role = session?.user?.role;

      // Redirect based on role
      if (role === "STAFF_ADMIN" || role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }, 100);
  };

  // Show success message if email was just verified
  useEffect(() => {
    if (searchParams?.get("verified") === "true") {
      setSuccess("Email verified successfully! Please login with your password.");
      // Clear the verified param from URL
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  // Show message if password was just changed
  useEffect(() => {
    if (searchParams?.get("passwordChanged") === "true") {
      setSuccess("Your password has been changed successfully. Please log in with your new password.");
      // Clear the passwordChanged param from URL
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setError("Please enter a valid mobile number");
      return;
    }

    setOtpLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/mobile/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, type: "login" }),
      });

      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setSuccess("OTP sent successfully!");
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signIn("mobile-otp", {
        phone,
        otp,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "USER_NOT_FOUND") {
          setError("Account not found. Please sign up first.");
        } else if (result.error === "INVALID_OTP") {
          setError("Invalid OTP. Please try again.");
        } else {
          setError("Authentication failed. Please try again.");
        }
      } else {
        handlePostLogin();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "EMAIL_NOT_VERIFIED" || result.error.includes("EMAIL_NOT_VERIFIED")) {
          setError("Please verify your email before logging in. Check your inbox for the OTP or resend it.");
        } else {
          setError("Invalid email or password");
        }
      } else {
        handlePostLogin();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-large p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Welcome Back</h1>
            <p className="text-neutral-600">Sign in to your Travunited account</p>
          </div>

          {/* Login Method Tabs */}
          <div className="flex p-1 bg-neutral-100 rounded-xl mb-8">
            <button
              type="button"
              onClick={() => {
                setLoginMethod("email");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${loginMethod === "email"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
                }`}
            >
              <Mail size={18} />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod("mobile");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${loginMethod === "mobile"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
                }`}
            >
              <Smartphone size={18} />
              <span>Mobile OTP</span>
            </button>
          </div>

          <div className="space-y-6">
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2 text-green-700">
                <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
                <p className="text-sm">{success}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2 text-red-700">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm block">{error}</span>
                  {loginMethod === "email" && error.includes("verify your email") && email && (
                    <div className="mt-2 space-y-2">
                      <Link
                        href={`/verify-email?email=${encodeURIComponent(email)}&redirect=/dashboard`}
                        className="text-sm text-primary-600 hover:text-primary-700 underline block"
                      >
                        Verify Email Now →
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setError("");
                            const res = await fetch("/api/auth/resend-otp", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email }),
                            });
                            if (res.ok) {
                              setSuccess("Verification code resent! Please check your email.");
                            } else {
                              const data = await res.json();
                              setError(data.error || "Failed to resend code. Please try verifying your email.");
                            }
                          } catch (err) {
                            setError("Failed to resend code. Please try verifying your email.");
                          }
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 underline block"
                      >
                        Resend Verification Code
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loginMethod === "email" ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                    <span className="ml-2 text-sm text-neutral-600">Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{loading ? "Signing in..." : "Sign In"}</span>
                  {!loading && <ArrowRight size={20} />}
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={otpSent || otpLoading || loading}
                      className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                      placeholder="9876543210 (with country code)"
                    />
                  </div>
                </div>

                {otpSent ? (
                  <form onSubmit={handleMobileLogin} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Enter OTP
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                        placeholder="000000"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{loading ? "Verifying..." : "Verify & Sign In"}</span>
                      {!loading && <ArrowRight size={20} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Change Phone Number
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={handleSendOtp}
                    disabled={otpLoading || !phone}
                    className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{otpLoading ? "Sending OTP..." : "Get OTP"}</span>
                    {!otpLoading && <ArrowRight size={20} />}
                  </button>
                )}
              </div>
            )}
          </div>


          <div className="mt-6 text-center">
            <p className="text-neutral-600">
              Don&rsquo;t have an account?{" "}
              <Link href="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginPageLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-large p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Welcome Back</h1>
            <p className="text-neutral-600">Sign in to your Travunited account</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}


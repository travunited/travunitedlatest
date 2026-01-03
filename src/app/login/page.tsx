"use client";

import { useState, useEffect, Suspense, useCallback } from "react";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle, Smartphone } from "lucide-react";
import Msg91OtpWidget from "@/components/auth/Msg91OtpWidget";

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
  const [otpRequested, setOtpRequested] = useState(false);

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
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  // Show message if password was just changed
  useEffect(() => {
    if (searchParams?.get("passwordChanged") === "true") {
      setSuccess("Your password has been changed successfully. Please log in with your new password.");
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);


  const handleMobileLoginSuccess = useCallback(async (data: any) => {
    setLoading(true);
    setError("");

    try {
      // Use standard fields from our normalized Msg91OtpWidget response
      const verifiedPhone = data.phone;
      const accessToken = data.accessToken;

      const result = await signIn("mobile-otp", {
        accessToken: data.accessToken,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === "USER_INACTIVE" ? "Your account is inactive. Please contact support." : "Authentication failed. Please try again.");
      } else {
        handlePostLogin();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [handlePostLogin]);

  const handleMobileLoginFailure = useCallback((err: any) => {
    setError(err.message || "OTP verification failed");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // First check if user exists before attempting login
      try {
        const checkUserResponse = await fetch(`/api/auth/check-user?email=${encodeURIComponent(email)}`);
        if (checkUserResponse.ok) {
          const checkData = await checkUserResponse.json();
          if (!checkData.exists) {
            // User doesn't exist, redirect to signup with email pre-filled
            setLoading(false);
            router.push(`/signup?email=${encodeURIComponent(email)}&from=login`);
            return;
          }
        }
      } catch (err) {
        // If check fails, continue with login attempt
        console.error("Error checking user:", err);
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "EMAIL_NOT_VERIFIED" || result.error.includes("EMAIL_NOT_VERIFIED")) {
          setError("Please verify your email before logging in. Check your inbox for the OTP or resend it.");
        } else if (result.error === "CredentialsSignin" || result.error.includes("CredentialsSignin")) {
          setError("Invalid email or password. Don't have an account? Sign up instead.");
        } else {
          setError("Invalid email or password");
        }
      } else if (!result?.ok) {
        // Login failed but no specific error - check if user exists
        try {
          const checkUserResponse = await fetch(`/api/auth/check-user?email=${encodeURIComponent(email)}`);
          if (checkUserResponse.ok) {
            const checkData = await checkUserResponse.json();
            if (!checkData.exists) {
              // User doesn't exist, redirect to signup
              router.push(`/signup?email=${encodeURIComponent(email)}&from=login`);
              return;
            }
          }
        } catch (err) {
          // If check fails, show generic error
        }
        setError("Invalid email or password");
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
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/login-bg.png')" }}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10 animate-fade-in">
        <div className="glass rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-neutral-900 mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-neutral-700 font-medium">Sign in to your Travunited account</p>
          </div>

          <div className="flex p-1 bg-neutral-200/50 rounded-xl mb-8 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                setLoginMethod("email");
                setError("");
                setSuccess("");
                setOtpRequested(false);
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${loginMethod === "email"
                ? "bg-white text-primary-600 shadow-md transform scale-[1.02]"
                : "text-neutral-600 hover:text-neutral-900"
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
                setOtpRequested(false);
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${loginMethod === "mobile"
                ? "bg-white text-primary-600 shadow-md transform scale-[1.02]"
                : "text-neutral-600 hover:text-neutral-900"
                }`}
            >
              <Smartphone size={18} />
              <span>Mobile OTP</span>
            </button>
          </div>

          <div className="space-y-6">
            {success && (
              <div className="bg-green-50/90 border border-green-200 rounded-lg p-4 flex items-start space-x-2 text-green-700 backdrop-blur-sm">
                <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium">{success}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50/90 border border-red-200 rounded-lg p-4 flex items-start space-x-2 text-red-700 backdrop-blur-sm">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium block">{error}</span>
                  {loginMethod === "email" && error.includes("verify your email") && email && (
                    <div className="mt-2 space-y-2">
                      <Link
                        href={`/verify-email?email=${encodeURIComponent(email)}&redirect=/dashboard`}
                        className="text-sm text-primary-600 hover:text-primary-700 font-semibold underline block"
                      >
                        Verify Email Now →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loginMethod === "email" ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 group-focus-within:text-primary-500 transition-colors" size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white/70 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 group-focus-within:text-primary-500 transition-colors" size={20} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white/70 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center group cursor-pointer">
                    <input type="checkbox" className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 transition-colors" />
                    <span className="ml-2 text-sm text-neutral-700 group-hover:text-black transition-colors font-medium">Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 shadow-lg hover:shadow-primary-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none"
                >
                  <span className="text-lg">{loading ? "Signing in..." : "Sign In"}</span>
                  {!loading && <ArrowRight size={22} />}
                </button>
              </form>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">
                    Mobile Number
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 font-bold border-r border-neutral-300 pr-2">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                        setOtpRequested(false);
                      }}
                      className="w-full pl-16 pr-4 py-3 bg-white/70 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none font-bold tracking-wider"
                      placeholder="9876543210"
                      disabled={otpRequested}
                    />
                  </div>
                  {!otpRequested && (
                    <p className="mt-2 text-xs text-neutral-600 font-medium">We&rsquo;ll send a secure OTP to this number</p>
                  )}
                </div>

                {!otpRequested ? (
                  <button
                    type="button"
                    disabled={phone.length < 10 || loading}
                    onClick={() => setOtpRequested(true)}
                    className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 shadow-lg hover:shadow-primary-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none"
                  >
                    <span>Request OTP</span>
                    <ArrowRight size={22} />
                  </button>
                ) : (
                  <div className="animate-slide-up space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-600">Enter OTP sent to +91 {phone}</span>
                      <button
                        type="button"
                        onClick={() => setOtpRequested(false)}
                        className="text-primary-600 hover:text-primary-700 font-semibold"
                      >
                        Change
                      </button>
                    </div>
                    <Msg91OtpWidget
                      identifier={`91${phone}`}
                      onSuccess={handleMobileLoginSuccess}
                      onFailure={handleMobileLoginFailure}
                      className="w-full rounded-lg shadow-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-200/50 text-center">
            <p className="text-neutral-700 font-medium mb-2">
              Don&rsquo;t have an account?{" "}
              <Link href={`/signup${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-primary-600 hover:text-primary-700 font-bold transition-colors">
                Sign up now
              </Link>
            </p>
            <p className="text-xs text-neutral-500">
              New users are automatically registered for a seamless experience
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

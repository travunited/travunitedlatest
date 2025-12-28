"use client";

import { useState, useEffect, Suspense } from "react";

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


  const handleMobileLoginSuccess = async (data: any) => {
    setLoading(true);
    setError("");

    try {
      // MSG91 Widget success provides data with verified identification
      // We might need to handle the structure of 'data' based on actual widget response
      // Usually, it includes the verified mobile number and a token
      const verifiedPhone = data.mobileNumber || data.identifier;

      const result = await signIn("mobile-otp", {
        phone: verifiedPhone,
        otp: data.access_token || data.token || "WIDGET_VERIFIED",
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "USER_NOT_FOUND") {
          setError("Account not found. Please sign up first.");
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
                      className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                      className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{loading ? "Signing in..." : "Sign In"}</span>
                  {!loading && <ArrowRight size={20} />}
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <Msg91OtpWidget
                  onSuccess={handleMobileLoginSuccess}
                  onFailure={(err) => setError(err.message || "OTP verification failed")}
                  className="w-full"
                />
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

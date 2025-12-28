"use client";

import { Suspense, useState } from "react";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle, Smartphone } from "lucide-react";
import Msg91OtpWidget from "@/components/auth/Msg91OtpWidget";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function SignupPageContent() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams?.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verifyMethod, setVerifyMethod] = useState<"email" | "mobile">("email");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMobileSignupSuccess = async (data: any) => {
    setLoading(true);
    setError("");

    try {
      const verifiedPhone = data.mobileNumber || data.identifier;

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: verifiedPhone,
          verifyMethod: "mobile",
          isVerified: true,
          accessToken: data.access_token || data.token
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Signup failed");
      } else {
        // Since mobile is already verified by widget, we can auto-login or redirect to login
        // For security, if the API doesn't auto-login, we redirect to login with a success msg
        router.push(`/login?email=${encodeURIComponent(verifiedPhone)}&verified=true`);
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

    if (verifyMethod === "email" && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Normalize phone if mobile verification chosen
      let normalizedPhone = undefined;
      if (verifyMethod === "mobile") {
        if (!phone || phone.length !== 10) {
          setError("Please enter a valid 10-digit mobile number");
          setLoading(false);
          return;
        }
        normalizedPhone = `91${phone}`;
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          phone: normalizedPhone,
          verifyMethod
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
      } else {
        // Show OTP verification step
        if (data.requiresVerification && verifyMethod === "email") {
          // Get redirect URL from search params
          const redirectUrl = searchParams?.get("redirect") || "/dashboard";
          // Redirect to email verification page
          router.push(`/verify-email?email=${encodeURIComponent(email || "")}&redirect=${encodeURIComponent(redirectUrl)}`);
        } else {
          // Auto login after signup (fallback for old flow or direct login after email signup)
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (result?.ok) {
            // Merge guest application after login
            try {
              await fetch("/api/guest-applications/merge", {
                method: "POST",
              });
            } catch (error) {
              console.error("Error merging guest application:", error);
            }
            const redirectUrl = searchParams?.get("redirect") || "/dashboard";
            router.push(redirectUrl);
          } else {
            router.push("/login");
          }
        }
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
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Create Account</h1>
            <p className="text-neutral-600">Join Travunited to start your travel journey</p>
          </div>

          {/* Signup Method Tabs */}
          <div className="flex p-1 bg-neutral-100 rounded-xl mb-8">
            <button
              type="button"
              onClick={() => {
                setVerifyMethod("mobile");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${verifyMethod === "mobile"
                ? "bg-white text-primary-600 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
                }`}
            >
              <Smartphone size={18} />
              <span>Phone</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setVerifyMethod("email");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${verifyMethod === "email"
                ? "bg-white text-primary-600 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
                }`}
            >
              <Mail size={18} />
              <span>Email</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2 text-red-700">
                <AlertCircle size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {verifyMethod === "email" ? (
              <>
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
                      minLength={8}
                      className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <Msg91OtpWidget
                  onSuccess={handleMobileSignupSuccess}
                  onFailure={(err) => setError(err.message || "OTP verification failed")}
                  className="w-full"
                />
              </div>
            )}

            <div className="flex items-start">
              <input
                type="checkbox"
                required
                className="mt-1 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <label className="ml-2 text-sm text-neutral-600">
                I agree to the{" "}
                <Link href="/terms" className="text-primary-600 hover:text-primary-700">
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-700">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? "Creating account..." : "Create Account"}</span>
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-neutral-600">
              Already have an account?{" "}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignupLoadingState() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-neutral-600">Loading signup form...</p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoadingState />}>
      <SignupPageContent />
    </Suspense>
  );
}


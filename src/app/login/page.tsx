"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle, Phone } from "lucide-react";
import { MobileOtpForm } from "@/components/auth/MobileOtpForm";

type LoginMethod = "email" | "phone";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams?.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<LoginMethod>("email");
  const router = useRouter();

  const handlePostLogin = () => {
    setTimeout(async () => {
      router.refresh();

      try {
        const mergeResponse = await fetch("/api/guest-applications/merge", {
          method: "POST",
        });
        if (mergeResponse.ok) {
          const mergeData = await mergeResponse.json();
          if (mergeData.formData && mergeData.formData.country && mergeData.formData.visaType) {
            router.push(`/apply/visa/${mergeData.formData.country}/${mergeData.formData.visaType}?restored=true`);
            return;
          }
        }
      } catch (error) {
        console.error("Error merging guest application:", error);
      }

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = session?.user?.role;

      if (role === "STAFF_ADMIN" || role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }, 100);
  };

  useEffect(() => {
    if (searchParams?.get("verified") === "true") {
      setSuccess("Email verified successfully! Please login with your password.");
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams?.get("passwordChanged") === "true") {
      setSuccess("Your password has been changed successfully. Please log in with your new password.");
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      try {
        const checkUserResponse = await fetch(`/api/auth/check-user?email=${encodeURIComponent(email)}`);
        if (checkUserResponse.ok) {
          const checkData = await checkUserResponse.json();
          if (!checkData.exists) {
            setLoading(false);
            router.push(`/signup?email=${encodeURIComponent(email)}&from=login`);
            return;
          }
        }
      } catch (err) {
        console.error("Error checking user:", err);
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "EMAIL_NOT_VERIFIED" || result.error.includes("EMAIL_NOT_VERIFIED")) {
          setError("Please verify your email before logging in.");
        } else if (result.error === "CredentialsSignin" || result.error.includes("CredentialsSignin")) {
          setError("Invalid email or password.");
        } else {
          setError("Invalid email or password");
        }
      } else if (!result?.ok) {
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

  const handleMobileSuccess = async (phone: string, token: string, requestId?: string) => {
    setLoading(true);
    setError("");

    try {
      const result = await signIn("mobile-otp", {
        phone,
        token,
        requestId,
        redirect: false,
      });

      if (result?.ok) {
        handlePostLogin();
      } else {
        setError(result?.error || "Mobile verification failed");
      }
    } catch (err) {
      setError("An error occurred during mobile login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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
                  {error.includes("verify your email") && email && (
                    <Link
                      href={`/verify-email?email=${encodeURIComponent(email)}&redirect=/dashboard`}
                      className="text-sm text-primary-600 hover:text-primary-700 font-semibold underline block mt-2"
                    >
                      Verify Email Now →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Method Switcher */}
            <div className="flex bg-neutral-100 p-1 rounded-lg w-full">
              <button
                type="button"
                onClick={() => { setMethod("email"); setError(""); }}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 text-sm font-bold rounded-md transition-all ${method === "email" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-500"}`}
              >
                <Mail size={16} />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => { setMethod("phone"); setError(""); }}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 text-sm font-bold rounded-md transition-all ${method === "phone" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-500"}`}
              >
                <Phone size={16} />
                <span>Mobile</span>
              </button>
            </div>

            {method === "email" ? (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">Email Address</label>
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
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">Password</label>
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
              <MobileOtpForm
                onSuccess={handleMobileSuccess}
                onError={(err) => setError(err)}
              />
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-200/50 text-center">
            <p className="text-neutral-700 font-medium mb-2">
              Don&rsquo;t have an account?{" "}
              <Link href={`/signup${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-primary-600 hover:text-primary-700 font-bold transition-colors">
                Sign up now
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



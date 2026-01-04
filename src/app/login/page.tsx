"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams?.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

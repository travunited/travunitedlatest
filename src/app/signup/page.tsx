"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, ArrowRight, AlertCircle, Phone } from "lucide-react";
import { MobileOtpForm } from "@/components/auth/MobileOtpForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SignupMethod = "email" | "phone";

function SignupPageContent() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams?.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [method, setMethod] = useState<SignupMethod>("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePostSignup = () => {
    setTimeout(async () => {
      router.refresh();
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!name || name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters)");
      setLoading(false);
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      if (data.requiresVerification) {
        const redirectUrl = searchParams?.get("redirect") || "/dashboard";
        router.push(`/verify-email?email=${encodeURIComponent(email || "")}&redirect=${encodeURIComponent(redirectUrl)}`);
      } else {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.ok) {
          const redirectUrl = searchParams?.get("redirect") || "/dashboard";
          router.push(redirectUrl);
        } else {
          router.push("/login?email=" + encodeURIComponent(email));
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
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
        name: name.trim() || undefined,
        redirect: false,
      });

      if (result?.ok) {
        handlePostSignup();
      } else {
        setError(result?.error || "Mobile verification failed");
      }
    } catch (err) {
      setError("An error occurred during mobile signup");
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
            <h1 className="text-4xl font-extrabold text-neutral-900 mb-2 tracking-tight">Join Travunited</h1>
            <p className="text-neutral-700 font-medium">Start your journey with us today</p>
          </div>

          <div className="space-y-6">
            {searchParams?.get("from") === "login" && (
              <div className="bg-blue-50/90 border border-blue-200 rounded-lg p-4 flex items-start space-x-2 text-blue-700 backdrop-blur-sm animate-fade-in">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Account not found. Please create an account to continue.
                </span>
              </div>
            )}

            {error && (
              <div className="bg-red-50/90 border border-red-200 rounded-lg p-4 flex items-start space-x-2 text-red-700 backdrop-blur-sm animate-fade-in">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
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
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 group-focus-within:text-primary-500 transition-colors" size={20} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white/70 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

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
                      minLength={8}
                      className="w-full pl-10 pr-4 py-3 bg-white/70 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 group-focus-within:text-primary-500 transition-colors" size={20} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white/70 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>

                <div className="flex items-start group cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 transition-colors"
                    id="terms"
                  />
                  <label htmlFor="terms" className="ml-2 text-sm text-neutral-700 group-hover:text-black transition-colors font-medium">
                    I agree to the{" "}
                    <Link href="/terms" className="text-primary-600 hover:text-primary-700 font-bold">Terms & Conditions</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-primary-600 hover:text-primary-700 font-bold">Privacy Policy</Link>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 shadow-lg hover:shadow-primary-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
                >
                  <span className="text-lg">{loading ? "Creating account..." : "Create Account"}</span>
                  {!loading && <ArrowRight size={22} />}
                </button>
              </form>
            ) : (
              <MobileOtpForm
                onSuccess={handleMobileSuccess}
                onError={(err) => setError(err)}
                showName={true}
                name={name}
                onNameChange={setName}
              />
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-200/50 text-center">
            <p className="text-neutral-700 font-medium">
              Already have an account?{" "}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-bold transition-colors">
                Log in
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



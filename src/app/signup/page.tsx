"use client";

import { Suspense, useState, useCallback } from "react";

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
  const [phone, setPhone] = useState(searchParams?.get("phone") || "");
  // If phone is provided, default to mobile verification
  const [verifyMethod, setVerifyMethod] = useState<"email" | "mobile">(
    searchParams?.get("phone") ? "mobile" : "email"
  );
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileVerificationToken, setMobileVerificationToken] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMobileSignupSuccess = useCallback(async (data: any) => {
    setLoading(true);
    setError("");

    // Validate name before proceeding
    if (!name || name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters)");
      setLoading(false);
      return;
    }

    try {
      const verifiedPhone = data.mobileNumber || data.identifier || data.phone;
      const token = data.access_token || data.token || data.accessToken;

      if (!verifiedPhone) {
        setError("Phone number verification failed. Please try again.");
        setLoading(false);
        return;
      }

      // Store verification state
      setMobileVerified(true);
      setMobileVerificationToken(token);

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: verifiedPhone,
          verifyMethod: "mobile",
          isVerified: true,
          accessToken: token
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Signup failed. Please try again.");
        setLoading(false);
        setMobileVerified(false);
        setMobileVerificationToken(null);
      } else {
        // Since mobile is already verified by widget, we can auto-login or redirect to login
        // For security, if the API doesn't auto-login, we redirect to login with a success msg
        router.push(`/login?email=${encodeURIComponent(verifiedPhone)}&verified=true`);
      }
    } catch (err) {
      console.error("Mobile signup error:", err);
      setError("An error occurred. Please try again.");
      setLoading(false);
      setMobileVerified(false);
      setMobileVerificationToken(null);
    }
  }, [name, router]);

  const handleMobileSignupFailure = useCallback((err: any) => {
    setError(err.message || "OTP verification failed");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate name first
    if (!name || name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters)");
      setLoading(false);
      return;
    }

    // For mobile signup, require verification through widget
    if (verifyMethod === "mobile") {
      if (!phone || phone.length !== 10) {
        setError("Please enter a valid 10-digit mobile number");
        setLoading(false);
        return;
      }
      if (!mobileVerified || !mobileVerificationToken) {
        setError("Please complete mobile verification using the OTP widget above");
        setLoading(false);
        return;
      }
    }

    if (verifyMethod === "email") {
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
    }

    try {
      // Normalize phone if mobile verification chosen
      let normalizedPhone = undefined;
      if (verifyMethod === "mobile") {
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
          verifyMethod,
          ...(verifyMethod === "mobile" && mobileVerified && mobileVerificationToken ? {
            isVerified: true,
            accessToken: mobileVerificationToken
          } : {})
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
      } else {
        // Show OTP verification step
        if (data.requiresVerification) {
          const redirectUrl = searchParams?.get("redirect") || "/dashboard";
          if (verifyMethod === "email") {
            router.push(`/verify-email?email=${encodeURIComponent(email || "")}&redirect=${encodeURIComponent(redirectUrl)}`);
          } else {
            router.push(`/verify-mobile?phone=${encodeURIComponent(normalizedPhone || "")}&redirect=${encodeURIComponent(redirectUrl)}`);
          }
        } else {
          // If already verified (e.g. verification-first flow or verification skipped)
          if (verifyMethod === "email") {
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
          } else {
            // For mobile, redirect to login with verified flag
            router.push(`/login?email=${encodeURIComponent(normalizedPhone || "")}&verified=true`);
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
            <h1 className="text-4xl font-extrabold text-neutral-900 mb-2 tracking-tight">Join Travunited</h1>
            <p className="text-neutral-700 font-medium">Start your journey with us today</p>
          </div>

          <div className="flex p-1 bg-neutral-200/50 rounded-xl mb-8 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                setVerifyMethod("email");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${verifyMethod === "email"
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
                setVerifyMethod("mobile");
                setError("");
                setMobileVerified(false);
                setMobileVerificationToken(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${verifyMethod === "mobile"
                ? "bg-white text-primary-600 shadow-md transform scale-[1.02]"
                : "text-neutral-600 hover:text-neutral-900"
                }`}
            >
              <Smartphone size={18} />
              <span>Phone</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-2">
                  Full Name
                </label>
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
            </div>

            {verifyMethod === "email" ? (
              <>
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
                      minLength={8}
                      className="w-full pl-10 pr-4 py-3 bg-white/70 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">
                    Confirm Password
                  </label>
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
              </>
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
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full pl-16 pr-4 py-3 bg-white/70 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none font-bold tracking-wider"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                {phone.length === 10 && (
                  <div className="animate-slide-up">
                    <Msg91OtpWidget
                      identifier={`91${phone}`}
                      onSuccess={handleMobileSignupSuccess}
                      onFailure={handleMobileSignupFailure}
                      className="w-full overflow-hidden rounded-lg shadow-sm"
                    />
                  </div>
                )}
              </div>
            )}

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
              disabled={loading || (verifyMethod === "mobile" && !mobileVerified)}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 shadow-lg hover:shadow-primary-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
            >
              <span className="text-lg">
                {loading 
                  ? "Creating account..." 
                  : verifyMethod === "mobile" && !mobileVerified
                    ? "Verify Mobile to Continue"
                    : "Create Account"}
              </span>
              {!loading && verifyMethod !== "mobile" && <ArrowRight size={22} />}
              {verifyMethod === "mobile" && mobileVerified && !loading && <CheckCircle size={22} />}
            </button>
          </form>

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


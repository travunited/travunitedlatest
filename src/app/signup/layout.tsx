import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create Account – Travunited",
  description: "Sign up for a free Travunited account to apply for visas and book holidays online.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

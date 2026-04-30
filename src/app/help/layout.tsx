import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Help & Support – Travunited",
  description:
    "Need help? Contact Travunited's support team for assistance with visa applications, document uploads, payments or any travel-related queries.",
  openGraph: {
    title: "Help & Support – Travunited",
    description: "Get help with visa applications, document uploads, payments and travel queries.",
    url: "https://travunited.in/help",
    siteName: "Travunited",
    images: [{ url: "https://travunited.in/og-default.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Help & Support – Travunited",
    description: "Get help with visa applications, document uploads, payments and travel queries.",
  },
};

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

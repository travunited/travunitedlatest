import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Frequently Asked Questions – Travunited",
  description:
    "Find answers to common questions about visa applications, processing times, document requirements, payments and holiday bookings at Travunited.",
  openGraph: {
    title: "Frequently Asked Questions – Travunited",
    description: "Answers to common questions about visas, documents, payments and holiday bookings.",
    url: "https://travunited.in/faq",
    siteName: "Travunited",
    images: [{ url: "https://travunited.in/og-default.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Frequently Asked Questions – Travunited",
    description: "Answers to common questions about visas, documents, payments and holiday bookings.",
  },
};

export default function FaqLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

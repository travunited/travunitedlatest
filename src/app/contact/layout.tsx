import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Contact Us – Travunited",
  description:
    "Get in touch with Travunited for visa queries, holiday bookings or corporate travel enquiries. We're here to help you plan your perfect trip.",
  openGraph: {
    title: "Contact Us – Travunited",
    description: "Reach out for visa queries, holiday bookings or corporate travel support.",
    url: "https://travunited.in/contact",
    siteName: "Travunited",
    images: [{ url: "https://travunited.in/og-default.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us – Travunited",
    description: "Reach out for visa queries, holiday bookings or corporate travel support.",
  },
};

export default function ContactLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

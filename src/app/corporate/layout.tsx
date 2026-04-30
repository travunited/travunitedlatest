import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Corporate Travel Solutions – Travunited",
  description:
    "Travunited offers end-to-end corporate travel management — group visa processing, business travel packages and dedicated account managers for Indian companies.",
  openGraph: {
    title: "Corporate Travel Solutions – Travunited",
    description: "Group visa processing, business travel packages and dedicated support for companies.",
    url: "https://travunited.in/corporate",
    siteName: "Travunited",
    images: [{ url: "https://travunited.in/og-default.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Corporate Travel Solutions – Travunited",
    description: "Group visa processing, business travel packages and dedicated support for companies.",
  },
};

export default function CorporateLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

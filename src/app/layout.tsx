import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CertificationsBar } from "@/components/layout/CertificationsBar";
import { HelpButton } from "@/components/ui/HelpButton";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { Clarity } from "@/components/analytics/Clarity";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { ChunkErrorHandler } from "@/components/ChunkErrorHandler";

const inter = Inter({ subsets: ["latin"] });

// Safely get base URL for metadata
function getBaseUrl(): string {
  try {
    return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  } catch {
    return "http://localhost:3000";
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Travunited - Visas & Holidays, Seamlessly Managed",
    template: "%s | Travunited"
  },
  description: "Premium visa services and tour packages for Indian travellers. Apply for UAE, Singapore, Thailand visas online. Trusted by thousands for seamless travel experiences.",
  keywords: ["visa services", "holiday packages", "tour packages", "online visa application", "travel agency India", "UAE visa", "Singapore visa", "Thailand visa", "Travunited"],
  authors: [{ name: "Travunited Team" }],
  creator: "Travunited",
  publisher: "Travunited",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://travunited.in",
    siteName: "Travunited",
    title: "Travunited - Visas & Holidays, Seamlessly Managed",
    description: "Premium visa services and tour packages for Indian travellers. Trusted by thousands for seamless travel experiences.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Travunited - Visas & Holidays",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Travunited - Visas & Holidays",
    description: "Premium visa services and tour packages for Indian travellers.",
    images: ["/og-default.png"],
    creator: "@travunited",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: ["/favicon-16x16.png"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "Travunited",
                "url": "https://travunited.in",
                "logo": "https://travunited.in/logo.png",
                "description": "Premium visa services and holiday packages for Indian travellers.",
                "contactPoint": {
                  "@type": "ContactPoint",
                  "telephone": "+91 63603 92398",
                  "contactType": "customer support",
                  "areaServed": "IN",
                  "availableLanguage": "English",
                },
                "sameAs": [
                  "https://www.instagram.com/travunited",
                  "https://www.facebook.com/travunited",
                  "https://twitter.com/travunited"
                ]
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "Travunited",
                "url": "https://travunited.in",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://travunited.in/visas?search={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              }
            ]),
          }}
        />
        <ChunkErrorHandler />
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        <MetaPixel pixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} />
        <Clarity clarityId="w58yhbqxes" />
        <SessionProvider>
          <ScrollToTop />
          <Navbar />
          <main className="min-h-screen pt-16">
            {children}
          </main>
          <Footer />
          <CertificationsBar />
          <HelpButton />
        </SessionProvider>
      </body>
    </html>
  );
}


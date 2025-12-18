import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CertificationsBar } from "@/components/layout/CertificationsBar";
import { HelpButton } from "@/components/ui/HelpButton";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { ChunkErrorHandler } from "@/components/ChunkErrorHandler";
import { ContentProtection } from "@/components/layout/ContentProtection";

const inter = Inter({ subsets: ["latin"] });

// Safely get base URL for metadata
function getBaseUrl(): string {
  try {
    return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  } catch {
    return "http://localhost:3000";
  }
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: "Travunited - Visas & Holidays, Seamlessly Managed",
  description: "Premium visa services and tour packages for Indian travellers. Trusted by thousands for seamless travel experiences.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
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
        <ChunkErrorHandler />
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        <MetaPixel pixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} />
        <ContentProtection />
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


import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/"
          className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-8 text-sm"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-neutral-900 mb-6">Privacy Policy</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-neutral-600 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">1. Introduction</h2>
            <p className="text-neutral-700 leading-relaxed">
              Travunited (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy 
              Policy explains how we collect, use, disclose, and safeguard your information when you 
              use our website and services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">Personal Information</h3>
                <p className="text-neutral-700 leading-relaxed mb-2">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-neutral-700">
                  <li>Name, email address, phone number</li>
                  <li>Passport details and travel documents</li>
                  <li>Payment information</li>
                  <li>Travel preferences and requirements</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">Usage Information</h3>
                <p className="text-neutral-700 leading-relaxed">
                  We automatically collect information about how you interact with our website, including 
                  IP address, browser type, pages visited, and time spent on pages.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Process and manage your visa applications and bookings</li>
              <li>Communicate with you about your applications and services</li>
              <li>Send you important updates and notifications</li>
              <li>Improve our services and website functionality</li>
              <li>Comply with legal obligations and prevent fraud</li>
              <li>Send marketing communications (with your consent)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">4. Information Sharing</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Government authorities and embassies for visa processing</li>
              <li>Service providers who assist in our operations</li>
              <li>Legal authorities when required by law</li>
              <li>Business partners with your explicit consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">5. Data Security</h2>
            <p className="text-neutral-700 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction. However, 
              no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">6. Your Rights</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate or incomplete information</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Withdraw consent at any time</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">7. Cookies</h2>
            <p className="text-neutral-700 leading-relaxed">
              We use cookies and similar technologies to enhance your experience. For more information, 
              please see our{" "}
              <Link href="/cookies" className="text-primary-600 hover:text-primary-700 underline">
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">8. Data Retention</h2>
            <p className="text-neutral-700 leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes 
              outlined in this policy, unless a longer retention period is required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-neutral-700 leading-relaxed">
              Our services are not intended for individuals under the age of 18. We do not knowingly 
              collect personal information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-neutral-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">11. Contact Us</h2>
            <p className="text-neutral-700 leading-relaxed">
              If you have any questions about this Privacy Policy or wish to exercise your rights, 
              please contact us at{" "}
              <a href="mailto:privacy@travunited.com" className="text-primary-600 hover:text-primary-700 underline">
                privacy@travunited.com
              </a>
              {" "}or{" "}
              <a href="mailto:info@travunited.com" className="text-primary-600 hover:text-primary-700 underline">
                info@travunited.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}


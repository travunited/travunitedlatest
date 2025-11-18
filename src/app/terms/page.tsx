import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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

        <h1 className="text-4xl font-bold text-neutral-900 mb-6">Terms & Conditions</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-neutral-600 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-neutral-700 leading-relaxed">
              By accessing and using Travunited&apos;s services, you accept and agree to be bound by the 
              terms and provision of this agreement. If you do not agree to these terms, please do 
              not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">2. Services</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Travunited provides visa application assistance, tour packages, and corporate travel 
              services. We act as an intermediary between you and the relevant authorities or service 
              providers.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              While we strive to provide accurate information and assistance, final visa decisions 
              rest with the respective embassies or consulates. We cannot guarantee visa approval.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">3. User Responsibilities</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">You agree to:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Provide accurate and complete information</li>
              <li>Submit all required documents in a timely manner</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Use our services only for lawful purposes</li>
              <li>Maintain the confidentiality of your account credentials</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">4. Payment Terms</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              All fees are payable in advance unless otherwise agreed. Payment methods include credit 
              cards, debit cards, and bank transfers.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              Service fees are non-refundable once processing has begun, except as outlined in our 
              Refund Policy. Government fees and charges are separate and may be refundable by the 
              respective authorities.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">5. Limitation of Liability</h2>
            <p className="text-neutral-700 leading-relaxed">
              Travunited shall not be liable for any indirect, incidental, special, or consequential 
              damages arising from the use of our services. Our total liability shall not exceed the 
              amount paid by you for the specific service in question.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">6. Intellectual Property</h2>
            <p className="text-neutral-700 leading-relaxed">
              All content on this website, including text, graphics, logos, and software, is the 
              property of Travunited and is protected by copyright and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">7. Privacy</h2>
            <p className="text-neutral-700 leading-relaxed">
              Your use of our services is also governed by our Privacy Policy. Please review our 
              Privacy Policy to understand our practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">8. Modifications</h2>
            <p className="text-neutral-700 leading-relaxed">
              Travunited reserves the right to modify these terms at any time. Changes will be 
              effective immediately upon posting. Your continued use of our services constitutes 
              acceptance of the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">9. Governing Law</h2>
            <p className="text-neutral-700 leading-relaxed">
              These terms shall be governed by and construed in accordance with the laws of India. 
              Any disputes shall be subject to the exclusive jurisdiction of the courts in Karnataka, India.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">10. Contact Us</h2>
            <p className="text-neutral-700 leading-relaxed">
              If you have any questions about these Terms & Conditions, please contact us at{" "}
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


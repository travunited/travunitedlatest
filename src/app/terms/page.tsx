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
          <div className="text-neutral-600 mb-8 space-y-1">
            <p>Effective Date: January 2026</p>
            <p>Last Updated: January 2026</p>
          </div>

          <p className="text-neutral-700 leading-relaxed mb-8">
            Welcome to Travunited (“we”, “us”, “our”). These Terms & Conditions govern your access to and use of our website, services, and offerings. By using our website or availing our services, you agree to be bound by these Terms.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">1. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li><strong>“Travunited”</strong> refers to Travunited of India Pvt Ltd.</li>
              <li><strong>“Client / User / Customer”</strong> refers to any individual or entity using our website or services.</li>
              <li><strong>“Services”</strong> include visa assistance, flight bookings, hotel reservations, holiday packages, insurance facilitation, and other travel-related services.</li>
              <li><strong>“Third-Party Suppliers”</strong> include airlines, hotels, embassies, consulates, transport providers, and other service partners.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">2. Scope of Services</h2>
            <p className="text-neutral-700 leading-relaxed">
              Travunited acts as a facilitator and service coordinator. Actual services such as flights, hotels, visas, and insurance are governed by the terms and conditions of respective third-party suppliers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">3. Visa Disclaimer (IMPORTANT)</h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Visa approval, rejection, processing time, and validity are solely at the discretion of the respective embassy/consulate.</li>
              <li>Travunited does not guarantee visa approval under any circumstances.</li>
              <li>Service charges are non-refundable even if withdrawn immediately and in case of visa rejection, both service charge and embassy fees are non-refundable.</li>
              <li>Submission of incomplete, incorrect, or fraudulent documents is the sole responsibility of the applicant.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">4. Payments & Pricing</h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>All prices are subject to availability and may change due to fare fluctuation, currency changes, taxes, or supplier revisions.</li>
              <li>Full or partial payment may be required in advance to confirm services in case of packages.</li>
              <li>Services are considered confirmed only after receipt of payment.</li>
              <li>Prices are exclusive of GST or other statutory taxes unless explicitly mentioned.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">5. Cancellations & Refunds</h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>All cancellations are subject to airline, hotel, embassy, and supplier cancellation rules.</li>
              <li>Refunds, if applicable, will be processed as per our Refund Policy.</li>
              <li>Travunited service charges are generally non-refundable.</li>
              <li>Refund processing timelines depend on third-party providers and banks.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">6. Intellectual Property & Copyright</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              All content on this website, including text, graphics, logos, images, UI, software, and brand elements, are the intellectual property of Travunited of India Pvt Ltd.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Unauthorized copying, reproduction, distribution, or commercial use is strictly prohibited.
            </p>
            <p className="text-neutral-700 leading-relaxed font-semibold">
              Travunited™ is a trademark of Travunited of India Pvt Ltd.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Travunited shall not be liable for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 mb-4">
              <li>Flight delays, cancellations, overbookings</li>
              <li>Hotel service deficiencies</li>
              <li>Loss of baggage, personal injury, illness, or death</li>
              <li>Visa rejections or delays</li>
              <li>Acts or omissions of third-party suppliers</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed">
              Our liability, if any, shall be limited to the service fees paid to Travunited.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">8. Force Majeure</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Travunited shall not be held responsible for failure or delay in performance due to events beyond reasonable control, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Natural disasters</li>
              <li>Pandemics</li>
              <li>Government restrictions</li>
              <li>War, strikes, or civil unrest</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">9. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Users must provide accurate, complete, and lawful information.</li>
              <li>Misrepresentation or fraudulent documentation may result in service termination without refund.</li>
              <li>Users are responsible for checking travel documents, passport validity, and health requirements.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">10. Website Usage</h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Users shall not misuse the website or attempt unauthorized access.</li>
              <li>Content may not be used for commercial purposes without written permission.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">11. Modification of Terms</h2>
            <p className="text-neutral-700 leading-relaxed">
              Travunited reserves the right to modify these Terms & Conditions at any time. Updated terms will be posted on this page and shall be effective immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">12. Governing Law & Jurisdiction</h2>
            <p className="text-neutral-700 leading-relaxed">
              These Terms shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Karnataka, India.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Contact Us</h2>
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


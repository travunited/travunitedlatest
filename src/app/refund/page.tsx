import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";

export default function RefundPage() {
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

        <h1 className="text-4xl font-bold text-neutral-900 mb-6">Refund Policy</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-neutral-600 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Overview</h2>
            <p className="text-neutral-700 leading-relaxed">
              At Travunited, we understand that circumstances may change. This Refund Policy outlines 
              the terms and conditions for refunds of our services. Please read this policy carefully 
              before making a purchase.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Service Fees</h2>
            <div className="bg-neutral-50 rounded-lg p-6 mb-4">
              <div className="flex items-start mb-4">
                <XCircle className="text-red-600 mr-3 mt-1 flex-shrink-0" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Non-Refundable Service Fees</h3>
                  <p className="text-neutral-700">
                    Our service fees are generally non-refundable once processing has begun. This includes:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-neutral-700">
                    <li>Visa application processing fees</li>
                    <li>Document review and consultation fees</li>
                    <li>Administrative charges</li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="text-neutral-700 leading-relaxed">
              Service fees cover the cost of our expert consultation, document preparation, application 
              submission, and ongoing support throughout the process.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Government Fees</h2>
            <div className="bg-green-50 rounded-lg p-6 mb-4">
              <div className="flex items-start">
                <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Refundable Government Fees</h3>
                  <p className="text-neutral-700">
                    Government fees and visa application charges paid to embassies or consulates may be 
                    refundable according to their respective policies. Refund eligibility depends on:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-neutral-700">
                    <li>The embassy&apos;s refund policy</li>
                    <li>Application status at the time of cancellation</li>
                    <li>Reason for cancellation</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Refund Scenarios</h2>
            
            <div className="space-y-4">
              <div className="border border-neutral-200 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <Clock className="text-primary-600 mr-3" size={20} />
                  <h3 className="text-lg font-semibold text-neutral-900">Before Processing Begins</h3>
                </div>
                <p className="text-neutral-700">
                  If you cancel your application before we begin processing, you may be eligible for a 
                  partial refund of service fees, minus any administrative costs incurred.
                </p>
              </div>

              <div className="border border-neutral-200 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <XCircle className="text-red-600 mr-3" size={20} />
                  <h3 className="text-lg font-semibold text-neutral-900">After Processing Begins</h3>
                </div>
                <p className="text-neutral-700">
                  Once processing has begun, service fees are non-refundable as we have already invested 
                  time and resources into your application.
                </p>
              </div>

              <div className="border border-neutral-200 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <CheckCircle className="text-green-600 mr-3" size={20} />
                  <h3 className="text-lg font-semibold text-neutral-900">Visa Rejection</h3>
                </div>
                <p className="text-neutral-700">
                  If your visa is rejected by the embassy, service fees remain non-refundable. However, 
                  government fees may be refundable according to the embassy&apos;s policy.
                </p>
              </div>

              <div className="border border-neutral-200 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <CheckCircle className="text-green-600 mr-3" size={20} />
                  <h3 className="text-lg font-semibold text-neutral-900">Service Errors</h3>
                </div>
                <p className="text-neutral-700">
                  If we make an error in processing your application, we will work to rectify it at no 
                  additional cost. In cases of significant errors, a full or partial refund may be provided 
                  at our discretion.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Tour Packages</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Refund policies for tour packages vary depending on the package and cancellation timing:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li><strong>30+ days before departure:</strong> Full refund minus administrative fees</li>
              <li><strong>15-30 days before departure:</strong> 50% refund</li>
              <li><strong>Less than 15 days:</strong> No refund (unless covered by travel insurance)</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              Specific terms will be outlined in your booking confirmation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">How to Request a Refund</h2>
            <ol className="list-decimal pl-6 space-y-3 text-neutral-700">
              <li>Contact our customer support team at{" "}
                <a href="mailto:support@travunited.com" className="text-primary-600 hover:text-primary-700 underline">
                  support@travunited.com
                </a>
              </li>
              <li>Provide your application/booking reference number</li>
              <li>Explain the reason for your refund request</li>
              <li>Our team will review your request and respond within 5-7 business days</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Processing Time</h2>
            <p className="text-neutral-700 leading-relaxed">
              Approved refunds will be processed within 10-15 business days and credited to the original 
              payment method used for the transaction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Contact Us</h2>
            <p className="text-neutral-700 leading-relaxed">
              If you have any questions about our Refund Policy, please contact us at{" "}
              <a href="mailto:support@travunited.com" className="text-primary-600 hover:text-primary-700 underline">
                support@travunited.com
              </a>
              {" "}or call us at{" "}
              <a href="tel:+916360392398" className="text-primary-600 hover:text-primary-700 underline">
                +91 63603 92398
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}


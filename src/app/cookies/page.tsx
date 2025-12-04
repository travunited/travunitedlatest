import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CookiesPage() {
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

        <h1 className="text-4xl font-bold text-neutral-900 mb-6">Cookie Policy</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-neutral-600 mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">What Are Cookies</h2>
            <p className="text-neutral-700 leading-relaxed">
              Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
              They are widely used to make websites work more efficiently and provide information to the website owners.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">How We Use Cookies</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Travunited uses cookies to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Remember your preferences and settings</li>
              <li>Improve website functionality and user experience</li>
              <li>Analyze website traffic and usage patterns</li>
              <li>Provide personalized content and recommendations</li>
              <li>Enable secure authentication and session management</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Types of Cookies We Use</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">Essential Cookies</h3>
                <p className="text-neutral-700 leading-relaxed">
                  These cookies are necessary for the website to function properly. They enable core functionality 
                  such as security, network management, and accessibility.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">Analytics Cookies</h3>
                <p className="text-neutral-700 leading-relaxed">
                  These cookies help us understand how visitors interact with our website by collecting and reporting 
                  information anonymously.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">Functional Cookies</h3>
                <p className="text-neutral-700 leading-relaxed">
                  These cookies allow the website to remember choices you make and provide enhanced, personalized features.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Managing Cookies</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              You can control and manage cookies in various ways. Please keep in mind that removing or blocking cookies 
              can impact your user experience and parts of our website may no longer be fully accessible.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              Most browsers automatically accept cookies, but you can modify your browser settings to decline cookies 
              if you prefer. You can also delete cookies that have already been set.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Contact Us</h2>
            <p className="text-neutral-700 leading-relaxed">
              If you have any questions about our Cookie Policy, please contact us at{" "}
              <a href="mailto:info@travunited.in" className="text-primary-600 hover:text-primary-700 underline">
                info@travunited.in
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}


import Link from "next/link";
import { ArrowLeft, Mail, Phone, MessageCircle, Clock, HelpCircle } from "lucide-react";

export default function SupportPage() {
  const supportOptions = [
    {
      icon: Phone,
      title: "Phone Support",
      description: "Speak directly with our support team",
      contact: "+91 63603 92398",
      href: "tel:+916360392398",
      available: "Mon-Fri: 10:00 AM - 6:30 PM IST",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      description: "Quick assistance via WhatsApp",
      contact: "+91 63603 92398",
      href: "https://wa.me/916360392398",
      available: "Mon-Fri: 10:00 AM - 6:30 PM IST",
    },
    {
      icon: Mail,
      title: "Email Support",
      description: "Send us a detailed message",
      contact: "support@travunited.com",
      href: "mailto:support@travunited.com",
      available: "Response within 24 hours",
    },
  ];

  const quickLinks = [
    { href: "/faq", label: "FAQ", description: "Common questions answered" },
    { href: "/help", label: "Help Center", description: "Comprehensive guides" },
    { href: "/refund", label: "Refund Policy", description: "Cancellation & refunds" },
    { href: "/contact", label: "Contact Us", description: "General inquiries" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-white/80 hover:text-white mb-8 text-sm"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Support Center</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            We&apos;re here to help you with any questions or concerns
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Support Options */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-8">Get in Touch</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {supportOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <div
                  key={index}
                  className="border border-neutral-200 rounded-lg p-6 hover:shadow-medium transition-shadow"
                >
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-primary-100 rounded-lg mr-4">
                      <Icon className="text-primary-600" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-neutral-900">{option.title}</h3>
                  </div>
                  <p className="text-neutral-600 mb-4">{option.description}</p>
                  <a
                    href={option.href}
                    className="text-primary-600 hover:text-primary-700 font-medium block mb-2"
                  >
                    {option.contact}
                  </a>
                  <div className="flex items-center text-sm text-neutral-500">
                    <Clock size={14} className="mr-2" />
                    {option.available}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Links */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-8">Quick Links</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="border border-neutral-200 rounded-lg p-6 hover:border-primary-300 hover:shadow-soft transition-all"
              >
                <div className="flex items-center mb-3">
                  <HelpCircle className="text-primary-600 mr-3" size={20} />
                  <h3 className="font-semibold text-neutral-900">{link.label}</h3>
                </div>
                <p className="text-sm text-neutral-600">{link.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Common Issues */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-8">Common Issues</h2>
          <div className="space-y-4">
            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="font-semibold text-neutral-900 mb-2">Application Status</h3>
              <p className="text-neutral-700 mb-4">
                Check your application status by logging into your dashboard or contacting our support team.
              </p>
              <Link
                href="/dashboard"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Go to Dashboard →
              </Link>
            </div>

            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="font-semibold text-neutral-900 mb-2">Document Issues</h3>
              <p className="text-neutral-700 mb-4">
                If you&apos;re having trouble uploading documents or need to resubmit, our team can help guide you through the process.
              </p>
              <Link
                href="/contact"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Contact Support →
              </Link>
            </div>

            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="font-semibold text-neutral-900 mb-2">Payment Problems</h3>
              <p className="text-neutral-700 mb-4">
                Experiencing payment issues? Contact our billing support team for immediate assistance.
              </p>
              <a
                href="mailto:billing@travunited.com"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Email Billing Support →
              </a>
            </div>
          </div>
        </section>

        {/* Business Hours */}
        <section className="bg-primary-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">Business Hours</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">India Office</h3>
              <p className="text-neutral-700">
                Monday - Friday: 10:00 AM - 6:30 PM IST<br />
                Saturday: 10:00 AM - 4:00 PM IST<br />
                Sunday: Closed
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">UAE Office</h3>
              <p className="text-neutral-700">
                Monday - Friday: 9:00 AM - 6:00 PM GST<br />
                Saturday: 10:00 AM - 2:00 PM GST<br />
                Sunday: Closed
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


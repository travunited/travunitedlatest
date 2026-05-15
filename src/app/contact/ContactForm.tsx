"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Building2, Globe } from "lucide-react";

const OFFICES = [
  {
    title: "Main Office - Karnataka",
    subtitle: "Travunited of India Pvt Ltd",
    lines: [
      "#F307 1st Floor, Regal Nxt",
      "Udupi, Karnataka – 576103",
      "India",
    ],
  },
  {
    title: "UAE Branch Office",
    subtitle: "Travunited Middle East",
    lines: [
      "#312, MRMS Building",
      "Bur Dubai, Dubai",
      "United Arab Emirates",
    ],
  },
];

const OTHER_CHANNELS = [
  { label: "B2B Partnerships", email: "b2b@travunited.com" },
  { label: "Visa Support", email: "visa@travunited.com" },
  { label: "Corporate Travel", email: "corporate@travunited.com" },
  { label: "Media / PR", email: "media@travunited.com" },
];

const FUTURE_OFFICES = ["Riyadh, Saudi Arabia", "Delaware, United States", "Berlin, Germany"];

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Information */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-6">Get in Touch</h2>
            <p className="text-neutral-600 mb-8">
              Reach out to the Travunited concierge team for any visa, tour, or corporate
              travel requirement. We’re available on phone, WhatsApp, and dedicated email
              channels.
            </p>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <Phone className="text-primary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-1">Phone & WhatsApp</h3>
                  <a
                    href="tel:+916360392398"
                    className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                  >
                    +91 63603 92398
                  </a>
                  <p className="text-sm text-neutral-600 mt-1">
                    Click to chat on WhatsApp:{" "}
                    <a
                      href="https://wa.me/916360392398"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      +91 63603 92398
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <Mail className="text-primary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-1">General Email</h3>
                  <a
                    href="mailto:info@travunited.com"
                    className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                  >
                    info@travunited.com
                  </a>
                  <p className="text-sm text-neutral-600 mt-1">
                    We respond within one business day.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {OFFICES.map((office) => (
              <div
                key={office.title}
                className="border border-neutral-200 rounded-2xl p-5 space-y-2 bg-neutral-50"
              >
                <div className="flex items-center gap-2 text-primary-600 font-semibold">
                  <Building2 size={18} />
                  {office.title}
                </div>
                <p className="text-sm text-neutral-500">{office.subtitle}</p>
                <div className="text-neutral-700 text-sm leading-6">
                  {office.lines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-neutral-50 rounded-2xl p-5 space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Other Contact Channels</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {OTHER_CHANNELS.map((channel) => (
                <a
                  key={channel.email}
                  href={`mailto:${channel.email}`}
                  className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-primary-200 transition-all"
                >
                  <p className="text-sm font-semibold text-neutral-900">{channel.label}</p>
                  <p className="text-sm text-primary-600">{channel.email}</p>
                </a>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3">
            <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <Globe size={18} className="text-primary-600" />
              Future Expansion Offices
            </h3>
            <p className="text-sm text-neutral-600">
              We’re actively building local concierge desks in
            </p>
            <div className="flex flex-wrap gap-2">
              {FUTURE_OFFICES.map((city) => (
                <span
                  key={city}
                  className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-sm"
                >
                  {city}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Clock className="text-primary-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-1">Business Hours</h3>
              <p className="text-neutral-600">
                Monday - Friday: 10:00 AM - 6:30 PM IST<br />
                Saturday: 10:00 AM - 4:00 PM IST<br />
                Sunday & UAE public holidays: Closed
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-neutral-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">Send us a Message</h2>
          <form
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setSuccessMessage(null);
              setErrorMessage(null);
              setIsSubmitting(true);
              const formData = new FormData(e.currentTarget);
              const name = formData.get("name") as string;
              const email = formData.get("email") as string;
              const phone = formData.get("phone") as string;
              const subject = formData.get("subject") as string;
              const message = formData.get("message") as string;

              try {
                const response = await fetch("/api/contact/submit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name,
                    email,
                    phone,
                    subject,
                    message,
                  }),
                });

                const result = await response.json().catch(() => ({}));

                if (!response.ok) {
                  throw new Error(result?.error || `Server error: ${response.status} ${response.statusText}`);
                }

                if (result?.success === false) {
                  throw new Error(result?.error || "Failed to send message. Please try again.");
                }

                setSuccessMessage("Thank you! We've received your message and will get back to you soon.");
                e.currentTarget.reset();
              } catch (error: any) {
                console.error("Error submitting contact form:", error);
                const friendly =
                  error?.message === "Failed to fetch"
                    ? "Network error. Please check your connection and try again."
                    : "Something went wrong while sending your message. Please try again or contact us directly.";
                setErrorMessage(friendly);
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {(successMessage || errorMessage) && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${successMessage
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
                  }`}
              >
                {successMessage || errorMessage}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2" htmlFor="contact-name">
                Your Name <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="contact-name"
                name="name"
                required
                autoComplete="name"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2" htmlFor="contact-email">
                Email Address <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                type="email"
                id="contact-email"
                name="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="your.email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2" htmlFor="contact-phone">
                Phone Number
              </label>
              <input
                type="tel"
                id="contact-phone"
                name="phone"
                autoComplete="tel"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="+91 6360392398"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2" htmlFor="contact-subject">
                Subject <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="contact-subject"
                name="subject"
                required
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="How can we help?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2" htmlFor="contact-message">
                Message <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <textarea
                id="contact-message"
                rows={5}
                name="message"
                required
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="Tell us more about your inquiry..."
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

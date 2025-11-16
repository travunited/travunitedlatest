"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Mail, Phone, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";

export default function CorporatePage() {
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/corporate/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({
          companyName: "",
          contactPerson: "",
          email: "",
          phone: "",
          message: "",
        });
      } else {
        setError("Failed to submit. Please try again or contact us directly.");
      }
    } catch (err) {
      setError("An error occurred. Please contact us directly at corporate@travunited.com");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center mb-4">
              <Building2 size={48} className="text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
              Corporate Travel Solutions
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto text-center">
              Streamlined visa services and travel management for your organization
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="text-center p-6 bg-neutral-50 rounded-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
              <Building2 className="text-primary-600" size={24} />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Bulk Processing</h3>
            <p className="text-sm text-neutral-600">
              Efficient handling of multiple employee visa applications
            </p>
          </div>
          <div className="text-center p-6 bg-neutral-50 rounded-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
              <Phone className="text-primary-600" size={24} />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Dedicated Support</h3>
            <p className="text-sm text-neutral-600">
              Assigned account manager for personalized assistance
            </p>
          </div>
          <div className="text-center p-6 bg-neutral-50 rounded-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
              <CheckCircle className="text-primary-600" size={24} />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Custom Solutions</h3>
            <p className="text-sm text-neutral-600">
              Tailored packages to meet your company&rsquo;s travel needs
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-large p-8 border border-neutral-200"
        >
          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Thank You!</h2>
              <p className="text-neutral-600 mb-6">
                We&rsquo;ve received your inquiry. Our corporate team will contact you within 24 hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Submit Another Inquiry
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">
                Get in Touch
              </h2>
              <p className="text-neutral-600 mb-6">
                Fill out the form below and our corporate travel team will get back to you with a customized solution.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2 text-red-700 mb-6">
                  <AlertCircle size={20} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({ ...formData, companyName: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contactPerson}
                      onChange={(e) =>
                        setFormData({ ...formData, contactPerson: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Your Name"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="your.email@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="+91 1234567890"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Tell us about your corporate travel needs, number of employees, preferred destinations, etc."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare size={20} />
                      <span>Submit Inquiry</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-neutral-200">
                <p className="text-sm text-neutral-600 text-center">
                  Or contact us directly:{" "}
                  <a
                    href="mailto:corporate@travunited.com"
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    corporate@travunited.com
                  </a>{" "}
                  |{" "}
                  <a
                    href="tel:+916360392398"
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    +91 63603 92398
                  </a>
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

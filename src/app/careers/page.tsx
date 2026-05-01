"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, MapPin, Clock, X, Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Position {
  title: string;
  location: string;
  type: string;
  department: string;
}

export default function CareersPage() {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    positionTitle: "",
    experience: "",
    currentCompany: "",
    expectedCtc: "",
    coverNote: "",
    resume: null as File | null,
  });

  // Fetch positions from API
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        setLoadingPositions(true);
        const response = await fetch("/api/careers/positions");
        if (response.ok) {
          const data = await response.json();
          setOpenPositions(data);
        }
      } catch (error) {
        console.error("Error fetching positions:", error);
      } finally {
        setLoadingPositions(false);
      }
    };

    fetchPositions();
  }, []);

  const handleApplyClick = (position: Position) => {
    setSelectedPosition(position);
    setFormData((prev) => ({ ...prev, positionTitle: position.title }));
    setShowForm(true);
    setSubmitSuccess(false);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    if (!formData.positionTitle) {
      newErrors.positionTitle = "Position is required";
    }

    if (!formData.resume) {
      newErrors.resume = "Resume is required";
    } else {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      const fileExtension = formData.resume.name.split(".").pop()?.toLowerCase() || "";
      const allowedExtensions = ["pdf", "doc", "docx"];

      // Check both MIME type and file extension (some browsers don't set MIME type correctly)
      if (!allowedTypes.includes(formData.resume.type) && !allowedExtensions.includes(fileExtension)) {
        newErrors.resume = "Resume must be PDF, DOC, or DOCX";
      }
      if (formData.resume.size > 5 * 1024 * 1024) {
        newErrors.resume = "Resume file size must be less than 5MB";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const submitFormData = new FormData();
      submitFormData.append("name", formData.name);
      submitFormData.append("email", formData.email);
      submitFormData.append("phone", formData.phone);
      submitFormData.append("location", formData.location);
      submitFormData.append("positionTitle", formData.positionTitle);
      submitFormData.append("experience", formData.experience);
      submitFormData.append("currentCompany", formData.currentCompany);
      submitFormData.append("expectedCtc", formData.expectedCtc);
      submitFormData.append("coverNote", formData.coverNote);
      if (formData.resume) {
        submitFormData.append("resume", formData.resume);
      }

      const response = await fetch("/api/careers/apply", {
        method: "POST",
        body: submitFormData,
      });

      if (response.ok) {
        setSubmitSuccess(true);
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          location: "",
          positionTitle: "",
          experience: "",
          currentCompany: "",
          expectedCtc: "",
          coverNote: "",
          resume: null,
        });
        // Close form after 3 seconds
        setTimeout(() => {
          setShowForm(false);
          setSubmitSuccess(false);
        }, 3000);
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || "Failed to submit application. Please try again." });
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      setErrors({ submit: "Unable to upload resume right now. Please try again in a few minutes." });
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Careers at Travunited</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Join us in making global travel accessible and seamless for everyone
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Why Work With Us */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">Why Work With Us?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Growth Opportunities</h3>
              <p className="text-neutral-700">
                We&apos;re a growing company with opportunities for career advancement and skill development.
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Flexible Work</h3>
              <p className="text-neutral-700">
                We offer flexible working arrangements including remote work options for eligible positions.
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Impactful Work</h3>
              <p className="text-neutral-700">
                Help thousands of travellers realize their dreams of exploring the world.
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Great Culture</h3>
              <p className="text-neutral-700">
                Work with a supportive team that values collaboration, innovation, and work-life balance.
              </p>
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">Open Positions</h2>
          {openPositions.length > 0 ? (
            <div className="space-y-4">
              {openPositions.map((position, index) => (
                <div
                  key={index}
                  className="border border-neutral-200 rounded-lg p-6 hover:shadow-medium transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                        {position.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
                        <div className="flex items-center">
                          <MapPin size={16} className="mr-2" />
                          {position.location}
                        </div>
                        <div className="flex items-center">
                          <Clock size={16} className="mr-2" />
                          {position.type}
                        </div>
                        <div className="flex items-center">
                          <Briefcase size={16} className="mr-2" />
                          {position.department}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyClick(position)}
                      className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors whitespace-nowrap"
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-50 rounded-lg p-8 text-center">
              <p className="text-neutral-600 mb-4">We don&apos;t have any open positions at the moment.</p>
              <p className="text-neutral-600">
                Check back soon or send us your resume at{" "}
                <a href="mailto:careers@travunited.com" className="text-primary-600 hover:text-primary-700">
                  careers@travunited.com
                </a>
              </p>
            </div>
          )}
        </section>

        {/* How to Apply */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">How to Apply</h2>
          <div className="prose prose-lg max-w-none text-neutral-700">
            <p className="leading-relaxed mb-4">
              Interested in joining our team? Here&apos;s how to apply:
            </p>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Browse our open positions above and find a role that matches your skills and interests.</li>
              <li>Click &quot;Apply Now&quot; on the position you&apos;re interested in, or send your resume directly to{" "}
                <a href="mailto:careers@travunited.com" className="text-primary-600 hover:text-primary-700">
                  careers@travunited.com
                </a>
              </li>
              <li>Include your resume, cover letter, and any relevant portfolio or work samples.</li>
              <li>Our team will review your application and get back to you within 1-2 weeks.</li>
            </ol>
          </div>
        </section>

        {/* General Application */}
        <section className="bg-primary-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Don&apos;t See a Match?</h2>
          <p className="text-neutral-700 mb-6">
            We&apos;re always looking for talented individuals to join our team. Send us your resume and
            we&apos;ll keep you in mind for future opportunities.
          </p>
          <button
            onClick={() => handleApplyClick({ title: "General Application", location: "", type: "", department: "" })}
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Send Your Resume
          </button>
        </section>
      </div>

      {/* Application Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onPointerDown={() => !submitting && setShowForm(false)}
                onClick={() => !submitting && setShowForm(false)}
                className="fixed inset-0 bg-black/50 cursor-pointer"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-neutral-900">
                    Apply for {selectedPosition?.title || "Position"}
                  </h2>
                  <button
                    onClick={() => !submitting && setShowForm(false)}
                    disabled={submitting}
                    className="text-neutral-400 hover:text-neutral-600 disabled:opacity-50"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {submitSuccess ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <CheckCircle size={32} className="text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-neutral-900 mb-2">Application Submitted!</h3>
                      <p className="text-neutral-600">
                        Thank you! Your application has been submitted. Our team will get back to you if shortlisted.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Basic Details */}
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Basic Details</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.name ? "border-red-300" : "border-neutral-300"
                                }`}
                              required
                            />
                            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Email <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.email ? "border-red-300" : "border-neutral-300"
                                }`}
                              required
                            />
                            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.phone ? "border-red-300" : "border-neutral-300"
                                }`}
                              required
                            />
                            {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Location / City
                            </label>
                            <input
                              type="text"
                              value={formData.location}
                              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Job Details */}
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Job Details</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Position Applying For <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.positionTitle}
                              onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.positionTitle ? "border-red-300" : "border-neutral-300"
                                }`}
                              required
                            >
                              <option value="">Select Position</option>
                              {openPositions.map((pos, idx) => (
                                <option key={idx} value={pos.title}>
                                  {pos.title}
                                </option>
                              ))}
                              <option value="General Application">General Application</option>
                            </select>
                            {errors.positionTitle && (
                              <p className="text-red-600 text-sm mt-1">{errors.positionTitle}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Experience (Years)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.experience}
                              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="e.g., 3"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Current Company
                            </label>
                            <input
                              type="text"
                              value={formData.currentCompany}
                              onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Expected CTC
                            </label>
                            <input
                              type="text"
                              value={formData.expectedCtc}
                              onChange={(e) => setFormData({ ...formData, expectedCtc: e.target.value })}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="e.g., ₹5,00,000"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Resume Upload */}
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Resume Upload</h3>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Upload Resume (PDF/DOC/DOCX, max 5 MB) <span className="text-red-500">*</span>
                          </label>
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors border-neutral-300">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-10 h-10 mb-3 text-neutral-400" />
                              <p className="mb-2 text-sm text-neutral-500">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-neutral-500">PDF, DOC, DOCX (MAX. 5MB)</p>
                            </div>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setFormData({ ...formData, resume: file });
                                  setErrors({ ...errors, resume: "" });
                                }
                              }}
                              className="hidden"
                              required
                            />
                          </label>
                          {formData.resume && (
                            <div className="mt-2 flex items-center space-x-2 text-sm text-neutral-600">
                              <FileText size={16} />
                              <span>{formData.resume.name}</span>
                              <span className="text-neutral-400">
                                ({(formData.resume.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                          )}
                          {errors.resume && <p className="text-red-600 text-sm mt-1">{errors.resume}</p>}
                        </div>
                      </div>

                      {/* Cover Note */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Cover Note / Why should we hire you?
                        </label>
                        <textarea
                          value={formData.coverNote}
                          onChange={(e) => setFormData({ ...formData, coverNote: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Tell us why you're a great fit for this position..."
                        />
                      </div>

                      {/* Error Message */}
                      {errors.submit && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
                          <AlertCircle className="text-red-600 mt-0.5" size={20} />
                          <p className="text-red-800 text-sm">{errors.submit}</p>
                        </div>
                      )}

                      {/* Submit Button */}
                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? "Submitting..." : "Submit Application"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          disabled={submitting}
                          className="px-6 py-3 border border-neutral-300 rounded-lg font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

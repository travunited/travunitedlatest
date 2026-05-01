"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TermsProps = {
  termsPolicyHtml?: string; // Terms & Conditions HTML content
  termsPolicyUrl?: string; // OR a URL to the Terms & Conditions page
  refundPolicyHtml?: string; // Refund & Cancellation Policy HTML content
  refundPolicyUrl?: string; // OR a URL to the Refund & Cancellation Policy page
  termsPolicyVersion?: string; // e.g. "v2025-11-27"
  refundPolicyVersion?: string; // e.g. "v2025-11-27"
  required?: boolean; // default true
  value?: boolean; // controlled component value
  onChange?: (accepted: boolean) => void; // notify parent form
  error?: string | null; // validation error message
  className?: string; // additional CSS classes
};

export default function TermsAndPolicy({
  termsPolicyHtml,
  termsPolicyUrl,
  refundPolicyHtml,
  refundPolicyUrl,
  termsPolicyVersion,
  refundPolicyVersion,
  required = true,
  value = false,
  onChange,
  error,
  className = "",
}: TermsProps) {
  const [accepted, setAccepted] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [activePolicy, setActivePolicy] = useState<"terms" | "refund" | "both">("both");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setAccepted(value);
  }, [value]);

  useEffect(() => {
    onChange?.(accepted);
  }, [accepted, onChange]);

  const handleAcceptChange = (checked: boolean) => {
    setAccepted(checked);
    setTouched(true);
  };

  const labelId = "terms-label";
  const hasError = touched && required && !accepted && error;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-start gap-3">
        <input
          id="accept-terms"
          aria-describedby={labelId}
          type="checkbox"
          checked={accepted}
          onChange={(e) => handleAcceptChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 focus:ring-2"
        />
        <div className="flex-1">
          <label id={labelId} htmlFor="accept-terms" className="text-sm text-neutral-700 cursor-pointer">
            I have read and agree to the{" "}
            <button
              type="button"
              onClick={() => {
                setActivePolicy("terms");
                setShowModal(true);
              }}
              className="text-primary-600 underline hover:text-primary-800 font-medium"
            >
              Terms & Conditions
            </button>{" "}
            and the{" "}
            <button
              type="button"
              onClick={() => {
                setActivePolicy("refund");
                setShowModal(true);
              }}
              className="text-primary-600 underline hover:text-primary-800 font-medium"
            >
              Refund & Cancellation Policy
            </button>.
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>

          {hasError && (
            <div className="mt-1 text-sm text-red-600" role="alert">
              {error || "Please review and accept our Terms & Conditions and Refund & Cancellation Policy to proceed with booking."}
            </div>
          )}
          
          {(termsPolicyVersion || refundPolicyVersion) && (
            <div className="text-xs text-neutral-500 mt-1">
              {termsPolicyVersion && refundPolicyVersion && termsPolicyVersion === refundPolicyVersion ? (
                <>Policy version: {termsPolicyVersion}</>
              ) : (
                <>
                  {termsPolicyVersion && <>Terms: {termsPolicyVersion}</>}
                  {termsPolicyVersion && refundPolicyVersion && " • "}
                  {refundPolicyVersion && <>Refund: {refundPolicyVersion}</>}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Policy Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onPointerDown={() => setShowModal(false)}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/50 z-50 cursor-pointer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="policy-modal-title"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
                  <div className="flex items-center space-x-4">
                    <h3 id="policy-modal-title" className="text-xl font-bold text-neutral-900">
                      {activePolicy === "terms"
                        ? "Terms & Conditions"
                        : activePolicy === "refund"
                        ? "Refund & Cancellation Policy"
                        : "Terms & Policies"}
                    </h3>
                    {(activePolicy === "terms" && termsPolicyVersion) ||
                    (activePolicy === "refund" && refundPolicyVersion) ||
                    (activePolicy === "both" && (termsPolicyVersion || refundPolicyVersion)) ? (
                      <span className="text-sm text-neutral-500">
                        (
                        {activePolicy === "terms"
                          ? termsPolicyVersion
                          : activePolicy === "refund"
                          ? refundPolicyVersion
                          : termsPolicyVersion || refundPolicyVersion}
                        )
                      </span>
                    ) : null}
                  </div>
                  <button
                    aria-label="Close policy"
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-neutral-600" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  {activePolicy === "both" ? (
                    <div className="space-y-8">
                      {termsPolicyHtml || termsPolicyUrl ? (
                        <div>
                          <h4 className="text-lg font-semibold text-neutral-900 mb-4">Terms & Conditions</h4>
                          {termsPolicyHtml ? (
                            <div
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: termsPolicyHtml }}
                            />
                          ) : termsPolicyUrl ? (
                            <iframe
                              src={termsPolicyUrl}
                              title="Terms and Conditions"
                              className="h-[400px] w-full border rounded"
                            />
                          ) : null}
                        </div>
                      ) : null}
                      {refundPolicyHtml || refundPolicyUrl ? (
                        <div>
                          <h4 className="text-lg font-semibold text-neutral-900 mb-4">Refund & Cancellation Policy</h4>
                          {refundPolicyHtml ? (
                            <div
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: refundPolicyHtml }}
                            />
                          ) : refundPolicyUrl ? (
                            <iframe
                              src={refundPolicyUrl}
                              title="Refund and Cancellation Policy"
                              className="h-[400px] w-full border rounded"
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : activePolicy === "terms" ? (
                    <div className="prose prose-sm max-w-none">
                      {termsPolicyHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: termsPolicyHtml }} />
                      ) : termsPolicyUrl ? (
                        <div className="space-y-4">
                          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 text-center">
                            <p className="text-neutral-700 mb-4">
                              Please review our Terms & Conditions to proceed with your booking.
                            </p>
                            <a
                              href={termsPolicyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                            >
                              Open Terms & Conditions in New Tab
                              <svg
                                className="ml-2 w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          </div>
                          <div className="text-sm text-neutral-500 text-center">
                            Or view it here: <a href={termsPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">{termsPolicyUrl}</a>
                          </div>
                        </div>
                      ) : (
                        <div className="text-neutral-600">Terms & Conditions content not available.</div>
                      )}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      {refundPolicyHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: refundPolicyHtml }} />
                      ) : refundPolicyUrl ? (
                        <div className="space-y-4">
                          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 text-center">
                            <p className="text-neutral-700 mb-4">
                              Please review our Refund & Cancellation Policy to proceed with your booking.
                            </p>
                            <a
                              href={refundPolicyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                            >
                              Open Refund & Cancellation Policy in New Tab
                              <svg
                                className="ml-2 w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="text-neutral-600">Refund & Cancellation Policy content not available.</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      id="accept-terms-modal"
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => handleAcceptChange(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 focus:ring-2"
                    />
                    <label htmlFor="accept-terms-modal" className="text-sm text-neutral-700 cursor-pointer">
                      I have read and accept these policies
                      {termsPolicyVersion || refundPolicyVersion ? (
                        <span className="text-neutral-500">
                          {" "}
                          (version: {termsPolicyVersion || refundPolicyVersion})
                        </span>
                      ) : null}
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTouched(true);
                        setShowModal(false);
                      }}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


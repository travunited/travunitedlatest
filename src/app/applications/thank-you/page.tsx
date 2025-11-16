"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle, FileText, ArrowRight } from "lucide-react";

export default function ThankYouPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const applicationId = searchParams.get("applicationId");
  const [application, setApplication] = useState<any>(null);

  useEffect(() => {
    if (applicationId) {
      // Fetch application details
      fetch(`/api/applications/${applicationId}`)
        .then((res) => res.json())
        .then((data) => setApplication(data))
        .catch(console.error);
    }
  }, [applicationId]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-white rounded-2xl shadow-large p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">
            Application Submitted Successfully!
          </h1>
          
          <p className="text-lg text-neutral-600 mb-8">
            Thank you for your visa application. We&rsquo;ve received your submission and will process it shortly.
          </p>

          {application && (
            <div className="bg-neutral-50 rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-neutral-900 mb-4">Application Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Application ID:</span>
                  <span className="font-mono font-medium">{application.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Status:</span>
                  <span className="font-medium text-primary-600">{application.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Amount Paid:</span>
                  <span className="font-medium">₹{application.totalAmount?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">What&rsquo;s Next?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• You&rsquo;ll receive a confirmation email shortly</li>
                <li>• Our team will review your application and documents</li>
                <li>• We&rsquo;ll keep you updated on the status via email</li>
                <li>• You can track your application in your dashboard</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
              >
                <FileText size={20} />
                <span>Go to Dashboard</span>
              </Link>
              <Link
                href="/visas"
                className="flex-1 border border-neutral-300 text-neutral-700 px-6 py-3 rounded-lg font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Browse More Visas</span>
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


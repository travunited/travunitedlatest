"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, XCircle } from "lucide-react";

export default function EditApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchApplication = useCallback(async () => {
    try {
      const response = await fetch(`/api/applications/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setApplication(data);
        
        // Check if application can be edited (only DRAFT or PAYMENT_PENDING)
        const editableStatuses = ["DRAFT", "PAYMENT_PENDING"];
        if (!editableStatuses.includes(data.status)) {
          // Set error message based on status
          if (data.status === "IN_PROCESS" || data.status === "SUBMITTED") {
            setError("Your application is under process and cannot be edited at the moment.");
          } else if (data.status === "APPROVED" || data.status === "REJECTED") {
            setError("This application can no longer be edited. Please contact support if you need to make changes.");
          } else {
            setError("This application cannot be edited at this time. Please contact support if you need to make changes.");
          }
          setLoading(false);
          return;
        }
        
        // Redirect to application form with edit mode
        // Check if visa data is available
        if (data.visa?.country?.code && data.visa?.slug) {
          const countryCode = data.visa.country.code.toLowerCase();
          const visaSlug = data.visa.slug;
          router.push(`/apply/visa/${countryCode}/${visaSlug}?edit=${params.id}&applicationId=${params.id}`);
        } else if (data.visaId && data.visa) {
          // If visa relation exists but country/slug missing, try to fetch visa details
          try {
            const visaResponse = await fetch(`/api/visas/${data.visaId}`);
            if (visaResponse.ok) {
              const visaData = await visaResponse.json();
              if (visaData.country?.code && visaData.slug) {
                const countryCode = visaData.country.code.toLowerCase();
                router.push(`/apply/visa/${countryCode}/${visaData.slug}?edit=${params.id}&applicationId=${params.id}`);
                return;
              }
            }
          } catch (err) {
            console.error("Error fetching visa details:", err);
          }
        }
        
        // Fallback to old format if visa relation is not loaded
        if (data.country && data.visaType) {
          // Normalize country code (handle both codes and names)
          const countryCode = data.country.toLowerCase().replace(/\s+/g, "-");
          const visaType = data.visaType.toLowerCase().replace(/\s+/g, "-");
          router.push(`/apply/visa/${countryCode}/${visaType}?edit=${params.id}&applicationId=${params.id}`);
        } else {
          setError("Unable to load application data. Please contact support if this issue persists.");
          setLoading(false);
        }
      } else {
        setError("Application not found.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching application:", error);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (session) {
      fetchApplication();
    }
  }, [session, fetchApplication]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-large p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <XCircle size={32} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              Cannot Edit Application
            </h1>
            <p className="text-neutral-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Link
                href="/dashboard/applications"
                className="block w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors text-center"
              >
                Back to Applications
              </Link>
              <Link
                href={`/dashboard/applications/${params.id}`}
                className="block w-full text-center text-neutral-600 hover:text-neutral-900 font-medium text-sm"
              >
                View Application Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}


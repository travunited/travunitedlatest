"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EditApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);

  const fetchApplication = useCallback(async () => {
    try {
      const response = await fetch(`/api/applications/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setApplication(data);
        
        // Check if application can be edited (only DRAFT or PAYMENT_PENDING)
        const editableStatuses = ["DRAFT", "PAYMENT_PENDING"];
        if (!editableStatuses.includes(data.status)) {
          alert("This application can no longer be edited. Please contact support if you need to make changes.");
          router.push("/dashboard/applications");
          return;
        }
        
        // Redirect to application form with edit mode
        if (data.country && data.visaType) {
          router.push(`/apply/visa/${data.country}/${data.visaType}?edit=${params.id}&applicationId=${params.id}`);
        } else {
          alert("Unable to load application data. Please try again.");
          router.push("/dashboard/applications");
        }
      } else {
        alert("Application not found.");
        router.push("/dashboard/applications");
      }
    } catch (error) {
      console.error("Error fetching application:", error);
      alert("An error occurred. Please try again.");
      router.push("/dashboard/applications");
    } finally {
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

  return null;
}


"use server";

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Clock,
  CheckCircle,
  FileText,
  HelpCircle,
  ArrowRight,
  Info,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMediaProxyUrl } from "@/lib/media";
import { shouldUseUnoptimizedImage } from "@/lib/image-helpers";

export default async function VisaDetailPage({
  params,
}: {
  params: { country: string; type: string };
}) {
  const visa = await prisma.visa.findFirst({
    where: { slug: params.type },
    include: {
      country: true,
      requirements: {
        orderBy: { sortOrder: "asc" },
      },
      faqs: {
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      },
    },
  });

  if (!visa || visa.country.code.toLowerCase() !== params.country) {
    notFound();
  }

  const perTravellerDocs = visa.requirements.filter(
    (req) => req.scope === "PER_TRAVELLER"
  );
  const perApplicationDocs = visa.requirements.filter(
    (req) => req.scope === "PER_APPLICATION"
  );

  const heroImageUrl = visa.heroImageUrl ? getMediaProxyUrl(visa.heroImageUrl) : null;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href={`/visas/${params.country}`}
            className="inline-flex items-center text-white/80 hover:text-white mb-4 text-sm"
          >
            ← Back to {visa.country.name} Visas
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{visa.name}</h1>
          <p className="text-lg text-white/90">{visa.subtitle}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Featured Image */}
            {heroImageUrl && (
              <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-large bg-neutral-100">
                <Image
                  src={heroImageUrl}
                  alt={visa.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  unoptimized={shouldUseUnoptimizedImage(heroImageUrl)}
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // Prevent infinite loop
                    target.src = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80";
                  }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Processing", value: visa.processingTime },
                { label: "Stay", value: visa.stayDurationDays ? `Up to ${visa.stayDurationDays} days` : visa.stayDuration },
                { label: "Entry", value: visa.entryType },
                { label: "Validity", value: visa.validityDays ? `${visa.validityDays} days from issue` : visa.validity },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-neutral-50 rounded-lg p-4 text-sm text-neutral-600"
                >
                  <div className="text-neutral-500 uppercase text-xs">{item.label}</div>
                  <div className="font-semibold text-neutral-900 mt-1">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-neutral-900">Overview</h2>
              <p className="text-neutral-700 leading-relaxed whitespace-pre-line">
                {visa.overview}
              </p>
            </section>

            <section className="grid lg:grid-cols-2 gap-6">
              <div className="border border-neutral-200 rounded-2xl p-6 space-y-3">
                <h3 className="text-xl font-semibold text-neutral-900">
                  Why Travunited
                </h3>
                <p className="text-neutral-700 whitespace-pre-line">
                  {visa.whyTravunited || "Expert guidance throughout the journey."}
                </p>
              </div>
              <div className="border border-neutral-200 rounded-2xl p-6 space-y-3">
                <h3 className="text-xl font-semibold text-neutral-900">Stats</h3>
                <p className="text-neutral-700 whitespace-pre-line">
                  {visa.statistics || "High approval rate with proactive follow-ups."}
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-neutral-900">Documents Required</h2>
              {perTravellerDocs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-2">
                    Per Traveller
                  </h3>
                  <div className="space-y-2">
                    {perTravellerDocs.map((req) => (
                      <RequirementCard key={req.id} requirement={req} />
                    ))}
                  </div>
                </div>
              )}
              {perApplicationDocs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-2">
                    Per Application
                  </h3>
                  <div className="space-y-2">
                    {perApplicationDocs.map((req) => (
                      <RequirementCard key={req.id} requirement={req} />
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-neutral-900">Eligibility</h2>
              <p className="text-neutral-700 whitespace-pre-line">
                {visa.eligibility}
              </p>
            </section>

            {visa.rejectionReasons && (
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-neutral-900">Rejection Reasons</h2>
                <p className="text-neutral-700 whitespace-pre-line">
                  {visa.rejectionReasons}
                </p>
              </section>
            )}

            {visa.faqs.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-neutral-900">FAQs</h2>
                <div className="space-y-3">
                  {visa.faqs.map((faq) => (
                    <div key={faq.id} className="border border-neutral-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <HelpCircle size={20} className="text-primary-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-neutral-900">
                            {faq.question}
                          </h4>
                          <p className="text-neutral-700 whitespace-pre-line mt-1">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl shadow-large p-6 border border-neutral-200 z-10">
              <div className="mb-6">
                {visa.govtFee !== null && visa.serviceFee !== null ? (
                  <>
                    <div className="text-4xl font-bold text-primary-600 mb-1">
                      {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                      {(visa.govtFee + visa.serviceFee).toLocaleString()}
                    </div>
                    <div className="text-xs text-neutral-500 mb-2">
                      Govt: {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                      {visa.govtFee.toLocaleString()} + Service: {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                      {visa.serviceFee.toLocaleString()}
                    </div>
                    <div className="text-sm text-neutral-500">Per traveller</div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-primary-600 mb-1">
                      {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                      {visa.priceInInr.toLocaleString()}
                    </div>
                    <div className="text-sm text-neutral-500">Per traveller</div>
                  </>
                )}
              </div>
              <Link
                href={`/apply/visa/${params.country}/${visa.slug}`}
                className="w-full bg-primary-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 mb-4"
              >
                <span>Apply for this Visa</span>
                <ArrowRight size={20} />
              </Link>
              <div className="space-y-3 text-sm text-neutral-600 border-t border-neutral-200 pt-4">
                <div className="flex items-center">
                  <Clock size={16} className="mr-2 text-primary-600" />
                  <span>Processing: {visa.processingTime}</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle size={16} className="mr-2 text-primary-600" />
                  <span>Stay: {visa.stayDurationDays ? `Up to ${visa.stayDurationDays} days` : visa.stayDuration}</span>
                </div>
                {visa.validityDays && (
                  <div className="flex items-center">
                    <Info size={16} className="mr-2 text-primary-600" />
                    <span>Validity: {visa.validityDays} days from issue</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function RequirementCard({
  requirement,
}: {
  requirement: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    isRequired: boolean;
  };
}) {
  return (
    <div className="border border-neutral-200 rounded-lg p-4 flex gap-3">
      <FileText size={20} className="text-primary-600 mt-1" />
      <div>
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-neutral-900">{requirement.name}</h4>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              requirement.isRequired
                ? "bg-red-50 text-red-600"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {requirement.isRequired ? "Required" : "Optional"}
          </span>
        </div>
        {requirement.category && (
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {requirement.category}
          </p>
        )}
        {requirement.description && (
          <p className="text-sm text-neutral-600 mt-2 whitespace-pre-line">
            {requirement.description}
          </p>
        )}
      </div>
    </div>
  );
}

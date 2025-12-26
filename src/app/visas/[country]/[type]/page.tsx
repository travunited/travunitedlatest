import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
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
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { ShareButton } from "@/components/sharing/ShareButton";
import { VisaDetailClient } from "./VisaDetailClient";
import { BackToVisasButton } from "./BackToVisasButton";
import { InformationOnlyCTAs } from "./InformationOnlyCTAs";

const visaModeLabels: Record<string, string> = {
  EVISA: "eVisa",
  STICKER: "Sticker",
  VOA: "Visa on Arrival",
  VFS: "VFS Appointment",
  ETA: "ETA",
  PRE_ENROLLMENT: "Pre Enrollment",
  ARRIVAL_CARD: "Arrival Card",
  VISA_FREE_ENTRY: "Visa Free Entry",
  SCHENGEN_VISA: "Schengen Visa",
  APPOINTMENTS: "Appointments",
  OTHER: "Other",
};

const entryTypeLabels: Record<string, string> = {
  SINGLE: "Single Entry",
  DOUBLE: "Double Entry",
  MULTIPLE: "Multiple Entry",
};

const stayTypeLabels: Record<string, string> = {
  SHORT_STAY: "Short Stay",
  LONG_STAY: "Long Stay",
};

const formatEnumLabel = (
  value: string | null | undefined,
  labels: Record<string, string>
) => {
  if (!value) return null;
  return labels[value] || value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};

const buildEntrySummary = (visa: {
  visaSubTypeLabel?: string | null;
  entryType?: string | null;
  stayType?: string | null;
  entryTypeLegacy?: string | null;
  subTypes?: Array<{ label: string; code?: string | null }> | null;
}) => {
  // If subtypes exist, show them
  if (visa.subTypes && visa.subTypes.length > 0) {
    return visa.subTypes.map(st => st.label).join(", ");
  }
  // Fallback to legacy label
  if (visa.visaSubTypeLabel) return visa.visaSubTypeLabel;
  const entryLabel = formatEnumLabel(visa.entryType ?? null, entryTypeLabels);
  const stayLabel = formatEnumLabel(visa.stayType ?? null, stayTypeLabels);
  const parts = [entryLabel, stayLabel].filter(Boolean);
  if (parts.length) return parts.join(" • ");
  return visa.entryTypeLegacy || "Flexible Entry";
};

export async function generateMetadata({
  params,
}: {
  params: { country: string; type: string };
}): Promise<Metadata> {
  // Decode URL-encoded slug
  const decodedSlug = decodeURIComponent(params.type);

  const visa = await prisma.visa.findFirst({
    where: { slug: decodedSlug },
    include: {
      Country: true,
    },
  });

  if (!visa || (visa as any).Country.code.toLowerCase() !== params.country) {
    return {};
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://travunited.com";
  const pageUrl = `${siteUrl}/visas/${params.country}/${visa.slug}`;

  // Get OG image - use hero image, fallback to a default
  let ogImage: string | undefined;
  if (visa.heroImageUrl) {
    const imageUrl = getMediaProxyUrl(visa.heroImageUrl);
    if (imageUrl) {
      // Ensure absolute URL for social media
      ogImage = imageUrl.startsWith("http")
        ? imageUrl
        : imageUrl.startsWith("/")
          ? `${siteUrl}${imageUrl}`
          : `${siteUrl}/${imageUrl}`;
    }
  }

  // If no image, use a default OG image
  if (!ogImage) {
    ogImage = `${siteUrl}/og-default.jpg`; // You can create this default image
  }

  const title = visa.metaTitle || visa.name;
  const description = visa.metaDescription || visa.subtitle || visa.overview?.substring(0, 160) || `Apply for ${visa.name} - ${(visa as any).Country.name} visa services`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Travunited",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: visa.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function VisaDetailPage({
  params,
  searchParams,
}: {
  params: { country: string; type: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Decode URL-encoded slug
  const decodedSlug = decodeURIComponent(params.type);

  const visa = await prisma.visa.findFirst({
    where: { slug: decodedSlug },
    include: {
      Country: true,
      VisaDocumentRequirement: {
        orderBy: { sortOrder: "asc" },
      },
      VisaFaq: {
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      },
      VisaSubType: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!visa || (visa as any).Country.code.toLowerCase() !== params.country) {
    notFound();
  }

  const requirements = (visa as any).VisaDocumentRequirement || [];
  const perTravellerDocs = requirements.filter(
    (req: any) => req.scope === "PER_TRAVELLER"
  );
  const perApplicationDocs = requirements.filter(
    (req: any) => req.scope === "PER_APPLICATION"
  );

  const heroImageUrl = visa.heroImageUrl ? getMediaProxyUrl(visa.heroImageUrl) : null;
  const sampleVisaUrl = visa.sampleVisaImageUrl
    ? getMediaProxyUrl(visa.sampleVisaImageUrl)
    : null;
  const modeDisplay = formatEnumLabel(visa.visaMode ?? null, visaModeLabels) || "Not specified";
  const entryDisplay = buildEntrySummary({
    ...visa,
    subTypes: (visa as any).VisaSubType,
  } as any);
  const stayTypeDisplay = formatEnumLabel(visa.stayType ?? null, stayTypeLabels);
  const stayDurationDisplay = visa.stayDurationDays
    ? `Up to ${visa.stayDurationDays} days`
    : visa.stayDuration || "Not specified";
  const validityDisplay = visa.validityDays
    ? `${visa.validityDays} days from issue`
    : visa.validity || "Not specified";

  // Check if this is an information-only visa (VOA or Visa-Free Entry)
  const isInformationOnly = visa.visaMode === "VOA" || visa.visaMode === "VISA_FREE_ENTRY";

  return (
    <VisaDetailClient searchParams={searchParams}>
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <BackToVisasButton countryCode={params.country} countryName={(visa as any).Country.name} />
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{visa.name}</h1>
            <p className="text-lg text-white/90">{visa.subtitle}</p>
            <p className="text-sm text-white/80 mt-3 flex flex-wrap gap-4">
              <span>
                <span className="font-semibold text-white">Mode:</span> {modeDisplay}
              </span>
              <span>
                <span className="font-semibold text-white">Entry:</span> {entryDisplay}
              </span>
              {stayTypeDisplay && (
                <span>
                  <span className="font-semibold text-white">Stay:</span> {stayTypeDisplay}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Featured Image */}
              {heroImageUrl && (
                <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-large bg-neutral-100">
                  <ImageWithFallback
                    src={heroImageUrl}
                    alt={visa.name}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    fallbackSrc="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Processing", value: visa.processingTime },
                  { label: "Mode", value: modeDisplay },
                  { label: "Entry", value: entryDisplay },
                  { label: "Stay Duration", value: stayDurationDisplay },
                  { label: "Validity", value: validityDisplay },
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

              <section id="requirements-section" className="space-y-4">
                <h2 className="text-2xl font-bold text-neutral-900">Documents Required</h2>
                {perTravellerDocs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-2">
                      Per Traveller
                    </h3>
                    <div className="space-y-2">
                      {perTravellerDocs.map((req: any) => (
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
                      {perApplicationDocs.map((req: any) => (
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

              {sampleVisaUrl && (
                <section className="space-y-3">
                  <h2 className="text-2xl font-bold text-neutral-900">Visa Sample</h2>
                  <div className="border border-neutral-200 rounded-2xl p-4 flex items-start gap-3 bg-neutral-50">
                    <FileText className="text-primary-600 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-neutral-700 mb-2">
                        View a sample of the approved visa document for reference.
                      </p>
                      <a
                        href={sampleVisaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        <span>Open visa sample</span>
                        <ArrowRight size={16} className="ml-1" />
                      </a>
                    </div>
                  </div>
                </section>
              )}

              {(visa.importantNotes || isInformationOnly) && (
                <section id="important-notes" className="space-y-4">
                  <h2 className="text-2xl font-bold text-neutral-900">Important Notes</h2>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    {visa.importantNotes && (
                      <p className="text-neutral-700 whitespace-pre-line">
                        {visa.importantNotes}
                      </p>
                    )}
                    {isInformationOnly && (
                      <div className={`p-3 bg-white rounded border border-amber-300 ${visa.importantNotes ? 'mt-4' : ''}`}>
                        <p className="text-sm text-neutral-700">
                          <strong>Important:</strong> This visa is issued after arrival in the destination country. 
                          Immigration officers have discretion in issuing visas upon arrival. 
                          Ensure you have all required documents and meet entry conditions. 
                          Charges, if any, are payable directly at the immigration counter.
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {visa.rejectionReasons && (
                <section className="space-y-4">
                  <h2 className="text-2xl font-bold text-neutral-900">Rejection Reasons</h2>
                  <p className="text-neutral-700 whitespace-pre-line">
                    {visa.rejectionReasons}
                  </p>
                </section>
              )}

              {((visa as any).VisaFaq || []).length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-2xl font-bold text-neutral-900">FAQs</h2>
                  <div className="space-y-3">
                    {(visa as any).VisaFaq.map((faq: any) => (
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
                {/* Information-only notice for VOA and Visa-Free Entry */}
                {isInformationOnly && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-amber-900 mb-1">Information Only</h3>
                        <p className="text-sm text-amber-800">
                          This visa is issued after arrival in the destination country. No online application or payment is required or accepted on this platform.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  {visa.govtFee !== null && visa.serviceFee !== null ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-4xl font-bold text-primary-600">
                          {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                          {(visa.govtFee + visa.serviceFee).toLocaleString()}
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
                          isInformationOnly 
                            ? "bg-neutral-100 text-neutral-700" 
                            : "bg-green-100 text-green-700"
                        }`}>
                          {isInformationOnly 
                            ? "Payable at destination" 
                            : "All taxes included"}
                        </span>
                      </div>
                      {isInformationOnly ? (
                        <div className="text-sm text-neutral-500 mb-2">
                          Indicative charges (if applicable) - Payable at immigration counter
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-500 mb-2">
                          Govt: {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                          {visa.govtFee.toLocaleString()} + Service: {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                          {visa.serviceFee.toLocaleString()}
                        </div>
                      )}
                      <div className="text-sm text-neutral-500">Per traveller</div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-4xl font-bold text-primary-600">
                          {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                          {visa.priceInInr.toLocaleString()}
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
                          isInformationOnly 
                            ? "bg-neutral-100 text-neutral-700" 
                            : "bg-green-100 text-green-700"
                        }`}>
                          {isInformationOnly 
                            ? "Payable at destination" 
                            : "All taxes included"}
                        </span>
                      </div>
                      {isInformationOnly ? (
                        <div className="text-sm text-neutral-500 mb-2">
                          Indicative charges (if applicable) - Payable at immigration counter
                        </div>
                      ) : null}
                      <div className="text-sm text-neutral-500">Per traveller</div>
                    </>
                  )}
                </div>

                {/* Conditional CTA based on visa type */}
                {isInformationOnly ? (
                  <InformationOnlyCTAs />
                ) : (
                  <Link
                    href={`/apply/visa/${params.country}/${visa.slug}`}
                    className="w-full bg-primary-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 mb-4"
                  >
                    <span>Apply for this Visa</span>
                    <ArrowRight size={20} />
                  </Link>
                )}

                {/* Share Button */}
                <div className="mb-4">
                  <ShareButton
                    url=""
                    title={visa.name}
                    description={visa.subtitle || visa.overview?.substring(0, 160)}
                    className="w-full"
                  />
                </div>

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
    </VisaDetailClient>
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
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${requirement.isRequired
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

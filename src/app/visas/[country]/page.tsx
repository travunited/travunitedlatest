"use server";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, CheckCircle, Info, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CountryVisasClient } from "./CountryVisasClient";

const entryTypeLabels: Record<string, string> = {
  SINGLE: "Single Entry",
  DOUBLE: "Double Entry",
  MULTIPLE: "Multiple Entry",
};

const stayTypeLabels: Record<string, string> = {
  SHORT_STAY: "Short Stay",
  LONG_STAY: "Long Stay",
};

const visaModeLabels: Record<string, string> = {
  EVISA: "eVisa",
  STICKER: "Sticker",
  VOA: "Visa on Arrival",
  VFS: "VFS Appointment",
  ETA: "ETA",
  OTHER: "Other",
};

const formatEnumLabel = (
  value: string | null | undefined,
  labels: Record<string, string>
) => {
  if (!value) return null;
  return labels[value] || value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};

const buildEntrySummary = (visa: any) => {
  // If subtypes exist, show them
  if (visa.subTypes && visa.subTypes.length > 0) {
    return visa.subTypes.map((st: { label: string }) => st.label).join(", ");
  }
  // Fallback to legacy label
  if (visa.visaSubTypeLabel) return visa.visaSubTypeLabel;
  const entryLabel = formatEnumLabel(visa.entryType, entryTypeLabels);
  const stayLabel = formatEnumLabel(visa.stayType, stayTypeLabels);
  const parts = [entryLabel, stayLabel].filter(Boolean);
  if (parts.length) return parts.join(" • ");
  return visa.entryTypeLegacy || "Flexible Entry";
};

export default async function CountryVisasPage({
  params,
}: {
  params: { country: string };
}) {
  const code = params.country.toUpperCase();
  const country = await prisma.country.findUnique({
    where: { code },
    include: {
      visas: {
        where: { isActive: true },
        include: {
          subTypes: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: [
          { isFeatured: "desc" },
          { priceInInr: "asc" },
        ],
      },
    },
  });

  if (!country) {
    notFound();
  }

  return (
    <CountryVisasClient>
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href="/visas"
              className="inline-flex items-center text-white/80 hover:text-white mb-4 text-sm"
            >
              ← Back to All Visas
            </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">{country.name}</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Choose the visa type that best suits your travel needs
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {country.visas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600 text-lg">
              Visa information for this country is coming soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {country.visas.map((visa) => (
              <div
                key={visa.id}
                className="bg-white rounded-2xl shadow-medium hover:shadow-large transition-shadow p-8 border border-neutral-200"
              >
                <span className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 px-3 py-1 rounded-full mb-4">
                  {visa.category}
                </span>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                  {visa.name}
                </h2>
                <p className="text-neutral-600 mb-6">{visa.subtitle}</p>

                <div className="space-y-3 mb-6 text-sm text-neutral-700">
                  <div className="flex items-center">
                    <Clock size={18} className="mr-3 text-primary-600" />
                    <span>
                      <strong>Processing:</strong> {visa.processingTime}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={18} className="mr-3 text-primary-600" />
                    <span>
                      <strong>Stay Duration:</strong> {visa.stayDurationDays ? `Up to ${visa.stayDurationDays} days` : visa.stayDuration}
                    </span>
                  </div>
                  {visa.validityDays && (
                    <div className="flex items-center">
                      <Info size={18} className="mr-3 text-primary-600" />
                      <span>
                        <strong>Validity:</strong> {visa.validityDays} days from issue
                      </span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Info size={18} className="mr-3 text-primary-600" />
                    <span>
                      <strong>Entry Type:</strong> {buildEntrySummary(visa)}
                    </span>
                  </div>
                  {visa.visaMode && (
                    <div className="flex items-center">
                      <Info size={18} className="mr-3 text-primary-600" />
                      <span>
                        <strong>Mode:</strong> {formatEnumLabel(visa.visaMode, visaModeLabels)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-neutral-200">
                  <div>
                    {visa.govtFee !== null && visa.serviceFee !== null ? (
                      <>
                        <div className="text-3xl font-bold text-primary-600">
                          {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                          {(visa.govtFee + visa.serviceFee).toLocaleString()}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          Govt: {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                          {visa.govtFee.toLocaleString()} + Service: {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                          {visa.serviceFee.toLocaleString()}
                        </div>
                        <div className="text-sm text-neutral-500">Per traveller</div>
                      </>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-primary-600">
                          {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                          {visa.priceInInr.toLocaleString()}
                        </div>
                        <div className="text-sm text-neutral-500">Per traveller</div>
                      </>
                    )}
                  </div>
                  <Link
                    href={`/visas/${params.country}/${visa.slug}`}
                    className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center space-x-2"
                  >
                    <span>View Details</span>
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </CountryVisasClient>
  );
}

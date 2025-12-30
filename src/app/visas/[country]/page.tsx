"use server";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, CheckCircle, Info, ArrowRight, Calendar, ShieldCheck, MapPin, Zap } from "lucide-react";
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
  PRE_ENROLLMENT: "Pre Enrollment",
  ARRIVAL_CARD: "Arrival Card",
  VISA_FREE_ENTRY: "Visa Free Entry",
  SCHENGEN_VISA: "Schengen Visa",
  APPOINTMENTS: "Appointments",
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
      Visa: {
        where: { isActive: true },
        include: {
          VisaSubType: {
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
              className="inline-flex items-center bg-white text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors mb-4 text-sm"
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
          {((country as any).Visa || []).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-600 text-lg">
                Visa information for this country is coming soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {(country as any).Visa.map((visa: any) => (
                <div
                  key={visa.id}
                  className="group bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 md:p-8 border border-neutral-100 relative overflow-hidden flex flex-col h-full"
                >
                  <div className="mb-auto">
                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] text-primary-700 bg-primary-50/50 px-3 py-1.5 rounded-full border border-primary-100/50">
                        {visa.category}
                      </span>
                      {visa.isFeatured && (
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                          Most Popular
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 mb-2 leading-tight group-hover:text-primary-600 transition-colors">
                      {visa.name}
                    </h2>
                    {visa.subtitle && visa.subtitle !== visa.name && (
                      <p className="text-neutral-500 font-medium mb-6 text-sm md:text-base">{visa.subtitle}</p>
                    )}

                    <div className="space-y-4 mb-8 text-sm md:text-base text-neutral-600">
                      <div className="flex items-center group/item">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mr-4 group-hover/item:bg-primary-100 transition-colors">
                          <Clock size={20} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Processing Time</p>
                          <p className="font-semibold text-neutral-800">{visa.processingTime}</p>
                        </div>
                      </div>

                      <div className="flex items-center group/item">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mr-4 group-hover/item:bg-blue-100 transition-colors">
                          <ShieldCheck size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Stay Duration</p>
                          <p className="font-semibold text-neutral-800">{visa.stayDurationDays ? `Up to ${visa.stayDurationDays} days` : visa.stayDuration}</p>
                        </div>
                      </div>

                      {visa.validityDays != null && visa.validityDays > 0 && (
                        <div className="flex items-center group/item">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mr-4 group-hover/item:bg-amber-100 transition-colors">
                            <Calendar size={20} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Validity</p>
                            <p className="font-semibold text-neutral-800">{visa.validityDays} days from issue</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center group/item">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mr-4 group-hover/item:bg-emerald-100 transition-colors">
                          <MapPin size={20} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Entry Type</p>
                          <p className="font-semibold text-neutral-800">{buildEntrySummary(visa)}</p>
                        </div>
                      </div>

                      {visa.visaMode && (
                        <div className="flex items-center group/item">
                          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mr-4 group-hover/item:bg-purple-100 transition-colors">
                            <Zap size={20} className="text-purple-600" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Mode</p>
                            <p className="font-semibold text-neutral-800">{formatEnumLabel(visa.visaMode, visaModeLabels)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-100 mt-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Starting from</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl md:text-4xl font-black text-neutral-900 tracking-tight">
                            {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                            {(visa.govtFee && visa.serviceFee ? (visa.govtFee + visa.serviceFee) : visa.priceInInr).toLocaleString()}
                          </span>
                          <span className="text-neutral-500 font-medium text-sm">/ pax</span>
                        </div>
                        <div className="flex items-center mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                            Taxes included
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/visas/${params.country}/${visa.slug}`}
                        className="w-full md:w-auto inline-flex items-center justify-center bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-primary-700 transition-all transform hover:-translate-y-1 active:scale-95 shadow-lg shadow-primary-500/20 group/btn"
                      >
                        <span className="text-lg">View Details</span>
                        <ArrowRight size={20} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
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

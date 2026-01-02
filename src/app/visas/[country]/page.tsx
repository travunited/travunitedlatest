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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(country as any).Visa.map((visa: any) => (
                <div
                  key={visa.id}
                  className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-2.5 border border-neutral-100 relative overflow-hidden flex flex-col h-full"
                >
                  <div className="mb-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.1em] text-primary-700 bg-primary-50/50 px-2 py-1 rounded-full border border-primary-100/50">
                        {visa.category}
                      </span>
                      {visa.isFeatured && (
                        <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.1em] text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                          Most Popular
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-extrabold text-neutral-900 mb-0.5 leading-tight group-hover:text-primary-600 transition-colors">
                      {visa.name}
                    </h2>
                    {visa.subtitle && visa.subtitle !== visa.name && (
                      <p className="text-neutral-500 font-medium mb-2 text-xs">{visa.subtitle}</p>
                    )}

                    <div className="space-y-1.5 mb-2 text-xs text-neutral-600">
                      <div className="flex items-center group/item">
                        <div className="w-6 h-6 rounded-lg bg-primary-50 flex items-center justify-center mr-2 group-hover/item:bg-primary-100 transition-colors">
                          <Clock size={13} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-px">Processing Time</p>
                          <p className="font-semibold text-neutral-800 text-[11px] leading-tight">{visa.processingTime}</p>
                        </div>
                      </div>

                      <div className="flex items-center group/item">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center mr-2 group-hover/item:bg-blue-100 transition-colors">
                          <ShieldCheck size={13} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-px">Stay Duration</p>
                          <p className="font-semibold text-neutral-800 text-[11px] leading-tight">{visa.stayDuration || "Not specified"}</p>
                        </div>
                      </div>

                      {visa.validity && (
                        <div className="flex items-center group/item">
                          <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center mr-2 group-hover/item:bg-amber-100 transition-colors">
                            <Calendar size={13} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-px">Validity</p>
                            <p className="font-semibold text-neutral-800 text-[11px] leading-tight">{visa.validity}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center group/item">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center mr-2 group-hover/item:bg-emerald-100 transition-colors">
                          <MapPin size={13} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-px">Entry Type</p>
                          <p className="font-semibold text-neutral-800 text-[11px] leading-tight">{buildEntrySummary(visa)}</p>
                        </div>
                      </div>

                      {visa.visaMode && (
                        <div className="flex items-center group/item">
                          <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center mr-2 group-hover/item:bg-purple-100 transition-colors">
                            <Zap size={13} className="text-purple-600" />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-px">Mode</p>
                            <p className="font-semibold text-neutral-800 text-[11px] leading-tight">{formatEnumLabel(visa.visaMode, visaModeLabels)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 mt-auto">
                    <div className="flex flex-col gap-2">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Starting from</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg md:text-xl font-black text-neutral-900 tracking-tight">
                            {visa.currency === "INR" ? "₹" : visa.currency || "₹"}
                            {(visa.govtFee && visa.serviceFee ? (visa.govtFee + visa.serviceFee) : visa.priceInInr).toLocaleString()}
                          </span>
                          <span className="text-neutral-500 font-medium text-[10px]">/ pax</span>
                        </div>
                        <div className="flex items-center mt-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[8px] font-bold uppercase tracking-wider border border-emerald-100">
                            Taxes included
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/visas/${params.country}/${visa.slug}`}
                        className="w-full inline-flex items-center justify-center bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-md shadow-primary-500/20 group/btn text-xs"
                      >
                        <span>View Details</span>
                        <ArrowRight size={14} className="ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
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

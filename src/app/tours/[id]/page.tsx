"use server";

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function TourDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const tour = await prisma.tour.findFirst({
    where: { slug: params.id },
    include: {
      country: true,
      days: { orderBy: { dayIndex: "asc" } },
    },
  });

  if (!tour) {
    notFound();
  }

  const gallery: string[] = tour.galleryImageUrls
    ? JSON.parse(tour.galleryImageUrls)
    : [];
  const inclusions = toList(tour.inclusions);
  const exclusions = toList(tour.exclusions);

  return (
    <div className="min-h-screen bg-white">
      <Hero tour={tour} gallery={gallery} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            <Section title="Overview">
              <p className="text-neutral-700 whitespace-pre-line leading-relaxed">
                {tour.overview || tour.description}
              </p>
            </Section>

            {tour.days.length > 0 && (
              <Section title="Itinerary">
                <div className="space-y-4">
                  {tour.days.map((day) => (
                    <div
                      key={day.id}
                      className="border border-neutral-200 rounded-2xl p-5 flex gap-4"
                    >
                      <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-600 font-semibold flex items-center justify-center">
                        {day.dayIndex}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900">
                          {day.title}
                        </h3>
                        <p className="text-neutral-700 whitespace-pre-line mt-2">
                          {day.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {(inclusions.length || exclusions.length) && (
              <div className="grid md:grid-cols-2 gap-6">
                {inclusions.length > 0 && (
                  <Section title="Inclusions">
                    <ul className="space-y-2 text-sm text-neutral-700">
                      {inclusions.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle size={16} className="text-primary-600 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                {exclusions.length > 0 && (
                  <Section title="Exclusions">
                    <ul className="space-y-2 text-sm text-neutral-700">
                      {exclusions.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Clock size={16} className="text-neutral-500 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>
            )}

            {tour.importantNotes && (
              <Section title="Important Notes">
                <p className="text-neutral-700 whitespace-pre-line">
                  {tour.importantNotes}
                </p>
              </Section>
            )}

            {gallery.length > 0 && (
              <Section title="Gallery">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {gallery.map((src) => (
                    <div key={src} className="relative aspect-video rounded-xl overflow-hidden">
                      <Image src={src} alt={tour.name} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl shadow-large p-6 border border-neutral-200 space-y-4">
              <div>
                <div className="text-4xl font-bold text-primary-600 mb-1">
                  ₹{(tour.basePriceInInr ?? tour.price).toLocaleString()}
                </div>
                <div className="text-sm text-neutral-500">Per traveller</div>
              </div>

              <div className="text-sm text-neutral-600 space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-primary-600" />
                  <span>{tour.destination}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-primary-600" />
                  <span>{tour.duration}</span>
                </div>
                {tour.country?.name && (
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-primary-600" />
                    <span>{tour.country.name}</span>
                  </div>
                )}
              </div>

              <Link
                href={`/book/tour/${tour.slug}`}
                className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
                <span>Book this Tour</span>
                <ArrowRight size={18} />
              </Link>

              {tour.allowAdvance && tour.advancePercentage && (
                <p className="text-xs text-neutral-500">
                  Pay {tour.advancePercentage}% now and the remaining before departure.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Hero({ tour, gallery }: { tour: any; gallery: string[] }) {
  const heroImage =
    tour.heroImageUrl ||
    tour.imageUrl ||
    gallery[0] ||
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80";
  return (
    <div className="relative h-[400px] md:h-[500px]">
      <Image src={heroImage} alt={tour.name} fill className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/tours"
            className="inline-flex items-center text-white/80 hover:text-white mb-4 text-sm"
          >
            ← Back to Tours
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{tour.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm">
            <span className="flex items-center gap-2">
              <MapPin size={18} />
              {tour.destination}
            </span>
            <span className="flex items-center gap-2">
              <Calendar size={18} />
              {tour.duration}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-bold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

function toList(value: string | null) {
  if (!value) return [];
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}


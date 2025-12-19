import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import { TourDetailClient } from "./TourDetailClient";
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  ArrowRight,
  Users,
  Star,
  TrendingUp,
  Hotel,
  Settings,
  XCircle,
  Tag,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMediaProxyUrl } from "@/lib/media";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { PhotoGallery } from "@/components/tours/PhotoGallery";
import { BackToHolidaysButton } from "./BackToHolidaysButton";
import { ShareButton } from "@/components/sharing/ShareButton";

export async function generateMetadata({
  params,
}: {
  params: { id: string[] };
}): Promise<Metadata> {
  // Join the path segments and decode URL encoding
  const slug = Array.isArray(params.id) ? params.id.join('/') : params.id;
  const decodedSlug = decodeURIComponent(slug);
  
  const tour = await prisma.tour.findFirst({
    where: { slug: decodedSlug },
  });

  if (!tour) {
    return {};
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://travunited.com";
  const canonical = tour.canonicalUrl || `${siteUrl}/holidays/${tour.slug}`;
  
  // Get OG image and ensure it's an absolute URL
  let ogImage: string | undefined;
  const rawOgImage = tour.ogImage
    ? getMediaProxyUrl(tour.ogImage)
    : tour.featuredImage
    ? getMediaProxyUrl(tour.featuredImage)
    : tour.heroImageUrl
    ? getMediaProxyUrl(tour.heroImageUrl)
    : undefined;
  
  if (rawOgImage) {
    // Convert relative URLs to absolute URLs for social media
    ogImage = rawOgImage.startsWith("http") 
      ? rawOgImage 
      : rawOgImage.startsWith("/")
      ? `${siteUrl}${rawOgImage}`
      : `${siteUrl}/${rawOgImage}`;
  }
  
  // Get Twitter image
  let twitterImage: string | undefined;
  if (tour.twitterImage) {
    const rawTwitterImage = getMediaProxyUrl(tour.twitterImage);
    twitterImage = rawTwitterImage.startsWith("http")
      ? rawTwitterImage
      : rawTwitterImage.startsWith("/")
      ? `${siteUrl}${rawTwitterImage}`
      : `${siteUrl}/${rawTwitterImage}`;
  }

  return {
    title: tour.metaTitle || tour.name,
    description: tour.metaDescription || tour.shortDescription || tour.description?.substring(0, 160),
    keywords: tour.metaKeywords?.split(",").map((k) => k.trim()),
    alternates: {
      canonical,
    },
    openGraph: {
      title: tour.ogTitle || tour.metaTitle || tour.name,
      description: tour.ogDescription || tour.metaDescription || tour.shortDescription || tour.description?.substring(0, 160),
      url: canonical,
      siteName: "Travunited",
      images: ogImage ? [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: tour.name,
        }
      ] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: tour.twitterTitle || tour.metaTitle || tour.name,
      description: tour.twitterDescription || tour.metaDescription || tour.shortDescription || tour.description?.substring(0, 160),
      images: twitterImage ? [twitterImage] : ogImage ? [ogImage] : [],
    },
  };
}

export default async function TourDetailPage({
  params,
  searchParams,
}: {
  params: { id: string[] };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Join the path segments and decode URL encoding
  const slug = Array.isArray(params.id) ? params.id.join('/') : params.id;
  const decodedSlug = decodeURIComponent(slug);
  
  const tour = await prisma.tour.findFirst({
    where: { 
      slug: decodedSlug,
      OR: [
        { isActive: true },
        { status: "active" },
        { status: null },
      ],
    },
    include: {
      country: true,
      days: { orderBy: { dayIndex: "asc" } },
      addOns: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!tour) {
    notFound();
  }

  // Parse JSON fields
  const gallery: string[] = tour.images
    ? (() => {
        try {
          const parsed = JSON.parse(tour.images);
          return Array.isArray(parsed) ? parsed.map((url: string) => getMediaProxyUrl(url) || url) : [];
        } catch {
          return [];
        }
      })()
    : tour.galleryImageUrls
    ? (() => {
        try {
          const parsed = JSON.parse(tour.galleryImageUrls);
          return Array.isArray(parsed) ? parsed.map((url: string) => getMediaProxyUrl(url) || url) : [];
        } catch {
          return [];
        }
      })()
    : [];

  const inclusions = parseJsonArray(tour.inclusions);
  const exclusions = parseJsonArray(tour.exclusions);
  const highlights = parseJsonArray(tour.highlights);
  const themes = parseJsonArray(tour.themes);
  const bestFor = parseJsonArray(tour.bestFor);
  const regionTags = parseJsonArray(tour.regionTags);
  const citiesCovered = parseJsonArray(tour.citiesCovered);
  const availableDates = parseJsonArray(tour.availableDates);
  const hotelCategories = parseJsonArray(tour.hotelCategories);
  const customizationOptions = parseJsonObject(tour.customizationOptions);
  const seasonalPricing = parseJsonObject(tour.seasonalPricing);

  // Format duration
  const durationParts: string[] = [];
  if (tour.durationDays) durationParts.push(`${tour.durationDays} day${tour.durationDays !== 1 ? "s" : ""}`);
  if (tour.durationNights) durationParts.push(`${tour.durationNights} night${tour.durationNights !== 1 ? "s" : ""}`);
  const durationDisplay = durationParts.length > 0 ? durationParts.join(" / ") : tour.duration || "5 days";

  // Format destination
  const destinationParts: string[] = [];
  if (tour.primaryDestination) destinationParts.push(tour.primaryDestination);
  if (tour.destinationState) destinationParts.push(tour.destinationState);
  if (tour.destinationCountry) destinationParts.push(tour.destinationCountry);
  const destinationDisplay = destinationParts.length > 0 ? destinationParts.join(", ") : tour.destination || "";

  // Price display
  const currencySymbol = tour.currency === "INR" ? "₹" : tour.currency || "₹";
  const displayPrice = tour.basePriceInInr ?? tour.price ?? 0;
  const originalPrice = tour.originalPrice;

  return (
    <TourDetailClient searchParams={searchParams}>
      <div className="min-h-screen bg-white">
        <Hero 
        tour={tour} 
        gallery={gallery}
        destinationDisplay={destinationDisplay}
        durationDisplay={durationDisplay}
        price={displayPrice}
        originalPrice={originalPrice}
        currency={currencySymbol}
        tourType={tour.tourType}
        tourSubType={tour.tourSubType}
        region={tour.region}
        regionTags={regionTags}
        bestFor={bestFor}
        highlights={highlights}
        groupSizeMin={tour.groupSizeMin}
        groupSizeMax={tour.groupSizeMax}
        difficultyLevel={tour.difficultyLevel}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            {/* Overview Section */}
            <Section title="Overview">
              {tour.shortDescription && (
                <p className="text-lg text-neutral-700 leading-relaxed mb-4">
                  {tour.shortDescription}
                </p>
              )}
              {tour.description && (
                <div className="text-neutral-700 whitespace-pre-line leading-relaxed">
                  {tour.description}
                </div>
              )}
              {!tour.description && tour.overview && (
                <p className="text-neutral-700 whitespace-pre-line leading-relaxed">
                  {tour.overview}
                </p>
              )}
            </Section>

            {/* Highlights */}
            {highlights.length > 0 && (
              <Section title="Highlights">
                <ul className="space-y-3">
                  {highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Star size={20} className="text-primary-600 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-700">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Themes & Best For */}
            {(themes.length > 0 || bestFor.length > 0) && (
              <Section title="Tour Details">
                <div className="space-y-4">
                  {themes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-600 mb-2">Themes</h3>
                      <div className="flex flex-wrap gap-2">
                        {themes.map((theme, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {bestFor.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-600 mb-2">Best For</h3>
                      <div className="flex flex-wrap gap-2">
                        {bestFor.map((item, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Itinerary */}
            {tour.days.length > 0 && (
              <Section title="Detailed Itinerary">
                <div className="space-y-4">
                  {tour.days.map((day) => (
                    <div
                      key={day.id}
                      className="border border-neutral-200 rounded-2xl p-5 flex gap-4"
                    >
                      <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-600 font-semibold flex items-center justify-center flex-shrink-0">
                        {day.dayIndex}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                          {day.title}
                        </h3>
                        <p className="text-neutral-700 whitespace-pre-line">
                          {day.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Cities Covered Timeline */}
            {citiesCovered.length > 0 && (
              <Section title="Cities Covered">
                <div className="flex flex-wrap gap-3">
                  {citiesCovered.map((city, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-lg"
                    >
                      <MapPin size={16} className="text-primary-600" />
                      <span className="text-neutral-700">{city}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Inclusions & Exclusions */}
            {(inclusions.length > 0 || exclusions.length > 0) && (
              <div className="grid md:grid-cols-2 gap-6">
                {inclusions.length > 0 && (
                  <Section title="What's Included">
                    <ul className="space-y-2 text-sm text-neutral-700">
                      {inclusions.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle size={16} className="text-primary-600 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                {exclusions.length > 0 && (
                  <Section title="What's Not Included">
                    <ul className="space-y-2 text-sm text-neutral-700">
                      {exclusions.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <XCircle size={16} className="text-neutral-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>
            )}

            {/* Booking Policies & Cancellation */}
            {(tour.bookingPolicies || tour.cancellationTerms) && (
              <div className="grid md:grid-cols-2 gap-6">
                {tour.bookingPolicies && (
                  <Section title="Booking Policy">
                    <div className="text-neutral-700 whitespace-pre-line text-sm">
                      {tour.bookingPolicies}
                    </div>
                  </Section>
                )}
                {tour.cancellationTerms && (
                  <Section title="Cancellation & Refunds">
                    <div className="text-neutral-700 whitespace-pre-line text-sm">
                      {tour.cancellationTerms}
                    </div>
                  </Section>
                )}
              </div>
            )}

            {/* Dates & Availability */}
            {tour.packageType && (
              <Section title="Dates & Availability">
                {tour.packageType === "fixed_departure" && availableDates.length > 0 ? (
                  <div className="space-y-3">
                    {availableDates.map((dateStr, index) => {
                      const date = new Date(dateStr);
                      const isPast = date < new Date();
                      return (
                        <div
                          key={index}
                          className={`p-4 border rounded-lg ${
                            isPast ? "bg-neutral-50 border-neutral-200 opacity-60" : "bg-white border-neutral-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-neutral-900">
                                {date.toLocaleDateString("en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </div>
                              {tour.bookingDeadline && (
                                <div className="text-sm text-neutral-600 mt-1">
                                  Booking closes {new Date(tour.bookingDeadline).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            {isPast && (
                              <span className="px-3 py-1 bg-neutral-200 text-neutral-600 rounded-full text-xs">
                                Past
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : tour.packageType === "on_demand" ? (
                  <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                    <p className="text-neutral-700">
                      This tour is available on-demand. Please select your preferred travel dates during booking.
                    </p>
                  </div>
                ) : null}
              </Section>
            )}

            {/* Hotels */}
            {hotelCategories.length > 0 && (
              <Section title="Stay & Hotels">
                <div className="flex flex-wrap gap-3">
                  {hotelCategories.map((category, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-lg"
                    >
                      <Hotel size={16} className="text-primary-600" />
                      <span className="text-neutral-700">{category}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Customization Options */}
            {customizationOptions && Object.keys(customizationOptions).length > 0 && (
              <Section title="Customize Your Trip">
                <div className="space-y-3">
                  {Object.entries(customizationOptions).map(([key, value]: [string, any]) => (
                    <div key={key} className="p-4 border border-neutral-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Settings size={18} className="text-primary-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-neutral-900">{key}</div>
                          {typeof value === "string" && (
                            <div className="text-sm text-neutral-600 mt-1">{value}</div>
                          )}
                          {typeof value === "object" && value.price && (
                            <div className="text-sm text-primary-600 mt-1">
                              +{currencySymbol}{value.price.toLocaleString()}
                              {value.type === "per_person" && " per person"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {tour.addOns && tour.addOns.length > 0 && (
              <Section title="Customise This Package">
                <p className="text-sm text-neutral-600 mb-4">
                  Enhance your itinerary with optional add-ons. You can confirm selections during checkout.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  {tour.addOns.map((addOn) => (
                    <div key={addOn.id} className="p-4 border border-neutral-200 rounded-xl bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-neutral-900">{addOn.name}</h4>
                        {addOn.isRequired && (
                          <span className="text-xs font-semibold text-primary-600 uppercase">Required</span>
                        )}
                      </div>
                      {addOn.description && (
                        <p className="text-sm text-neutral-600 mb-2">{addOn.description}</p>
                      )}
                      <p className="text-sm text-primary-600 font-medium">
                        ₹{(addOn.price || 0).toLocaleString()}{" "}
                        {addOn.pricingType === "PER_PERSON" ? "per traveller" : "per booking"}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Important Notes */}
            {tour.importantNotes && (
              <Section title="Important Notes">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-neutral-700 whitespace-pre-line">
                    {tour.importantNotes}
                  </p>
                </div>
              </Section>
            )}

            {/* Gallery */}
            {gallery.length > 0 && (
              <Section title="Photo Gallery">
                <PhotoGallery images={gallery} tourName={tour.name} />
              </Section>
            )}
          </div>

          {/* Booking Sidebar */}
          <aside className="lg:col-span-1">
            <BookingSidebar
              tour={tour}
              price={displayPrice}
              originalPrice={originalPrice}
              currency={currencySymbol}
              durationDisplay={durationDisplay}
              destinationDisplay={destinationDisplay}
              minimumTravelers={tour.minimumTravelers}
              maximumTravelers={tour.maximumTravelers}
              groupSizeMin={tour.groupSizeMin}
              groupSizeMax={tour.groupSizeMax}
              packageType={tour.packageType}
              availableDates={availableDates}
              bookingDeadline={tour.bookingDeadline}
              status={tour.status}
              allowAdvance={tour.allowAdvance}
              advancePercentage={tour.advancePercentage}
            />
          </aside>
        </div>
      </div>
    </div>
    </TourDetailClient>
  );
}

function Hero({
  tour,
  gallery,
  destinationDisplay,
  durationDisplay,
  price,
  originalPrice,
  currency,
  tourType,
  tourSubType,
  region,
  regionTags,
  bestFor,
  highlights,
  groupSizeMin,
  groupSizeMax,
  difficultyLevel,
}: {
  tour: any;
  gallery: string[];
  destinationDisplay: string;
  durationDisplay: string;
  price: number;
  originalPrice: number | null;
  currency: string;
  tourType: string | null;
  tourSubType: string | null;
  region: string | null;
  regionTags: string[];
  bestFor: string[];
  highlights: string[];
  groupSizeMin: number | null;
  groupSizeMax: number | null;
  difficultyLevel: string | null;
}) {
  const heroImage =
    getMediaProxyUrl(tour.featuredImage) ||
    getMediaProxyUrl(tour.heroImageUrl) ||
    getMediaProxyUrl(tour.imageUrl) ||
    getMediaProxyUrl(gallery[0]) ||
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80";

  return (
    <div className="relative h-[500px] md:h-[600px] bg-neutral-100">
      <ImageWithFallback
        src={heroImage}
        alt={tour.name}
        fill
        className="object-cover"
        priority
        sizes="100vw"
        fallbackSrc="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <BackToHolidaysButton />
            <ShareButton
              url=""
              title={tour.name}
              description={tour.shortDescription || tour.description?.substring(0, 160)}
              className="hidden md:block"
            />
          </div>
          
          {/* Title & Location */}
          <h1 className="text-3xl md:text-5xl font-bold mb-3">{tour.name}</h1>
          {destinationDisplay && (
            <div className="flex items-center gap-2 text-white/90 mb-4">
              <MapPin size={20} />
              <span>{destinationDisplay}</span>
            </div>
          )}

          {/* Tags & Badges */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {tourType && (
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm border border-white/30">
                {tourType}
              </span>
            )}
            {tourSubType && (
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm border border-white/30">
                {tourSubType}
              </span>
            )}
            {region && (
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm border border-white/30">
                {region}
              </span>
            )}
            {regionTags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm border border-white/30"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Info Strip */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-white/90 mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <span>{durationDisplay}</span>
            </div>
            {(groupSizeMin || groupSizeMax) && (
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>
                  Group: {groupSizeMin || 1}–{groupSizeMax || 20} people
                </span>
              </div>
            )}
            {difficultyLevel && (
              <div className="flex items-center gap-2">
                <TrendingUp size={18} />
                <span>Difficulty: {difficultyLevel}</span>
              </div>
            )}
          </div>

          {/* Price Block */}
          <div className="flex items-baseline gap-3">
            {originalPrice && originalPrice > price && (
              <span className="text-xl text-white/70 line-through">
                {currency}{originalPrice.toLocaleString()}
              </span>
            )}
            <span className="text-4xl md:text-5xl font-bold">
              {currency}{price.toLocaleString()}
            </span>
            <span className="text-white/80">per person</span>
          </div>

          {/* Best For */}
          {bestFor.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-white/80 text-sm">Best for:</span>
              <div className="flex flex-wrap gap-2">
                {bestFor.slice(0, 3).map((item, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded text-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingSidebar({
  tour,
  price,
  originalPrice,
  currency,
  durationDisplay,
  destinationDisplay,
  minimumTravelers,
  maximumTravelers,
  groupSizeMin,
  groupSizeMax,
  packageType,
  availableDates,
  bookingDeadline,
  status,
  allowAdvance,
  advancePercentage,
}: {
  tour: any;
  price: number;
  originalPrice: number | null;
  currency: string;
  durationDisplay: string;
  destinationDisplay: string;
  minimumTravelers: number | null;
  maximumTravelers: number | null;
  groupSizeMin: number | null;
  groupSizeMax: number | null;
  packageType: string | null;
  availableDates: string[];
  bookingDeadline: Date | null;
  status: string | null;
  allowAdvance: boolean;
  advancePercentage: number | null;
}) {
  const canBook = status === "active";

  return (
    <div className="sticky top-24 bg-white rounded-2xl shadow-large p-6 border border-neutral-200 space-y-4">
      {/* Price */}
      <div>
        {originalPrice && originalPrice > price && (
          <div className="text-sm text-neutral-500 line-through mb-1">
            {currency}{originalPrice.toLocaleString()}
          </div>
        )}
        <div className="text-4xl font-bold text-primary-600 mb-1">
          {currency}{price.toLocaleString()}
        </div>
        <div className="text-sm text-neutral-500">Starting from per person</div>
      </div>

      {/* Info */}
      <div className="text-sm text-neutral-600 space-y-2 border-t border-neutral-200 pt-4">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-primary-600" />
          <span>{destinationDisplay || tour.destination}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-primary-600" />
          <span>{durationDisplay}</span>
        </div>
        {(minimumTravelers || maximumTravelers) && (
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary-600" />
            <span>
              {minimumTravelers || 1}–{maximumTravelers || 50} travelers
            </span>
          </div>
        )}
      </div>

      {/* Booking Button */}
      {canBook ? (
        <Link
          href={`/book/holiday/${tour.slug}`}
          className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
        >
          <span>Book this Holiday</span>
          <ArrowRight size={18} />
        </Link>
      ) : (
        <button
          disabled
          className="w-full bg-neutral-300 text-neutral-500 px-6 py-3 rounded-lg font-medium cursor-not-allowed"
        >
          Not Available
        </button>
      )}

      {/* Share Button */}
      <div className="border-t border-neutral-200 pt-4">
        <ShareButton
          url=""
          title={tour.name}
          description={tour.shortDescription || tour.description?.substring(0, 160)}
          className="w-full"
        />
      </div>

      {/* Advance Payment Info */}
      {allowAdvance && advancePercentage && (
        <p className="text-xs text-neutral-500 text-center">
          Pay {advancePercentage}% now and the remaining before departure.
        </p>
      )}

      {/* Package Type Info */}
      {packageType && (
        <div className="text-xs text-neutral-600 border-t border-neutral-200 pt-4">
          {packageType === "fixed_departure" && availableDates.length > 0 && (
            <div>
              <div className="font-medium mb-2">Available Dates:</div>
              <div className="space-y-1">
                {availableDates.slice(0, 3).map((dateStr, index) => {
                  const date = new Date(dateStr);
                  return (
                    <div key={index} className="text-xs">
                      {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  );
                })}
                {availableDates.length > 3 && (
                  <div className="text-xs text-primary-600">+{availableDates.length - 3} more dates</div>
                )}
              </div>
            </div>
          )}
          {packageType === "on_demand" && (
            <div className="text-xs text-neutral-600">
              Available on-demand. Select your preferred dates during booking.
            </div>
          )}
        </div>
      )}
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

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Fallback: treat as newline-separated string
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function parseJsonObject(value: string | null): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

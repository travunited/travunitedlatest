import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://travunited.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/visas`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/holidays`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/help`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/corporate`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Dynamic: visa pages
  let visaPages: MetadataRoute.Sitemap = [];
  try {
    const visas = await prisma.visa.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        updatedAt: true,
        Country: { select: { code: true } },
      },
    });
    const countryPages = new Map<string, Date>();
    visaPages = visas.map((v) => {
      const countryCode = v.Country?.code?.toLowerCase() ?? "unknown";
      const existing = countryPages.get(countryCode);
      if (!existing || v.updatedAt > existing) countryPages.set(countryCode, v.updatedAt);
      return {
        url: `${BASE_URL}/visas/${countryCode}/${v.slug}`,
        lastModified: v.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    });
    // Country-level pages
    for (const [code, date] of Array.from(countryPages.entries())) {
      visaPages.push({
        url: `${BASE_URL}/visas/${code}`,
        lastModified: date,
        changeFrequency: "weekly",
        priority: 0.75,
      });
    }
  } catch {}

  // Dynamic: blog posts
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });
    blogPages = posts.map((p) => ({
      url: `${BASE_URL}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {}

  // Dynamic: holiday/tour pages
  let tourPages: MetadataRoute.Sitemap = [];
  try {
    const tours = await prisma.tour.findMany({
      where: { isActive: true, status: "active" },
      select: { slug: true, updatedAt: true },
    });
    tourPages = tours.map((t) => ({
      url: `${BASE_URL}/holidays/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {}

  return [...staticPages, ...visaPages, ...blogPages, ...tourPages];
}

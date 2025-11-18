import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function CountryPage({
  params,
}: {
  params: { slug: string };
}) {
  // Check if this country exists in our database
  const country = await prisma.country.findFirst({
    where: {
      OR: [
        { code: { equals: params.slug, mode: "insensitive" } },
        { name: { equals: params.slug, mode: "insensitive" } },
      ],
      isActive: true,
    },
  });

  // If country exists, redirect to the visa page for that country
  if (country) {
    redirect(`/visas/${country.code.toLowerCase()}`);
  }

  // If country doesn't exist, show a 404-like page
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">Country Not Found</h1>
        <p className="text-neutral-600 mb-6">
          We couldn&apos;t find information for &quot;{params.slug}&quot;.
        </p>
        <a
          href="/visas"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Browse All Visa Destinations
        </a>
      </div>
    </div>
  );
}


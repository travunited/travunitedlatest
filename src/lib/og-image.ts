/**
 * Helper function to convert image URLs to absolute URLs for Open Graph meta tags
 * Social media platforms require absolute URLs (with protocol and domain)
 */
export function getAbsoluteImageUrl(imageUrl: string | null | undefined, siteUrl: string): string | undefined {
  if (!imageUrl || imageUrl.trim() === "") {
    return undefined;
  }

  const trimmed = imageUrl.trim();

  // If it's already an absolute URL (starts with http:// or https://), return as-is
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // If it's a relative URL (starts with /), prepend the site URL
  if (trimmed.startsWith("/")) {
    return `${siteUrl.replace(/\/$/, "")}${trimmed}`;
  }

  // Otherwise, prepend site URL with a slash
  return `${siteUrl.replace(/\/$/, "")}/${trimmed}`;
}

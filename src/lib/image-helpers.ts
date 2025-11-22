/**
 * Helper functions for handling images, especially external URLs
 * that might not work with Next.js Image optimization
 */

// List of domains that are known to fail with Next.js Image optimization
// These will use unoptimized mode to prevent 400/404 errors
const PROBLEMATIC_DOMAINS = [
  'statemag.state.gov',
  'planetware.com',
  'www.planetware.com',
  // Add more domains here if they don't work with Next.js Image optimization
];

/**
 * Checks if an image URL should use unoptimized mode
 * This is useful for domains that block or don't support Next.js Image optimization
 */
export function shouldUseUnoptimizedImage(url?: string | null): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    // Check if domain is in the problematic list
    return PROBLEMATIC_DOMAINS.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    // If URL parsing fails, assume it's a relative or invalid URL
    // For relative URLs or invalid URLs, don't use unoptimized
    return false;
  }
}

/**
 * Get image props for Next.js Image component
 * Returns configuration based on whether image should be optimized
 */
export function getImageProps(url?: string | null) {
  const useUnoptimized = shouldUseUnoptimizedImage(url);
  
  return {
    unoptimized: useUnoptimized,
  };
}


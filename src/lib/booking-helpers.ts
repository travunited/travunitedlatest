/**
 * Helper functions for booking-related calculations and validations
 */

/**
 * Calculate age from date of birth
 * Returns age in years as a decimal to support infants (e.g., 0.5 for 6 months)
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  const diff = today.getTime() - dob.getTime();
  // Return precise age in years (decimal) to properly handle infants
  return diff / (365.25 * 24 * 3600 * 1000);
}

/**
 * Determine traveller type based on age
 * @param age - Age in years (can be fractional, e.g., 0.5 for 6 months)
 * @param childAgeLimit - Age limit for children (default: 12)
 * @returns "adult" | "child" | "infant"
 */
export function getTravellerType(age: number, childAgeLimit: number = 12): "adult" | "child" | "infant" {
  // Infants are under 1 year old (including 5-6 month old babies)
  if (age < 1) {
    return "infant";
  } else if (age < childAgeLimit) {
    return "child";
  } else {
    return "adult";
  }
}

/**
 * Calculate child pricing based on pricing type and value
 * @param basePrice - Base price per person
 * @param pricingType - "percent" | "fixed" | "none"
 * @param pricingValue - Percentage (0-100) or fixed amount in paise/cents
 * @returns Child price in paise/cents
 */
export function calculateChildPrice(
  basePrice: number,
  pricingType: string | null | undefined,
  pricingValue: number | null | undefined
): number {
  if (!pricingType || pricingType === "none" || !pricingValue) {
    return basePrice; // Same as adult if no child pricing
  }

  if (pricingType === "percent") {
    return Math.round((basePrice * pricingValue) / 100);
  } else if (pricingType === "fixed") {
    return pricingValue;
  }

  return basePrice;
}

/**
 * Check if destination is domestic (same as company country)
 * @param destinationCountry - Country code or name
 * @param companyCountry - Company's country code (default: "IN" for India)
 */
export function isDomesticDestination(
  destinationCountry: string | null | undefined,
  companyCountry: string = "IN"
): boolean {
  if (!destinationCountry) return false;
  
  // Normalize country codes (uppercase)
  const dest = destinationCountry.toUpperCase().trim();
  const company = companyCountry.toUpperCase().trim();
  
  // Check if destination matches company country
  return dest === company || dest === "INDIA" || dest === "IN";
}

/**
 * Get required documents for a tour based on destination
 * @param tourRequiredDocuments - Tour-level override (JSON array)
 * @param isDomestic - Whether destination is domestic
 * @param globalDomesticDocs - Global default for domestic (default: ["adhar", "pan"])
 * @param globalInternationalDocs - Global default for international (default: ["passport"])
 */
export function getRequiredDocuments(
  tourRequiredDocuments: any,
  isDomestic: boolean,
  globalDomesticDocs: string[] = ["adhar", "pan"],
  globalInternationalDocs: string[] = ["passport"]
): string[] {
  // If tour has specific requirements, use those
  if (tourRequiredDocuments && Array.isArray(tourRequiredDocuments)) {
    return tourRequiredDocuments;
  }

  // Otherwise use global defaults based on destination
  return isDomestic ? globalDomesticDocs : globalInternationalDocs;
}

/**
 * Validate passport expiry for international travel
 * @param passportExpiry - Passport expiry date
 * @param travelDate - Travel date
 * @param minValidityMonths - Minimum validity in months (default: 6)
 */
export function validatePassportExpiry(
  passportExpiry: Date | string,
  travelDate: Date | string,
  minValidityMonths: number = 6
): { valid: boolean; error?: string } {
  const expiry = typeof passportExpiry === "string" ? new Date(passportExpiry) : passportExpiry;
  const travel = typeof travelDate === "string" ? new Date(travelDate) : travelDate;
  const today = new Date();

  if (expiry <= today) {
    return { valid: false, error: "Passport has already expired" };
  }

  const minValidDate = new Date(travel);
  minValidDate.setMonth(minValidDate.getMonth() + minValidityMonths);

  if (expiry < minValidDate) {
    return {
      valid: false,
      error: `Passport must be valid for at least ${minValidityMonths} months from travel date`,
    };
  }

  return { valid: true };
}


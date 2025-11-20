/**
 * Country code mappings for flagcdn
 * Maps common country names/codes to ISO 3166-1 alpha-2 codes
 */
const COUNTRY_CODE_MAP: Record<string, string> = {
  // Standard mappings
  UAE: "ae",
  "UNITED ARAB EMIRATES": "ae",
  USA: "us",
  "UNITED STATES": "us",
  "UNITED STATES OF AMERICA": "us",
  UK: "gb",
  "UNITED KINGDOM": "gb",
  SINGAPORE: "sg",
  THAILAND: "th",
  MALAYSIA: "my",
  AUSTRALIA: "au",
  CANADA: "ca",
  JAPAN: "jp",
  CHINA: "cn",
  INDIA: "in",
  FRANCE: "fr",
  GERMANY: "de",
  ITALY: "it",
  SPAIN: "es",
  PORTUGAL: "pt",
  GREECE: "gr",
  NETHERLANDS: "nl",
  BELGIUM: "be",
  SWITZERLAND: "ch",
  AUSTRIA: "at",
  SWEDEN: "se",
  NORWAY: "no",
  DENMARK: "dk",
  FINLAND: "fi",
  POLAND: "pl",
  CZECH_REPUBLIC: "cz",
  CZECH: "cz",
  HUNGARY: "hu",
  ROMANIA: "ro",
  BULGARIA: "bg",
  CROATIA: "hr",
  TURKEY: "tr",
  RUSSIA: "ru",
  BRAZIL: "br",
  ARGENTINA: "ar",
  MEXICO: "mx",
  SOUTH_AFRICA: "za",
  EGYPT: "eg",
  ISRAEL: "il",
  SAUDI_ARABIA: "sa",
  QATAR: "qa",
  KUWAIT: "kw",
  BAHRAIN: "bh",
  OMAN: "om",
  JORDAN: "jo",
  LEBANON: "lb",
  PHILIPPINES: "ph",
  INDONESIA: "id",
  VIETNAM: "vn",
  SOUTH_KOREA: "kr",
  NEW_ZEALAND: "nz",
  // Schengen - use EU flag
  SCHENGEN: "eu",
  EU: "eu",
  EUROPEAN_UNION: "eu",
};

/**
 * Normalizes country code to lowercase ISO 3166-1 alpha-2 format
 */
function normalizeCountryCode(code: string): string {
  if (!code) return "";
  
  const upperCode = code.toUpperCase().trim();
  
  // Check if it's already a valid 2-letter code
  if (upperCode.length === 2 && /^[A-Z]{2}$/.test(upperCode)) {
    return upperCode.toLowerCase();
  }
  
  // Check mapping
  if (COUNTRY_CODE_MAP[upperCode]) {
    return COUNTRY_CODE_MAP[upperCode].toLowerCase();
  }
  
  // Try to extract 2-letter code if it's longer
  if (upperCode.length > 2) {
    // Check if first 2 letters match a known code
    const firstTwo = upperCode.substring(0, 2);
    if (COUNTRY_CODE_MAP[firstTwo]) {
      return COUNTRY_CODE_MAP[firstTwo].toLowerCase();
    }
    // Return first 2 letters as-is (might be valid ISO code)
    return firstTwo.toLowerCase();
  }
  
  return upperCode.toLowerCase();
}

/**
 * Gets flagcdn URL for a country code
 * @param countryCode - ISO 3166-1 alpha-2 country code or country name
 * @param width - Flag width (default: 320, options: 40, 80, 160, 320, 640, 1280)
 * @returns FlagCDN URL or empty string if invalid
 */
export function getFlagUrl(countryCode?: string | null, width: number = 320): string {
  if (!countryCode) return "";
  
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized || normalized.length !== 2) return "";
  
  // Validate width
  const validWidths = [40, 80, 160, 320, 640, 1280];
  const flagWidth = validWidths.includes(width) ? width : 320;
  
  return `https://flagcdn.com/w${flagWidth}/${normalized}.png`;
}

/**
 * Gets flag URL with fallback - uses provided flagUrl if available, otherwise generates from country code
 * @param flagUrl - Existing flag URL from database
 * @param countryCode - ISO 3166-1 alpha-2 country code or country name
 * @param width - Flag width (default: 320)
 * @returns Flag URL (preferred flagUrl, or generated flagcdn URL, or empty string)
 */
export function getCountryFlagUrl(
  flagUrl?: string | null,
  countryCode?: string | null,
  width: number = 320
): string {
  // Use provided flagUrl if available
  if (flagUrl && flagUrl.trim()) {
    return flagUrl.trim();
  }
  
  // Generate from country code
  if (countryCode) {
    return getFlagUrl(countryCode, width);
  }
  
  return "";
}


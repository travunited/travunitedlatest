import { z } from "zod";

// Country Import Schema
export const CountryImportRowSchema = z.object({
  country_code: z.string().min(2).max(3).toUpperCase(),
  country_name: z.string().min(1),
  continent: z.string().optional(),
  default_currency: z.string().optional(),
  is_active: z.enum(["TRUE", "FALSE", "true", "false", "1", "0"]).transform((val) => 
    val === "TRUE" || val === "true" || val === "1"
  ),
});

export type CountryImportRow = z.infer<typeof CountryImportRowSchema>;

// Visa Import Schema
export const VisaImportRowSchema = z.object({
  country_code: z.string().min(2).max(3).toUpperCase(),
  country_name: z.string().min(1),
  visa_name: z.string().min(1),
  visa_slug: z.string().min(1).toLowerCase(),
  entry_type: z.string().optional(),
  stay_duration_days: z.string().optional(),
  validity_days: z.string().optional(),
  processing_time_days: z.string().optional(),
  govt_fee: z.string().transform((val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : Math.round(num);
  }),
  service_fee: z.string().transform((val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : Math.round(num);
  }),
  currency: z.string().default("INR"),
  is_active: z.enum(["TRUE", "FALSE", "true", "false", "1", "0"]).transform((val) => 
    val === "TRUE" || val === "true" || val === "1"
  ),
  // Optional fields
  short_description: z.string().optional(),
  long_description: z.string().optional(),
  tags: z.string().optional(),
  show_on_homepage: z.enum(["TRUE", "FALSE", "true", "false", "1", "0"]).optional().transform((val) => 
    val ? (val === "TRUE" || val === "true" || val === "1") : false
  ),
});

export type VisaImportRow = z.infer<typeof VisaImportRowSchema>;

// Tour Import Schema - matches CSV column names
export const TourImportRowSchema = z.object({
  id: z.string().optional(), // UUID, optional for new tours
  title: z.string().min(1),
  slug: z.string().min(1).toLowerCase().optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  price: z.string().transform((val) => {
    if (!val) return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : Math.round(num);
  }),
  original_price: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : Math.round(num);
  }),
  currency: z.string().default("INR"),
  duration_days: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseInt(val);
    return isNaN(num) ? null : num;
  }),
  duration_nights: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseInt(val);
    return isNaN(num) ? null : num;
  }),
  destination_country: z.string().optional(),
  cities_covered: z.string().optional(), // JSON array string
  images: z.string().optional(), // JSON array string
  featured_image: z.string().optional(),
  inclusions: z.string().optional(), // JSON array string
  exclusions: z.string().optional(), // JSON array string
  itinerary: z.string().optional(), // JSON array string
  difficulty_level: z.string().optional(),
  group_size_min: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseInt(val);
    return isNaN(num) ? null : num;
  }),
  group_size_max: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseInt(val);
    return isNaN(num) ? null : num;
  }),
  available_dates: z.string().optional(), // JSON array string
  booking_deadline: z.string().optional().transform((val) => {
    if (!val) return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }),
  status: z.enum(["active", "inactive", "draft", "ACTIVE", "INACTIVE", "DRAFT"]).optional().transform((val) => {
    if (!val) return "active";
    return val.toLowerCase();
  }),
  featured: z.enum(["TRUE", "FALSE", "true", "false", "1", "0"]).optional().transform((val) => 
    val ? (val === "TRUE" || val === "true" || val === "1") : false
  ),
  category_id: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.string().optional(),
  canonical_url: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  created_at: z.string().optional().transform((val) => {
    if (!val) return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }),
  updated_at: z.string().optional().transform((val) => {
    if (!val) return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }),
  country_id: z.string().optional(),
  package_type: z.string().optional(),
  minimum_travelers: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseInt(val);
    return isNaN(num) ? null : num;
  }),
  maximum_travelers: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseInt(val);
    return isNaN(num) ? null : num;
  }),
  hotel_categories: z.string().optional(), // JSON array string
  customization_options: z.string().optional(), // JSON string
  seasonal_pricing: z.string().optional(), // JSON string
  booking_policies: z.string().optional(),
  cancellation_terms: z.string().optional(),
  highlights: z.string().optional(), // JSON array string
  best_for: z.string().optional(), // JSON array string
  destination_state: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().optional(),
  tour_type: z.string().optional(),
  tour_sub_type: z.string().optional(),
  region: z.string().optional(),
  primary_destination: z.string().optional(),
  region_tags: z.string().optional(), // JSON array string
  themes: z.string().optional(), // JSON array string
});

export type TourImportRow = z.infer<typeof TourImportRowSchema>;

// Validation result types
export interface ValidationError {
  row: number;
  message: string;
  field?: string;
}

export interface ValidationResult<T> {
  validRows: Array<{ row: number; data: T }>;
  invalidRows: Array<ValidationError>;
  preview: Array<{ row: number; data: T; valid: boolean; error?: string }>;
}


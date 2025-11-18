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

// Tour Import Schema
export const TourImportRowSchema = z.object({
  tour_name: z.string().min(1),
  tour_slug: z.string().min(1).toLowerCase(),
  country_code: z.string().min(2).max(3).toUpperCase(),
  primary_city: z.string().optional(),
  duration_days: z.string().optional(),
  base_price: z.string().transform((val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : Math.round(num);
  }),
  currency: z.string().default("INR"),
  is_active: z.enum(["TRUE", "FALSE", "true", "false", "1", "0"]).transform((val) => 
    val === "TRUE" || val === "true" || val === "1"
  ),
  max_group_size: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseInt(val);
    return isNaN(num) ? null : num;
  }),
  category: z.string().optional(),
  // Optional fields
  short_description: z.string().optional(),
  long_description: z.string().optional(),
  highlights: z.string().optional(),
  included: z.string().optional(),
  excluded: z.string().optional(),
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


import Papa from "papaparse";
import * as XLSX from "@e965/xlsx";
import { CountryImportRow, CountryImportRowSchema, VisaImportRow, VisaImportRowSchema, TourImportRow, TourImportRowSchema, ValidationResult, ValidationError } from "./import-schemas";

export type ImportEntityType = "countries" | "visas" | "tours";

export function parseCSV(file: File): Promise<any[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // Convert File to text for server-side compatibility
      const text = await file.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as any[]);
        },
        error: (error: Error) => {
          reject(error);
        },
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function parseXLSX(file: File): Promise<any[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // Use File.arrayBuffer() which works in both browser and Node.js environments
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      resolve(jsonData as any[]);
    } catch (error) {
      reject(error);
    }
  });
}

export function parseFile(file: File): Promise<any[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    return parseCSV(file);
  } else if (extension === "xlsx" || extension === "xls") {
    return parseXLSX(file);
  } else {
    throw new Error("Unsupported file format. Please use CSV or XLSX.");
  }
}

// Validate Countries
export function validateCountries(rows: any[]): ValidationResult<CountryImportRow> {
  const validRows: Array<{ row: number; data: CountryImportRow }> = [];
  const invalidRows: ValidationError[] = [];
  const preview: Array<{ row: number; data: CountryImportRow; valid: boolean; error?: string }> = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because index is 0-based and we skip header
    try {
      const validated = CountryImportRowSchema.parse(row);
      validRows.push({ row: rowNum, data: validated });
      preview.push({ row: rowNum, data: validated, valid: true });
    } catch (error: any) {
      const messages = error.errors?.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ") || error.message;
      invalidRows.push({ row: rowNum, message: messages });
      preview.push({ row: rowNum, data: row as any, valid: false, error: messages });
    }
  });

  return { validRows, invalidRows, preview: preview.slice(0, 20) };
}

// Validate Visas
export function validateVisas(rows: any[]): ValidationResult<VisaImportRow> {
  const validRows: Array<{ row: number; data: VisaImportRow }> = [];
  const invalidRows: ValidationError[] = [];
  const preview: Array<{ row: number; data: VisaImportRow; valid: boolean; error?: string }> = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    try {
      const validated = VisaImportRowSchema.parse(row);
      validRows.push({ row: rowNum, data: validated });
      preview.push({ row: rowNum, data: validated, valid: true });
    } catch (error: any) {
      const messages = error.errors?.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ") || error.message;
      invalidRows.push({ row: rowNum, message: messages });
      preview.push({ row: rowNum, data: row as any, valid: false, error: messages });
    }
  });

  return { validRows, invalidRows, preview: preview.slice(0, 20) };
}

// Validate Tours
export function validateTours(rows: any[]): ValidationResult<TourImportRow> {
  const validRows: Array<{ row: number; data: TourImportRow }> = [];
  const invalidRows: ValidationError[] = [];
  const preview: Array<{ row: number; data: TourImportRow; valid: boolean; error?: string }> = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    try {
      const validated = TourImportRowSchema.parse(row);
      validRows.push({ row: rowNum, data: validated });
      preview.push({ row: rowNum, data: validated, valid: true });
    } catch (error: any) {
      const messages = error.errors?.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ") || error.message;
      invalidRows.push({ row: rowNum, message: messages });
      preview.push({ row: rowNum, data: row as any, valid: false, error: messages });
    }
  });

  return { validRows, invalidRows, preview: preview.slice(0, 20) };
}

// Generate CSV template
export function generateCSVTemplate(headers: string[], exampleRows?: any[]): string {
  const csv = [headers.join(",")];
  if (exampleRows) {
    exampleRows.forEach((row) => {
      csv.push(headers.map((h) => {
        const val = row[h] || "";
        // Escape commas and quotes
        if (val.includes(",") || val.includes('"')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(","));
    });
  }
  return csv.join("\n");
}

// Generate XLSX template
export function generateXLSXTemplate(headers: string[], exampleRows?: any[]): Buffer {
  const data: any[] = [headers];
  if (exampleRows) {
    exampleRows.forEach((row) => {
      data.push(headers.map((h) => row[h] || ""));
    });
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return buffer;
}


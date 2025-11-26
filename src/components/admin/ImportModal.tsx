"use client";

import { useState, useRef } from "react";
import { X, Upload, Download, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface ValidationError {
  row: number;
  message: string;
  field?: string;
}

interface PreviewRow {
  row: number;
  data: any;
  valid: boolean;
  error?: string;
}

interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  created?: number;
  updated?: number;
  failed?: number;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "countries" | "visas" | "tours";
  entityName: string;
  onImportComplete?: () => void;
}

export function ImportModal({
  isOpen,
  onClose,
  entityType,
  entityName,
  onImportComplete,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = (format: "csv" | "xlsx") => {
    window.open(`/api/admin/content/${entityType}/template?format=${format}`, "_blank");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview([]);
      setSummary(null);
      setErrors([]);
      setImportResult(null);
    }
  };

  const handleValidate = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setValidating(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/admin/content/${entityType}/import?mode=validate`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data.preview || []);
        setSummary(data.summary);
        setErrors(data.errors || []);
      } else {
        const error = await response.json();
        alert(error.error || "Validation failed");
      }
    } catch (error) {
      console.error("Validation error:", error);
      alert("Failed to validate file");
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file || !summary) {
      alert("Please validate the file first");
      return;
    }

    if (summary.validRows === 0) {
      alert("No valid rows to import");
      return;
    }

    if (!confirm(`Import ${summary.validRows} valid ${entityName}?`)) {
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log(`[ImportModal] Starting import for ${entityType}...`);
      const response = await fetch(`/api/admin/content/${entityType}/import?mode=commit`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(async () => {
        // If JSON parsing fails, try to get text
        const text = await response.text().catch(() => "Unknown error");
        return { error: text, rawResponse: true };
      });

      console.log(`[ImportModal] Import response:`, { status: response.status, data });

      if (response.ok) {
        // Check if import was actually successful
        if (data.success === false) {
          const errorMsg = data.error || "Import failed: No tours were created or updated. Check server logs for details.";
          alert(errorMsg);
          setImportResult(data.summary || {
            totalRows: summary?.totalRows || 0,
            validRows: summary?.validRows || 0,
            invalidRows: summary?.invalidRows || 0,
            created: 0,
            updated: 0,
            failed: data.failed?.length || 0,
          });
          return;
        }
        
        // Check if anything was actually created/updated
        if (data.summary && data.summary.created === 0 && data.summary.updated === 0) {
          if (data.failed && data.failed.length > 0) {
            const errorMessages = data.failed.slice(0, 10).map((f: any) => `Row ${f.row}: ${f.message}`).join("\n");
            const moreErrors = data.failed.length > 10 ? `\n... and ${data.failed.length - 10} more errors` : "";
            alert(`Import completed but no tours were created or updated.\n\nErrors:\n${errorMessages}${moreErrors}\n\nCheck browser console for full details.`);
            console.error("[ImportModal] Import failed for all rows:", data.failed);
          } else {
            alert("Import completed but no tours were created or updated. This may indicate a database schema mismatch. Check server logs for details.");
            console.error("[ImportModal] No tours created/updated and no error details provided");
          }
        } else {
          // Success - show success message
          const successMsg = `Successfully imported: ${data.summary.created || 0} created, ${data.summary.updated || 0} updated${data.summary.failed > 0 ? `, ${data.summary.failed} failed` : ""}`;
          console.log(`[ImportModal] ${successMsg}`);
        }
        
        setImportResult(data.summary);
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        const errorMessage = data.error || data.message || `Import failed with status ${response.status}`;
        const details = data.details ? `\n\nDetails: ${JSON.stringify(data.details)}` : "";
        alert(`Import failed: ${errorMessage}${details}`);
        console.error("[ImportModal] Import error response:", { status: response.status, data });
        setImportResult({
          totalRows: summary?.totalRows || 0,
          validRows: summary?.validRows || 0,
          invalidRows: summary?.invalidRows || 0,
          created: 0,
          updated: 0,
          failed: summary?.validRows || 0,
        });
      }
    } catch (error: any) {
      console.error("[ImportModal] Import error:", error);
      alert(`Failed to import file: ${error.message || "Network error or server unavailable"}`);
      setImportResult({
        totalRows: summary?.totalRows || 0,
        validRows: summary?.validRows || 0,
        invalidRows: summary?.invalidRows || 0,
        created: 0,
        updated: 0,
        failed: summary?.validRows || 0,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (errors.length === 0) return;

    const csv = [
      ["Row", "Error"],
      ...errors.map((e) => [e.row.toString(), e.message]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityType}-import-errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setSummary(null);
    setErrors([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900">
            Import {entityName}
          </h2>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-900"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Download Template */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">
              Step 1: Download Template
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleDownloadTemplate("csv")}
                className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Download size={16} />
                Download CSV Template
              </button>
              <button
                onClick={() => handleDownloadTemplate("xlsx")}
                className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Download size={16} />
                Download Excel Template
              </button>
            </div>
          </div>

          {/* Step 2: Upload File */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">
              Step 2: Upload File
            </h3>
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload size={48} className="text-neutral-400 mb-2" />
                <span className="text-sm font-medium text-neutral-700">
                  {file ? file.name : "Click to select file or drag and drop"}
                </span>
                <span className="text-xs text-neutral-500 mt-1">
                  CSV or Excel files only
                </span>
              </label>
            </div>
            {file && (
              <button
                onClick={handleValidate}
                disabled={validating}
                className="mt-4 w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {validating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Validate File
                  </>
                )}
              </button>
            )}
          </div>

          {/* Step 3: Preview & Validation Results */}
          {summary && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                Step 3: Validation Results
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <div className="text-sm text-neutral-600">Total Rows</div>
                  <div className="text-2xl font-bold text-neutral-900">
                    {summary.totalRows}
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-neutral-600">Valid</div>
                  <div className="text-2xl font-bold text-green-700">
                    {summary.validRows}
                  </div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-sm text-neutral-600">Invalid</div>
                  <div className="text-2xl font-bold text-red-700">
                    {summary.invalidRows}
                  </div>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={handleDownloadErrorReport}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                  >
                    <Download size={16} />
                    Download Error Report ({errors.length} errors)
                  </button>
                </div>
              )}

              {preview.length > 0 && (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-neutral-200 text-sm">
                      <thead className="bg-neutral-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">
                            Row
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">
                            Status
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">
                            Preview
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {preview.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {item.row}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {item.valid ? (
                                <span className="inline-flex items-center gap-1 text-green-700">
                                  <CheckCircle size={16} />
                                  Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-700">
                                  <XCircle size={16} />
                                  Invalid
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <div className="max-w-md truncate">
                                {JSON.stringify(item.data)}
                              </div>
                              {item.error && (
                                <div className="text-xs text-red-600 mt-1">
                                  {item.error}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {summary.validRows > 0 && !importResult && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="mt-4 w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Import {summary.validRows} Valid Rows
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Step 4: Import Results */}
          {importResult && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                Import Complete
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {importResult.created !== undefined && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-neutral-600">Created</div>
                    <div className="text-2xl font-bold text-green-700">
                      {importResult.created}
                    </div>
                  </div>
                )}
                {importResult.updated !== undefined && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-neutral-600">Updated</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {importResult.updated}
                    </div>
                  </div>
                )}
                {importResult.failed !== undefined && importResult.failed > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-sm text-neutral-600">Failed</div>
                    <div className="text-2xl font-bold text-red-700">
                      {importResult.failed}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {importResult ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}


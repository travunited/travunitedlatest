"use client";

import { useState } from "react";
import { Columns, ChevronDown, ChevronUp, CheckSquare, Square } from "lucide-react";

interface ColumnOption {
  key: string;
  label: string;
}

interface ColumnSelectorProps {
  columns: ColumnOption[];
  selectedColumns: string[];
  onSelectionChange: (selected: string[]) => void;
  label?: string;
}

export function ColumnSelector({
  columns,
  selectedColumns,
  onSelectionChange,
  label = "Select Columns",
}: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleColumn = (columnKey: string) => {
    if (selectedColumns.includes(columnKey)) {
      onSelectionChange(selectedColumns.filter((key) => key !== columnKey));
    } else {
      onSelectionChange([...selectedColumns, columnKey]);
    }
  };

  const selectAll = () => {
    onSelectionChange(columns.map((col) => col.key));
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const selectedCount = selectedColumns.length;
  const allSelected = selectedCount === columns.length;
  const noneSelected = selectedCount === 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg font-medium text-sm text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <Columns size={16} />
        <span>{label}</span>
        <span className="text-xs text-neutral-500">
          ({selectedCount}/{columns.length})
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 max-h-96 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-neutral-900">Select Columns</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    disabled={allSelected}
                    className="text-xs text-primary-600 hover:text-primary-700 disabled:text-neutral-400 disabled:cursor-not-allowed"
                  >
                    Select All
                  </button>
                  <span className="text-neutral-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    disabled={noneSelected}
                    className="text-xs text-primary-600 hover:text-primary-700 disabled:text-neutral-400 disabled:cursor-not-allowed"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              {selectedCount === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ At least one column must be selected
                </p>
              )}
            </div>
            <div className="overflow-y-auto p-2">
              {columns.map((column) => {
                const isSelected = selectedColumns.includes(column.key);
                return (
                  <label
                    key={column.key}
                    className="flex items-center gap-2 p-2 rounded hover:bg-neutral-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleColumn(column.key)}
                      className="sr-only"
                    />
                    {isSelected ? (
                      <CheckSquare size={18} className="text-primary-600 flex-shrink-0" />
                    ) : (
                      <Square size={18} className="text-neutral-400 flex-shrink-0" />
                    )}
                    <span className="text-sm text-neutral-700 flex-1">{column.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

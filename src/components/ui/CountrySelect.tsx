"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { COUNTRIES_BY_DEMONYM, searchCountries, type Country } from "@/lib/countries";

interface CountrySelectProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
    disabled?: boolean;
}

export function CountrySelect({
    value,
    onChange,
    placeholder = "Select nationality",
    required = false,
    className = "",
    disabled = false,
}: CountrySelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Filter countries based on search query
    const filteredCountries = useMemo(() => {
        return searchCountries(searchQuery);
    }, [searchQuery]);

    // Find the currently selected country for display
    const selectedCountry = useMemo(() => {
        if (!value) return null;
        const normalized = value.trim().toLowerCase();
        return COUNTRIES_BY_DEMONYM.find(
            (c) => c.demonym.toLowerCase() === normalized
        );
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery("");
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, []);

    // Focus input when opening dropdown
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: "nearest" });
            }
        }
    }, [highlightedIndex]);

    const handleSelect = useCallback((country: Country) => {
        onChange(country.demonym);
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
    }, [onChange]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (!isOpen) {
            if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                event.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < filteredCountries.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                event.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                break;
            case "Enter":
                event.preventDefault();
                if (highlightedIndex >= 0 && filteredCountries[highlightedIndex]) {
                    handleSelect(filteredCountries[highlightedIndex]);
                }
                break;
            case "Escape":
                event.preventDefault();
                setIsOpen(false);
                setSearchQuery("");
                setHighlightedIndex(-1);
                break;
            case "Tab":
                setIsOpen(false);
                setSearchQuery("");
                setHighlightedIndex(-1);
                break;
        }
    }, [isOpen, filteredCountries, highlightedIndex, handleSelect]);

    const handleClear = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        onChange("");
        setSearchQuery("");
    }, [onChange]);

    const highlightMatch = (text: string, query: string) => {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <span key={i} className="font-semibold text-primary-600">
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={`w-full px-4 py-2 border rounded-lg text-left flex items-center justify-between transition-colors ${disabled
                        ? "bg-neutral-100 text-neutral-500 cursor-not-allowed border-neutral-200"
                        : isOpen
                            ? "border-primary-500 ring-2 ring-primary-500/20"
                            : "border-neutral-300 hover:border-neutral-400"
                    } ${!value && !disabled ? "text-neutral-500" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={`truncate ${value ? "text-neutral-900" : "text-neutral-500"}`}>
                    {selectedCountry ? selectedCountry.demonym : value || placeholder}
                </span>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {value && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-neutral-100 rounded transition-colors"
                            aria-label="Clear selection"
                        >
                            <X size={14} className="text-neutral-400" />
                        </button>
                    )}
                    <ChevronDown
                        size={16}
                        className={`text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                </div>
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-neutral-100">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setHighlightedIndex(0);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Search nationality or country..."
                                className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Options list */}
                    <ul
                        ref={listRef}
                        role="listbox"
                        className="max-h-60 overflow-y-auto py-1"
                    >
                        {filteredCountries.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-neutral-500 text-center">
                                No countries found
                            </li>
                        ) : (
                            filteredCountries.map((country, index) => (
                                <li
                                    key={country.code}
                                    role="option"
                                    aria-selected={value === country.demonym}
                                    onClick={() => handleSelect(country)}
                                    onPointerEnter={() => setHighlightedIndex(index)}
                                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${highlightedIndex === index
                                            ? "bg-primary-50"
                                            : value === country.demonym
                                                ? "bg-neutral-50"
                                                : "hover:bg-neutral-50"
                                        } ${value === country.demonym ? "font-medium" : ""}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{highlightMatch(country.demonym, searchQuery)}</span>
                                        <span className="text-xs text-neutral-400 ml-2">
                                            {highlightMatch(country.name, searchQuery)}
                                        </span>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}

            {/* Hidden input for form validation */}
            {required && (
                <input
                    type="text"
                    value={value}
                    required={required}
                    tabIndex={-1}
                    className="sr-only"
                    onChange={() => { }}
                />
            )}
        </div>
    );
}

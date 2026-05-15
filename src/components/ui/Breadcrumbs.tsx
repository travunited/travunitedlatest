"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
    return (
        <nav aria-label="Breadcrumb" className={`text-sm ${className}`}>
            <ol className="flex items-center flex-wrap gap-1">
                <li>
                    <Link
                        href="/"
                        className="flex items-center text-neutral-500 hover:text-primary-600 transition-colors min-h-[44px] px-2 py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-primary-500"
                        aria-label="Go to homepage"
                    >
                        <Home size={16} aria-hidden="true" />
                    </Link>
                </li>
                {items.map((item, index) => (
                    <li key={index} className="flex items-center gap-1">
                        <ChevronRight size={14} className="text-neutral-400 flex-shrink-0" aria-hidden="true" />
                        {item.href ? (
                            <Link
                                href={item.href}
                                className="text-neutral-500 hover:text-primary-600 transition-colors px-2 py-2 rounded-lg min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <span className="max-w-[200px] truncate">{item.label}</span>
                            </Link>
                        ) : (
                            <span
                                className="text-neutral-900 font-medium px-2 py-2 min-h-[44px] flex items-center"
                                aria-current="page"
                            >
                                <span className="max-w-[200px] truncate">{item.label}</span>
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
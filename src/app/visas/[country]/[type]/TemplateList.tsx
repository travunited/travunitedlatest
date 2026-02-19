"use client";

import { useSession } from "next-auth/react";
import { FileText, Download, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface Template {
    id: string;
    name: string;
    description: string | null;
    fileName: string;
    fileSize: number | null;
    downloadUrl: string | null;
}

interface TemplateListProps {
    templates: Template[];
}

export function TemplateList({ templates }: TemplateListProps) {
    const { data: session } = useSession();
    const pathname = usePathname();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
                <div
                    key={template.id}
                    className="border border-neutral-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText size={18} className="text-primary-600" />
                                <h3 className="font-medium text-neutral-900">{template.name}</h3>
                            </div>
                            {template.description && (
                                <p className="text-sm text-neutral-600 mt-1">{template.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                                <span>{template.fileName}</span>
                                {template.fileSize && (
                                    <span>{(template.fileSize / 1024).toFixed(1)} KB</span>
                                )}
                            </div>
                        </div>
                        {session ? (
                            template.downloadUrl ? (
                                <a
                                    href={template.downloadUrl}
                                    download={template.fileName}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                    <Download size={14} />
                                    Download
                                </a>
                            ) : (
                                <span className="text-xs text-neutral-400 italic">Unavailable</span>
                            )
                        ) : (
                            <Link
                                href={`/login?callbackUrl=${encodeURIComponent(pathname || "/")}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 text-neutral-600 text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors"
                            >
                                <Lock size={14} />
                                Login to Download
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

"use client";

import { FileText, HelpCircle } from "lucide-react";

export function InformationOnlyCTAs() {
  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-3 mb-4">
      <button
        onClick={() => scrollToSection('requirements-section')}
        className="w-full bg-primary-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
      >
        <FileText size={20} />
        <span>View Required Documents</span>
      </button>
      <button
        onClick={() => scrollToSection('important-notes')}
        className="w-full border-2 border-primary-600 text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors flex items-center justify-center space-x-2"
      >
        <HelpCircle size={18} />
        <span>Understand Entry Process</span>
      </button>
    </div>
  );
}


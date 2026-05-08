"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-center items-center justify-center px-4 py-16 bg-white">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
        {/* Left Column: Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl"
        >
          <Image
            src="/404-illustration.png"
            alt="Lost in travel"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </motion.div>

        {/* Right Column: Content */}
        <div className="text-center md:text-left space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-8xl font-black text-primary-600 mb-2 tracking-tighter">
              404
            </h1>
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              Oops! You&apos;ve wandered off the map
            </h2>
            <p className="text-lg text-neutral-600 leading-relaxed max-w-md mx-auto md:mx-0">
              Even the best travelers get lost sometimes. The page you&apos;re looking for 
              might have been moved, renamed, or never existed in this dimension.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
          >
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-200 active:scale-95"
            >
              <Home size={20} />
              Return Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-all active:scale-95"
            >
              <ArrowLeft size={20} />
              Go Back
            </button>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="pt-8 border-t border-neutral-100"
          >
            <p className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4">
              Maybe you were looking for:
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {[
                { label: "Visa Services", href: "/visas" },
                { label: "Holiday Packages", href: "/holidays" },
                { label: "Support Center", href: "/support" },
                { label: "Contact Us", href: "/contact" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 bg-neutral-50 text-neutral-600 rounded-full text-sm font-medium hover:bg-primary-50 hover:text-primary-600 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

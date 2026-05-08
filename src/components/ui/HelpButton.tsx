"use client";

import { useState } from "react";
import { X, Mail, Phone, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  const handleWhatsAppClick = () => {
    // Redirect to WhatsApp with the phone number
    window.open("https://wa.me/916360392398", "_blank");
  };

  return (
    <>
      {/* Floating Help Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary-600 text-white p-3 rounded-full shadow-large hover:bg-primary-700 transition-colors flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Get Help"
      >
        <img 
          src="/Agent Travi.svg" 
          alt="Agent Travi" 
          className="w-10 h-10"
        />
      </motion.button>

      {/* Help Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-large p-6 w-80 max-w-[calc(100vw-3rem)]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Need Help?
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <X size={20} className="text-neutral-600" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleWhatsAppClick}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors text-left"
                >
                  <div className="p-2 bg-[#25D366]/10 rounded-lg">
                    <MessageCircle size={20} className="text-[#25D366]" />
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900">WhatsApp Chat</div>
                    <div className="text-sm text-neutral-600">
                      Instant assistance
                    </div>
                  </div>
                </button>

                <a
                  href="mailto:info@travunited.com"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <Mail size={20} className="text-primary-600" />
                  <div>
                    <div className="font-medium text-neutral-900">Email Us</div>
                    <div className="text-sm text-neutral-600">
                      info@travunited.com
                    </div>
                  </div>
                </a>

                <a
                  href="tel:+916360392398"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <Phone size={20} className="text-primary-600" />
                  <div>
                    <div className="font-medium text-neutral-900">Call Us</div>
                    <div className="text-sm text-neutral-600">
                      +91 63603 92398
                    </div>
                  </div>
                </a>

                <Link
                  href="/help"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <MessageCircle size={20} className="text-primary-600" />
                  <div>
                    <div className="font-medium text-neutral-900">
                      Help Center
                    </div>
                    <div className="text-sm text-neutral-600">
                      Browse FAQs & guides
                    </div>
                  </div>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}


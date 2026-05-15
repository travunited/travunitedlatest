import Link from "next/link";
import Image from "next/image";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone } from "lucide-react";

export function Footer() {
  const footerLinks = {
    company: [
      { href: "/about", label: "About Us" },
      { href: "/about/team", label: "Our Team" },
      { href: "/contact", label: "Contact" },
      { href: "/careers", label: "Careers" },
    ],
    services: [
      { href: "/visas", label: "Visa Services" },
      { href: "/holidays", label: "Holiday Packages" },
      { href: "/corporate", label: "Corporate Travel" },
    ],
    support: [
      { href: "/help", label: "Help Center" },
      { href: "/faq", label: "FAQ" },
      { href: "/support", label: "Support" },
    ],
    legal: [
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/cookies", label: "Cookie Policy" },
      { href: "/refund", label: "Refund Policy" },
    ],
  };

  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="block mb-4">
              <img
                src="/white-logo.svg"
                alt="Travunited Logo"
                className="h-14 w-auto"
              />
            </div>
            <p className="text-neutral-400 mb-4 max-w-md">
              Premium visa services and tour packages for global travellers.
              Trusted by thousands for seamless travel experiences.
            </p>
            <div className="flex space-x-4" role="list">
              <a
                href="https://www.facebook.com/travunitedindia"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 min-h-[44px] min-w-[44px] rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center justify-center"
                aria-label="Follow us on Facebook"
                role="listitem"
              >
                <Facebook size={20} aria-hidden="true" />
              </a>
              <a
                href="https://x.com/travunitedin"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 min-h-[44px] min-w-[44px] rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center justify-center"
                aria-label="Follow us on X (Twitter)"
                role="listitem"
              >
                <Twitter size={20} aria-hidden="true" />
              </a>
              <a
                href="https://www.instagram.com/travunited/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 min-h-[44px] min-w-[44px] rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center justify-center"
                aria-label="Follow us on Instagram"
                role="listitem"
              >
                <Instagram size={20} aria-hidden="true" />
              </a>
              <a
                href="https://www.linkedin.com/company/travunited"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 min-h-[44px] min-w-[44px] rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center justify-center"
                aria-label="Connect with us on LinkedIn"
                role="listitem"
              >
                <Linkedin size={20} aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2 mb-6">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-8 pt-8 border-t border-neutral-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm">
              <a
                href="mailto:info@travunited.com"
                className="flex items-center space-x-2 hover:text-white transition-colors"
              >
                <Mail size={16} />
                <span>info@travunited.com</span>
              </a>
              <a
                href="tel:+916360392398"
                className="flex items-center space-x-2 hover:text-white transition-colors"
              >
                <Phone size={16} />
                <span>+91 63603 92398</span>
              </a>
            </div>
            <p className="text-sm text-neutral-500">
              © 2026 Travunited. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}


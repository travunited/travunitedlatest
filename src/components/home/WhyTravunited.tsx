"use client";

import { motion } from "framer-motion";
import { Shield, Clock, DollarSign, Headphones } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Visa Expertise",
    description: "Years of experience handling complex visa applications with high success rates",
  },
  {
    icon: DollarSign,
    title: "Transparent Pricing",
    description: "No hidden fees. Clear, upfront pricing for all services with no surprises",
  },
  {
    icon: Clock,
    title: "Quick Support",
    description: "24/7 customer support to assist you at every step of your journey",
  },
  {
    icon: Headphones,
    title: "Secure Payments",
    description: "Safe and secure payment processing via Razorpay with multiple options",
  },
];

export function WhyTravunited() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Why Travunited?
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            We make travel planning simple, secure, and stress-free
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
                  <Icon size={32} className="text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-600">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


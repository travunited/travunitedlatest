"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    destination: "Dubai Visa",
    rating: 5,
    text: "Travunited made my Dubai visa process so smooth. Their team was responsive and guided me through every step. Highly recommended!",
    location: "Mumbai",
  },
  {
    name: "Rahul Patel",
    destination: "European Tour",
    rating: 5,
    text: "Amazing experience with the European tour package. Everything was well-organized, and the support team was always available when needed.",
    location: "Delhi",
  },
  {
    name: "Anjali Reddy",
    destination: "USA Visa",
    rating: 5,
    text: "Got my USA visa approved in record time. The document verification process was thorough, and the team kept me updated throughout.",
    location: "Bangalore",
  },
  {
    name: "Vikram Singh",
    destination: "Singapore Tour",
    rating: 5,
    text: "Excellent service! The Singapore tour was perfectly planned, and all the inclusions were exactly as promised. Will definitely book again.",
    location: "Pune",
  },
];

export function Testimonials() {
  return (
    <section className="py-16 md:py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Trusted by thousands of Indian travellers for their visa and tour needs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-medium hover:shadow-large transition-shadow"
            >
              <Quote size={32} className="text-primary-200 mb-4" />
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className="fill-accent-500 text-accent-500"
                  />
                ))}
              </div>
              <p className="text-neutral-700 mb-6 leading-relaxed">
                &ldquo;{testimonial.text}&rdquo;
              </p>
              <div>
                <div className="font-semibold text-neutral-900">
                  {testimonial.name}
                </div>
                <div className="text-sm text-neutral-600">
                  {testimonial.destination} • {testimonial.location}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


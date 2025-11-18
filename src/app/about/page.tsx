import Link from "next/link";
import { ArrowLeft, Users, Globe, Award, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-white/80 hover:text-white mb-8 text-sm"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About Travunited</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Making global travel accessible, simple, and stress-free for Indian travellers
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Mission */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">Our Mission</h2>
          <p className="text-lg text-neutral-700 leading-relaxed mb-4">
            At Travunited, we believe that travel should be accessible to everyone. Our mission is to 
            simplify the visa application process and provide exceptional tour experiences for Indian 
            travellers, making international travel seamless and stress-free.
          </p>
          <p className="text-lg text-neutral-700 leading-relaxed">
            We combine technology with personalized service to ensure that every journey begins with 
            confidence and ends with unforgettable memories.
          </p>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-8">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-neutral-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-primary-100 rounded-lg mr-4">
                  <Heart className="text-primary-600" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900">Customer First</h3>
              </div>
              <p className="text-neutral-700">
                Every decision we make is centered around providing the best possible experience for our customers.
              </p>
            </div>

            <div className="bg-neutral-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-primary-100 rounded-lg mr-4">
                  <Award className="text-primary-600" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900">Excellence</h3>
              </div>
              <p className="text-neutral-700">
                We strive for excellence in every visa application, tour package, and customer interaction.
              </p>
            </div>

            <div className="bg-neutral-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-primary-100 rounded-lg mr-4">
                  <Globe className="text-primary-600" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900">Transparency</h3>
              </div>
              <p className="text-neutral-700">
                Clear communication, honest pricing, and transparent processes build trust with our customers.
              </p>
            </div>

            <div className="bg-neutral-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-primary-100 rounded-lg mr-4">
                  <Users className="text-primary-600" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900">Innovation</h3>
              </div>
              <p className="text-neutral-700">
                We continuously innovate to make travel planning easier, faster, and more accessible.
              </p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">Our Story</h2>
          <div className="prose prose-lg max-w-none text-neutral-700">
            <p className="leading-relaxed mb-4">
              Travunited was founded with a simple vision: to remove the barriers that prevent people 
              from exploring the world. We recognized that the visa application process was often 
              confusing, time-consuming, and stressful for Indian travellers.
            </p>
            <p className="leading-relaxed mb-4">
              Starting as a small team in Karnataka, India, we&apos;ve grown into a trusted travel partner 
              with offices in India and the UAE, serving thousands of customers across the globe. 
              Our team of visa experts, travel consultants, and customer support specialists work 
              tirelessly to ensure every journey is smooth and memorable.
            </p>
            <p className="leading-relaxed">
              Today, Travunited offers comprehensive visa services for destinations worldwide, curated 
              tour packages, and corporate travel solutions. We&apos;re proud to have helped countless 
              travellers realize their dreams of exploring new countries and cultures.
            </p>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">Why Choose Travunited?</h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-4 mt-1">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 mb-1">Expert Guidance</h3>
                <p className="text-neutral-700">
                  Our team of visa experts understands the intricacies of visa applications for destinations worldwide.
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-4 mt-1">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 mb-1">Fast Processing</h3>
                <p className="text-neutral-700">
                  We streamline the application process to get your visa approved as quickly as possible.
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-4 mt-1">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 mb-1">24/7 Support</h3>
                <p className="text-neutral-700">
                  Our customer support team is available to assist you at every step of your journey.
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-4 mt-1">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 mb-1">Transparent Pricing</h3>
                <p className="text-neutral-700">
                  No hidden fees. Clear, upfront pricing for all our services.
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-4 mt-1">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 mb-1">Trusted by Thousands</h3>
                <p className="text-neutral-700">
                  Join thousands of satisfied customers who have trusted Travunited for their travel needs.
                </p>
              </div>
            </li>
          </ul>
        </section>

        {/* CTA */}
        <section className="bg-primary-50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Ready to Start Your Journey?</h2>
          <p className="text-neutral-700 mb-6">
            Let us help you make your travel dreams a reality.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/visas"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Explore Visa Services
            </Link>
            <Link
              href="/contact"
              className="bg-white text-primary-600 border-2 border-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}


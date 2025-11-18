import Link from "next/link";
import { ArrowLeft, Briefcase, MapPin, Clock } from "lucide-react";

export default function CareersPage() {
  const openPositions = [
    {
      title: "Visa Consultant",
      location: "Udupi, Karnataka / Remote",
      type: "Full-time",
      department: "Operations",
    },
    {
      title: "Customer Support Executive",
      location: "Udupi, Karnataka",
      type: "Full-time",
      department: "Customer Service",
    },
    {
      title: "Travel Content Writer",
      location: "Remote",
      type: "Part-time / Contract",
      department: "Marketing",
    },
  ];

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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Careers at Travunited</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Join us in making global travel accessible and seamless for everyone
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Why Work With Us */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">Why Work With Us?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Growth Opportunities</h3>
              <p className="text-neutral-700">
                We&apos;re a growing company with opportunities for career advancement and skill development.
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Flexible Work</h3>
              <p className="text-neutral-700">
                We offer flexible working arrangements including remote work options for eligible positions.
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Impactful Work</h3>
              <p className="text-neutral-700">
                Help thousands of travellers realize their dreams of exploring the world.
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Great Culture</h3>
              <p className="text-neutral-700">
                Work with a supportive team that values collaboration, innovation, and work-life balance.
              </p>
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">Open Positions</h2>
          {openPositions.length > 0 ? (
            <div className="space-y-4">
              {openPositions.map((position, index) => (
                <div
                  key={index}
                  className="border border-neutral-200 rounded-lg p-6 hover:shadow-medium transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                        {position.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
                        <div className="flex items-center">
                          <MapPin size={16} className="mr-2" />
                          {position.location}
                        </div>
                        <div className="flex items-center">
                          <Clock size={16} className="mr-2" />
                          {position.type}
                        </div>
                        <div className="flex items-center">
                          <Briefcase size={16} className="mr-2" />
                          {position.department}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/contact?subject=Application for ${position.title}`}
                      className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors whitespace-nowrap"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-50 rounded-lg p-8 text-center">
              <p className="text-neutral-600 mb-4">We don&apos;t have any open positions at the moment.</p>
              <p className="text-neutral-600">
                Check back soon or send us your resume at{" "}
                <a href="mailto:careers@travunited.com" className="text-primary-600 hover:text-primary-700">
                  careers@travunited.com
                </a>
              </p>
            </div>
          )}
        </section>

        {/* How to Apply */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">How to Apply</h2>
          <div className="prose prose-lg max-w-none text-neutral-700">
            <p className="leading-relaxed mb-4">
              Interested in joining our team? Here&apos;s how to apply:
            </p>
            <ol className="list-decimal pl-6 space-y-3">
              <li>Browse our open positions above and find a role that matches your skills and interests.</li>
              <li>Click &quot;Apply Now&quot; on the position you&apos;re interested in, or send your resume directly to{" "}
                <a href="mailto:careers@travunited.com" className="text-primary-600 hover:text-primary-700">
                  careers@travunited.com
                </a>
              </li>
              <li>Include your resume, cover letter, and any relevant portfolio or work samples.</li>
              <li>Our team will review your application and get back to you within 1-2 weeks.</li>
            </ol>
          </div>
        </section>

        {/* General Application */}
        <section className="bg-primary-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Don&apos;t See a Match?</h2>
          <p className="text-neutral-700 mb-6">
            We&apos;re always looking for talented individuals to join our team. Send us your resume and 
            we&apos;ll keep you in mind for future opportunities.
          </p>
          <Link
            href="/contact?subject=General Career Inquiry"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Send Your Resume
          </Link>
        </section>
      </div>
    </div>
  );
}


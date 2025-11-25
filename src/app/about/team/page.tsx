"use client";

import Link from "next/link";
import { ArrowLeft, Linkedin, Mail, Twitter } from "lucide-react";
import Image from "next/image";

// Team members data - can be moved to database/CMS later
const teamMembers = [
  {
    id: "1",
    name: "John Doe",
    role: "CEO & Founder",
    bio: "With over 15 years of experience in the travel industry, John founded Travunited to make international travel accessible to everyone.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    email: "john@travunited.com",
    linkedin: "https://linkedin.com/in/johndoe",
    twitter: "https://twitter.com/johndoe",
  },
  {
    id: "2",
    name: "Jane Smith",
    role: "Head of Operations",
    bio: "Jane brings extensive expertise in visa processing and customer service, ensuring smooth operations and exceptional customer experiences.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    email: "jane@travunited.com",
    linkedin: "https://linkedin.com/in/janesmith",
    twitter: null,
  },
  {
    id: "3",
    name: "Mike Johnson",
    role: "Head of Technology",
    bio: "Mike leads our technology team, building innovative solutions to simplify the visa application and booking process.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
    email: "mike@travunited.com",
    linkedin: "https://linkedin.com/in/mikejohnson",
    twitter: "https://twitter.com/mikejohnson",
  },
  {
    id: "4",
    name: "Sarah Williams",
    role: "Customer Success Manager",
    bio: "Sarah ensures every customer has a seamless experience, from visa application to tour completion.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
    email: "sarah@travunited.com",
    linkedin: "https://linkedin.com/in/sarahwilliams",
    twitter: null,
  },
];

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/about"
            className="inline-flex items-center text-white/80 hover:text-white mb-8 text-sm"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to About
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Team</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Meet the passionate people behind Travunited who make your travel dreams come true
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 hover:shadow-large transition-shadow"
            >
              <div className="aspect-square relative bg-neutral-100 rounded-xl overflow-hidden mb-4">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-1">{member.name}</h3>
              <p className="text-primary-600 font-medium mb-3">{member.role}</p>
              <p className="text-neutral-600 text-sm mb-4 line-clamp-3">{member.bio}</p>
              <div className="flex items-center space-x-3">
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="text-neutral-600 hover:text-primary-600 transition-colors"
                    aria-label={`Email ${member.name}`}
                  >
                    <Mail size={18} />
                  </a>
                )}
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-600 hover:text-primary-600 transition-colors"
                    aria-label={`${member.name} LinkedIn`}
                  >
                    <Linkedin size={18} />
                  </a>
                )}
                {member.twitter && (
                  <a
                    href={member.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-600 hover:text-primary-600 transition-colors"
                    aria-label={`${member.name} Twitter`}
                  >
                    <Twitter size={18} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-primary-50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Join Our Team</h2>
          <p className="text-neutral-700 mb-6">
            We&apos;re always looking for talented individuals to join our mission of making travel accessible to everyone.
          </p>
          <Link
            href="/careers"
            className="inline-flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <span>View Open Positions</span>
            <ArrowLeft size={18} className="rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}




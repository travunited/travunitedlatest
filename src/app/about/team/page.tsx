"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Linkedin, Mail, Twitter, Facebook, Instagram } from "lucide-react";
import Image from "next/image";
import { getMediaProxyUrl } from "@/lib/media";

interface TeamMember {
  id: string;
  name: string;
  title?: string | null;
  bio?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  photoKey?: string | null;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  } | null;
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch("/api/team?isActive=true");
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data || []);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  };
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
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-600">No team members found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member) => {
              const photoUrl = member.photoUrl || (member.photoKey ? getMediaProxyUrl(member.photoKey) : null);
              const socialLinks = member.socialLinks || {};
              
              return (
                <div
                  key={member.id}
                  className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 hover:shadow-large transition-shadow"
                >
                  <div className="aspect-square relative bg-neutral-100 rounded-xl overflow-hidden mb-4">
                    {photoUrl ? (
                      <Image
                        src={photoUrl}
                        alt={member.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                        <span className="text-4xl font-bold text-neutral-400">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-1">{member.name}</h3>
                  {member.title && (
                    <p className="text-primary-600 font-medium mb-3">{member.title}</p>
                  )}
                  {member.bio && (
                    <p className="text-neutral-600 text-sm mb-4 line-clamp-3">{member.bio}</p>
                  )}
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
                    {socialLinks.linkedin && (
                      <a
                        href={socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-primary-600 transition-colors"
                        aria-label={`${member.name} LinkedIn`}
                      >
                        <Linkedin size={18} />
                      </a>
                    )}
                    {socialLinks.twitter && (
                      <a
                        href={socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-primary-600 transition-colors"
                        aria-label={`${member.name} Twitter`}
                      >
                        <Twitter size={18} />
                      </a>
                    )}
                    {socialLinks.facebook && (
                      <a
                        href={socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-primary-600 transition-colors"
                        aria-label={`${member.name} Facebook`}
                      >
                        <Facebook size={18} />
                      </a>
                    )}
                    {socialLinks.instagram && (
                      <a
                        href={socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-primary-600 transition-colors"
                        aria-label={`${member.name} Instagram`}
                      >
                        <Instagram size={18} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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





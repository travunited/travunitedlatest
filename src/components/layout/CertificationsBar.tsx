import Image from "next/image";

const certifications = [
  { name: "ISO 9001:2015", src: "/certifications/iso.png" },
  { name: "Startup India", src: "/certifications/startupindia.png" },
  { name: "IATA", src: "/certifications/iata.png" },
  { name: "TAFI", src: "/certifications/tafi.png" },
  { name: "TAAI", src: "/certifications/taai.png" },
];

export function CertificationsBar() {
  return (
    <section className="bg-white border-t border-neutral-200 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-semibold tracking-widest text-primary-700 uppercase">
          Certified &amp; Trusted By
        </p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 items-center justify-items-center">
          {certifications.map((cert) => (
            <div key={cert.name} className="flex items-center justify-center">
              <Image
                src={cert.src}
                alt={cert.name}
                width={200}
                height={80}
                className="h-12 w-auto object-contain grayscale hover:grayscale-0 transition"
                priority={false}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


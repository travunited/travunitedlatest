const { PrismaClient, DocScope } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const COUNTRY_SEED = [
  {
    code: "UAE",
    name: "United Arab Emirates",
    region: "Middle East",
    flagUrl: "https://flagcdn.com/w320/ae.png",
  },
  {
    code: "SG",
    name: "Singapore",
    region: "South-East Asia",
    flagUrl: "https://flagcdn.com/w320/sg.png",
  },
  {
    code: "FR",
    name: "France",
    region: "Europe",
    flagUrl: "https://flagcdn.com/w320/fr.png",
  },
];

const VISA_SEED = [
  {
    slug: "uae-tourist-30-days",
    countryCode: "UAE",
    name: "UAE Tourist Visa - 30 Days Single Entry",
    subtitle: "Fast approvals for leisure travel",
    category: "Tourist",
    isFeatured: true,
    priceInInr: 12500,
    processingTime: "3-5 working days",
    stayDuration: "Up to 30 days",
    validity: "60 days from date of issue",
    entryType: "Single Entry",
    overview: `Plan a premium Dubai getaway with a visa handled completely online. Submit documents digitally, get proactive updates from Travunited specialists, and receive your approved visa via email.`,
    eligibility: `- Indian passport valid at least 6 months\n- Confirmed return tickets & hotel booking\n- No immigration violations in UAE`,
    importantNotes: `- Photo background must be plain white\n- Passport scan should not exceed 2 MB\n- Visa is valid only for leisure travel`,
    rejectionReasons: `- Blurry passport scans\n- Previous overstay in UAE\n- Mismatch between ticket and visa validity`,
    whyTravunited: `- Dedicated visa concierge available on WhatsApp\n- Priority processing with proactive nudges when documents are missing\n- Secure payments with Razorpay and GST invoice`,
    statistics: `92% approval rate for UAE visas handled by Travunited in 2024`,
    heroImageUrl: "https://images.unsplash.com/photo-1465414829459-d228b58caf6e?w=1400&q=80",
    metaTitle: "UAE Tourist Visa - Apply Online | Travunited",
    metaDescription: "Apply for your 30-day UAE tourist visa online with Travunited. Fast approvals, transparent pricing, and dedicated travel experts.",
    requirements: [
      {
        name: "Passport first & last page",
        description: "Colour scan, minimum 300 DPI, valid for 6+ months.",
        scope: DocScope.PER_TRAVELLER,
        category: "Identity",
        isRequired: true,
      },
      {
        name: "Recent photograph",
        description: "White background, matte finish, 35mm x 45mm.",
        scope: DocScope.PER_TRAVELLER,
        category: "Identity",
        isRequired: true,
      },
      {
        name: "Travel itinerary",
        description: "Return flight itinerary (ticket or booking reference).",
        scope: DocScope.PER_APPLICATION,
        category: "Travel",
        isRequired: true,
      },
      {
        name: "Hotel confirmation",
        description: "Voucher covering entire stay or invitation letter.",
        scope: DocScope.PER_APPLICATION,
        category: "Accommodation",
        isRequired: false,
      },
    ],
    faqs: [
      {
        category: "General",
        question: "How long does the UAE visa take?",
        answer: "Standard processing is 3-5 working days. Express upgrades are available on request.",
      },
      {
        category: "Documents",
        question: "Can I submit a selfie instead of a studio photo?",
        answer: "Studio photos are strongly recommended. If you upload a selfie, ensure proper lighting, white wall, and no shadows.",
      },
    ],
  },
  {
    slug: "singapore-e-visa",
    countryCode: "SG",
    name: "Singapore Tourist Visa - eVisa",
    subtitle: "Paperless approvals within a week",
    category: "Tourist",
    priceInInr: 11500,
    processingTime: "5-7 working days",
    stayDuration: "Up to 30 days",
    validity: "3 months multiple entry",
    entryType: "Multiple Entry",
    overview: `Travunited submits your Singapore visa directly through authorised channels. Upload docs once, track progress inside your dashboard, and receive the eVisa PDF ready for travel.`,
    eligibility: `- Valid Indian passport (traditional booklet)\n- Proof of employment or business registration\n- Travel history to Singapore or developed countries improves approval chances`,
    importantNotes: `Visa validity is decided by the High Commission. Travunited cannot guarantee stay duration but will share previous trend data.`,
    rejectionReasons: `- Low-quality bank statements\n- Mismatched signatures on forms\n- Missing employment proof`,
    whyTravunited: `- Digital document collection with per-traveller guidance\n- Optional concierge review of your travel plan to boost approval chances\n- Automated reminders for upcoming travel dates`,
    statistics: `Trusted by 3,500+ travellers for Singapore visas since 2023`,
    heroImageUrl: "https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=1400&q=80",
    metaTitle: "Singapore eVisa for Indians | Travunited",
    metaDescription: "Apply for a Singapore tourist visa online. Managed by Travunited visa experts with transparent status tracking.",
    requirements: [
      {
        name: "Visa application form 14A",
        description: "Signed form (Travunited auto-fills, you sign digitally).",
        scope: DocScope.PER_TRAVELLER,
        category: "Forms",
        isRequired: true,
      },
      {
        name: "Bank statement (6 months)",
        description: "Downloaded PDF with bank seal or digitally signed.",
        scope: DocScope.PER_APPLICATION,
        category: "Financials",
        isRequired: true,
      },
      {
        name: "Employment proof",
        description: "HR letter / payslip / business registration certificate.",
        scope: DocScope.PER_TRAVELLER,
        category: "Employment",
      },
      {
        name: "Travel history",
        description: "Previous visas or passport pages with entry stamps.",
        scope: DocScope.PER_TRAVELLER,
        category: "Supporting",
        isRequired: false,
      },
    ],
    faqs: [
      {
        category: "Eligibility",
        question: "Is biometric submission required?",
        answer: "No biometrics needed. Everything is processed online unless the embassy explicitly calls you.",
      },
      {
        category: "Processing",
        question: "Can I book flights before visa approval?",
        answer: "We recommend reserving refundable tickets or using Travunited's temporary itinerary service before final confirmation.",
      },
    ],
  },
];

const TOUR_SEED = [
  {
    id: "seed-tour-dubai-deluxe",
    countryCode: "UAE",
    slug: "dubai-deluxe-getaway",
    name: "Dubai Deluxe Getaway",
    subtitle: "Skyline views, desert adventures & premium stays",
    destination: "Dubai, UAE",
    duration: "5 Nights / 6 Days",
    overview: `Curated for first-time Dubai travellers who want a balanced mix of icons (Burj Khalifa, Miracle Garden) and premium experiences (sundowner desert safari, Marina dinner cruise).`,
    description: "Luxury Dubai package covering city tour, desert safari, Burj Khalifa and more.",
    price: 54999,
    basePriceInInr: 54999,
    isFeatured: true,
    allowAdvance: true,
    advancePercentage: 30,
    inclusions: "- Airport transfers\n- 4-star hotel stay with breakfast\n- All sightseeing transfers\n- Visa assistance addon",
    exclusions: "- International flights\n- Lunch & dinner (unless mentioned)\n- Tourism Dirham fee\n- Personal expenses",
    importantNotes: "Passport must be valid for 6+ months from date of travel. Visa processing not included in base cost.",
    heroImageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=80",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80",
      "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?w=1200&q=80",
      "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=1200&q=80",
    ],
    metaTitle: "Dubai Deluxe Getaway | Travunited Tours",
    metaDescription: "6-day Dubai package with premium activities, curated stays and Travunited concierge support.",
    days: [
      {
        title: "Arrival & Marina Cruise",
        content: "Private transfer, evening Dhow cruise with dinner & live entertainment.",
      },
      {
        title: "Old Dubai + Modern Icons",
        content: "Gold & Spice souk walk, Abra ride, At the Top - Burj Khalifa (Level 124).",
      },
      {
        title: "Abu Dhabi Day Trip",
        content: "Visit Sheikh Zayed Grand Mosque, Qasr Al Watan & Ferrari World photo stop.",
      },
      {
        title: "Desert Safari",
        content: "Premium camp with dune bashing, falcon show, BBQ dinner & belly dance.",
      },
      {
        title: "Miracle Garden & Global Village",
        content: "Seasonal attractions (Nov-Apr). Alternate curated experiences during summer.",
      },
      {
        title: "Departure",
        content: "Free time for shopping, private airport drop.",
      },
    ],
  },
  {
    id: "seed-tour-singapore-signature",
    countryCode: "SG",
    slug: "singapore-signature-escape",
    name: "Singapore Signature Escape",
    subtitle: "Family-friendly itinerary with Sentosa & Universal Studios",
    destination: "Singapore",
    duration: "4 Nights / 5 Days",
    overview: `All-inclusive Singapore package with handpicked hotels near Orchard Road, Sentosa fun passes, and dedicated Travunited trip manager.`,
    description: "Singapore tour covering city highlights, Sentosa Island and Universal Studios.",
    price: 67999,
    basePriceInInr: 67999,
    allowAdvance: true,
    advancePercentage: 25,
    inclusions: "- 4 nights hotel stay with breakfast\n- Private airport transfers\n- Night safari tickets\n- Universal Studios & Sentosa pass",
    exclusions: "- Flights\n- Lunch/dinner unless specified\n- Visa fee (available as addon)",
    importantNotes: "Works best for families with kids 6+. Ask for stroller-friendly option or vegetarian meal plan.",
    heroImageUrl: "https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=1400&q=80",
    imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1504275107627-0c2ba7a43dba?w=1200&q=80",
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
    ],
    metaTitle: "Singapore Signature Escape | Travunited Tours",
    metaDescription: "5-day Singapore family itinerary with Sentosa highlights, Universal Studios and personalised concierge.",
    days: [
      {
        title: "Arrival & Night Safari",
        content: "Private transfer, check-in, evening at Night Safari with priority tram ride.",
      },
      {
        title: "City Circuit",
        content: "Merlion Park, Gardens by the Bay (Cloud Forest), Marina Bay Sands SkyPark.",
      },
      {
        title: "Sentosa Mega Fun",
        content: "Cable car ride, S.E.A Aquarium, SkyHelix, Wings of Time show.",
      },
      {
        title: "Universal Studios Adventure",
        content: "Full-day access with Express pass, meal vouchers included.",
      },
      {
        title: "Free & Easy + Departure",
        content: "Shopping on Orchard Road, optional River Safari add-on, private drop.",
      },
    ],
  },
];

async function seedCountries() {
  const countryMap = new Map();
  for (const country of COUNTRY_SEED) {
    const record = await prisma.country.upsert({
      where: { code: country.code },
      update: {
        name: country.name,
        region: country.region,
        flagUrl: country.flagUrl,
        isActive: true,
      },
      create: {
        code: country.code,
        name: country.name,
        region: country.region,
        flagUrl: country.flagUrl,
      },
    });
    countryMap.set(country.code, record);
  }
  return countryMap;
}

async function seedVisas(countryMap) {
  for (const visaData of VISA_SEED) {
    const country = countryMap.get(visaData.countryCode);
    if (!country) {
      console.warn(`⚠️  Country ${visaData.countryCode} missing, skipping visa ${visaData.slug}`);
      continue;
    }

    const payload = {
      countryId: country.id,
      name: visaData.name,
      slug: visaData.slug,
      subtitle: visaData.subtitle,
      category: visaData.category,
      isActive: visaData.isActive ?? true,
      isFeatured: visaData.isFeatured ?? false,
      priceInInr: visaData.priceInInr,
      processingTime: visaData.processingTime,
      stayDuration: visaData.stayDuration,
      validity: visaData.validity,
      entryType: visaData.entryType,
      overview: visaData.overview,
      eligibility: visaData.eligibility,
      importantNotes: visaData.importantNotes ?? null,
      rejectionReasons: visaData.rejectionReasons ?? null,
      whyTravunited: visaData.whyTravunited ?? null,
      statistics: visaData.statistics ?? null,
      heroImageUrl: visaData.heroImageUrl ?? null,
      metaTitle: visaData.metaTitle ?? null,
      metaDescription: visaData.metaDescription ?? null,
    };

    const visa = await prisma.visa.upsert({
      where: { slug: visaData.slug },
      update: payload,
      create: payload,
    });

    await prisma.visaDocumentRequirement.deleteMany({ where: { visaId: visa.id } });
    if (visaData.requirements?.length) {
      await prisma.visaDocumentRequirement.createMany({
        data: visaData.requirements.map((req, index) => ({
          visaId: visa.id,
          name: req.name,
          description: req.description ?? null,
          scope: req.scope,
          isRequired: req.isRequired ?? true,
          category: req.category ?? null,
          sortOrder: index,
        })),
      });
    }

    await prisma.visaFaq.deleteMany({ where: { visaId: visa.id } });
    if (visaData.faqs?.length) {
      await prisma.visaFaq.createMany({
        data: visaData.faqs.map((faq, index) => ({
          visaId: visa.id,
          category: faq.category ?? null,
          question: faq.question,
          answer: faq.answer,
          sortOrder: index,
        })),
      });
    }
  }
}

async function seedTours(countryMap) {
  for (const tourData of TOUR_SEED) {
    const country = tourData.countryCode ? countryMap.get(tourData.countryCode) : null;

    const payload = {
      name: tourData.name,
      slug: tourData.slug,
      subtitle: tourData.subtitle ?? null,
      destination: tourData.destination,
      duration: tourData.duration,
      overview: tourData.overview ?? null,
      description: tourData.description ?? null,
      price: tourData.price,
      basePriceInInr: tourData.basePriceInInr ?? tourData.price,
      inclusions: tourData.inclusions ?? null,
      exclusions: tourData.exclusions ?? null,
      importantNotes: tourData.importantNotes ?? null,
      itinerary: tourData.itinerary ? JSON.stringify(tourData.itinerary) : null,
      imageUrl: tourData.imageUrl ?? null,
      heroImageUrl: tourData.heroImageUrl ?? tourData.imageUrl ?? null,
      galleryImageUrls: tourData.galleryImages ? JSON.stringify(tourData.galleryImages) : null,
      isActive: tourData.isActive ?? true,
      isFeatured: tourData.isFeatured ?? false,
      allowAdvance: tourData.allowAdvance ?? false,
      advancePercentage: tourData.advancePercentage ?? null,
      metaTitle: tourData.metaTitle ?? null,
      metaDescription: tourData.metaDescription ?? null,
      countryId: country ? country.id : null,
    };

    const tour = await prisma.tour.upsert({
      where: { id: tourData.id },
      update: payload,
      create: { ...payload, id: tourData.id },
    });

    await prisma.tourDay.deleteMany({ where: { tourId: tour.id } });
    if (tourData.days?.length) {
      await prisma.tourDay.createMany({
        data: tourData.days.map((day, index) => ({
          tourId: tour.id,
          dayIndex: day.dayIndex ?? index + 1,
          title: day.title,
          content: day.content,
        })),
      });
    }
  }
}

async function main() {
  console.log("🌱 Seeding Travunited development data...");

  const passwordHash = await bcrypt.hash("Admin@123", 10);

  await prisma.user.upsert({
    where: { email: "travunited3@gmail.com" },
    update: {
      email: "travunited3@gmail.com",
    },
    create: {
      email: "travunited3@gmail.com",
      name: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      emailVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "ops@travunited.com" },
    update: {},
    create: {
      email: "ops@travunited.com",
      name: "Operations Lead",
      passwordHash,
      role: "STAFF_ADMIN",
      isActive: true,
      emailVerified: true,
    },
  });

  const countryMap = await seedCountries();
  await seedVisas(countryMap);
  await seedTours(countryMap);

  await prisma.visaType.upsert({
    where: { id: "seed-uae-tourist" },
    update: {},
    create: {
      id: "seed-uae-tourist",
      country: "United Arab Emirates",
      name: "Tourist Visa (30 Days)",
      description:
        "Single entry tourist visa for Indian passport holders. Processing time 5-7 working days.",
      price: 8999,
      processingTime: "5-7 Working Days",
      stayDuration: "30 Days",
      entryType: "Single",
      requirements: JSON.stringify([
        "Passport valid for at least 6 months",
        "Recent passport-sized photograph",
      ]),
      documents: JSON.stringify({
        perTraveller: ["Passport first & last page scan", "Photograph"],
        perApplication: ["Travel itinerary", "Hotel booking"],
      }),
      eligibility: JSON.stringify(["Indian passport holder", "Age 18+"]),
      isActive: true,
    },
  });

  await prisma.setting.upsert({
    where: { key: "GENERAL" },
    update: {
      value: {
        companyName: "Travunited Pvt Ltd",
        companyAddress:
          "91Springboard, 74 Tech Park, Bengaluru, Karnataka 560095",
        gstin: "29ABCDE1234F1Z5",
                supportEmail: "info@travunited.com",
        supportPhone: "+91 80 1234 5678",
      },
    },
    create: {
      key: "GENERAL",
      value: {
        companyName: "Travunited Pvt Ltd",
        companyAddress:
          "91Springboard, 74 Tech Park, Bengaluru, Karnataka 560095",
        gstin: "29ABCDE1234F1Z5",
                supportEmail: "info@travunited.com",
        supportPhone: "+91 80 1234 5678",
      },
    },
  });

  await prisma.setting.upsert({
    where: { key: "SYSTEM_FLAGS" },
    update: {
      value: {
        registrationsEnabled: true,
        maintenanceMode: false,
        maintenanceMessage: "",
      },
    },
    create: {
      key: "SYSTEM_FLAGS",
      value: {
        registrationsEnabled: true,
        maintenanceMode: false,
        maintenanceMessage: "",
      },
    },
  });

  const existingPosts = await prisma.blogPost.count();
  if (existingPosts === 0) {
    await prisma.blogPost.createMany({
      data: [
        {
          title: "Complete Guide to Schengen Visa for Indians in 2024",
          slug: "visa-guide-2024",
          excerpt: "Everything you need to know about applying for a Schengen visa, including documents, processing time, and tips for approval.",
          coverImage: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&q=80",
          content: "<p>The Schengen visa allows Indian citizens to travel to 27 European countries with a single visa. This comprehensive guide covers requirements, tips, and FAQs.</p>",
          category: "Visa Guide",
          readTime: "8 min read",
          isPublished: true,
          publishedAt: new Date("2024-03-15"),
        },
        {
          title: "Top 10 Things to Do in Dubai: A First-Timer's Guide",
          slug: "dubai-travel-tips",
          excerpt: "Discover the best attractions, dining experiences, and hidden gems in Dubai for an unforgettable trip.",
          coverImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80",
          content: "<p>Dubai offers futuristic skylines, desert adventures, and luxury shopping. Here are our top picks for first-time visitors.</p>",
          category: "Travel Tips",
          readTime: "6 min read",
          isPublished: true,
          publishedAt: new Date("2024-03-10"),
        },
        {
          title: "Essential Packing Checklist for International Travel",
          slug: "packing-checklist",
          excerpt: "Never forget important items again with this comprehensive packing checklist for your next international trip.",
          coverImage: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80",
          content: "<p>Stay organized and stress-free with our ultimate packing checklist covering travel documents, gadgets, and must-have essentials.</p>",
          category: "Travel Tips",
          readTime: "5 min read",
          isPublished: true,
          publishedAt: new Date("2024-03-05"),
        },
      ],
    });
  }

  await prisma.corporateLead.upsert({
    where: { id: "seed-lead-001" },
    update: {},
    create: {
      id: "seed-lead-001",
      companyName: "Innovent Solutions",
      contactName: "Aarav Desai",
      email: "aarav.desai@innovent.com",
      phone: "+91 98 7654 3210",
      message: "Need a partner for handling corporate visa requirements.",
      status: "NEW",
    },
  });

  console.log("✅ Seed completed.");
  console.log("Super Admin credentials:");
  console.log("  Email: travunited3@gmail.com");
  console.log("  Password: Admin@123");
  console.log("Staff Admin credentials:");
  console.log("  Email: ops@travunited.com");
  console.log("  Password: Admin@123");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


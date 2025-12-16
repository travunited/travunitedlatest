# Database Schema Verification

This document provides a comprehensive overview of all database tables and their structure as defined in the Prisma schema.

## ✅ Schema Status

- **Prisma Schema**: Valid ✓
- **Schema Format**: Formatted ✓

## 📋 All Database Tables

### Core User & Authentication Tables

1. **User** - User accounts (customers, staff, admins)
   - Fields: id, name, email, phone, passwordHash, role, isActive, emailVerified, etc.
   - Relations: applications, bookings, travellers, reviews, payments, auditLogs

2. **PasswordReset** - Password reset tokens and OTPs
   - Fields: id, userId, tokenHash, expiresAt, used, otp, otpExpiresAt, ip, userAgent
   - Relations: user

### Application & Booking Tables

3. **Application** - Visa applications
   - Fields: id, userId, visaTypeId, visaId, visaSubTypeId, country, visaType, status, totalAmount, currency, processedById, visaDocumentUrl, invoiceUrl, invoiceUploadedAt, invoiceUploadedByAdminId, notes, feedbackEmailSentAt
   - Relations: user, visa, visaSubType, processedBy, documents, travellers, reviews, payments

4. **ApplicationTraveller** - Link between applications and travellers
   - Fields: id, applicationId, travellerId, createdAt
   - Relations: application, traveller

5. **ApplicationDocument** - Documents uploaded for visa applications
   - Fields: id, applicationId, travellerId, requirementId, filePath, documentType, status, rejectionReason, fileSize
   - Relations: application, traveller, requirement

6. **Traveller** - Traveller profiles
   - Fields: id, userId, firstName, lastName, email, phone, dateOfBirth, passportNumber, passportExpiry
   - Relations: user, applications, bookings, documents

7. **Booking** - Tour bookings
   - Fields: id, userId, tourId, tourName, status, totalAmount, currency, travelDate, foodPreference, languagePreference, driverPreference, specialRequests, policyAccepted, policyAcceptedAt, policyAcceptedByUserId, policyVersion, policyAcceptedIp, policyAcceptedUserAgent, documents (JSON), processedById, voucherUrl, invoiceUrl, invoiceUploadedAt, invoiceUploadedByAdminId, notes, source
   - Relations: user, tour, processedBy, travellers, addOns, reviews, payments, bookingDocuments

8. **BookingTraveller** - Travellers in a booking
   - Fields: id, bookingId, travellerId, firstName, lastName, dateOfBirth, age, travellerType, gender, nationality, passportNumber, passportExpiry, passportIssuingCountry, passportFileKey, panNumber, aadharFileKey, isPassportRequired
   - Relations: booking, traveller, documents

9. **BookingDocument** - Documents uploaded for tour bookings
   - Fields: id, bookingId, travellerId, type, key, fileName, fileSize, status, rejectionReason, uploadedAt, updatedAt
   - Relations: booking, traveller

### Content Management Tables

10. **Country** - Countries
    - Fields: id, name, code (unique), region, flagUrl, isActive, createdAt, updatedAt
    - Relations: visas, tours

11. **Visa** - Visa types
    - Fields: id, countryId, name, slug (unique), subtitle, category, isActive, isFeatured, priceInInr, processingTime, stayDuration, validity, entryTypeLegacy, visaMode, entryType, stayType, visaSubTypeLabel, overview, eligibility, importantNotes, rejectionReasons, whyTravunited, statistics, heroImageUrl, sampleVisaImageUrl, metaTitle, metaDescription, stayDurationDays, validityDays, govtFee, serviceFee, currency
    - Relations: country, faqs, requirements, applications, subTypes

12. **VisaDocumentRequirement** - Document requirements for visas
    - Fields: id, visaId, name, description, scope (enum), isRequired, category, sortOrder
    - Relations: visa, documents

13. **VisaFaq** - FAQs for visas
    - Fields: id, visaId, category, question, answer, sortOrder
    - Relations: visa

14. **VisaSubType** - Visa subtypes
    - Fields: id, visaId, label, code, sortOrder
    - Relations: visa, applications

15. **VisaType** - Legacy visa type model
    - Fields: id, country, name, description, price, processingTime, stayDuration, entryType, requirements, documents, eligibility, isActive

16. **Tour** - Tour packages
    - Fields: id, countryId, name, slug (unique), subtitle, destination, duration, overview, price, basePriceInInr, description, shortDescription, originalPrice, currency, durationDays, durationNights, destinationCountry, citiesCovered (JSON), images (JSON), featuredImage, itinerary (JSON), inclusions (JSON), exclusions (JSON), importantNotes, difficultyLevel, groupSizeMin, groupSizeMax, availableDates (JSON), bookingDeadline, status, isActive, isFeatured, categoryId, imageUrl, heroImageUrl, galleryImageUrls, allowAdvance, advancePercentage, requiresPassport, requiredDocuments (JSON), childPricingType, childPricingValue, childAgeLimit, metaTitle, metaDescription, metaKeywords, canonicalUrl, ogTitle, ogDescription, ogImage, twitterTitle, twitterDescription, twitterImage, packageType, minimumTravelers, maximumTravelers, hotelCategories (JSON), customizationOptions (JSON), seasonalPricing (JSON), bookingPolicies, cancellationTerms, highlights (JSON), bestFor (JSON), destinationState, tourType, tourSubType, region, primaryDestination, regionTags (JSON), themes (JSON)
    - Relations: country, days, bookings, addOns

17. **TourDay** - Day-by-day itinerary for tours
    - Fields: id, tourId, dayIndex, title, content
    - Relations: tour

18. **TourAddOn** - Optional add-ons for tours
    - Fields: id, tourId, name, description, price, pricingType, isRequired, isActive, sortOrder
    - Relations: tour, bookingAddOns

19. **BookingAddOn** - Add-ons selected for a booking
    - Fields: id, bookingId, addOnId, name, pricingType, quantity, unitPrice, totalPrice, metadata (JSON)
    - Relations: booking, addOn

### Payment & Financial Tables

20. **Payment** - Payment records
    - Fields: id, userId, applicationId, bookingId, amount, currency, status, provider, method, razorpayOrderId, razorpayPaymentId, metadata (JSON)
    - Relations: user, application, booking

### Review & Rating Tables

21. **Review** - Customer reviews
    - Fields: id, type (enum), rating, title, comment, isVisible, notes, userId, applicationId, bookingId, reviewerName, imageKey, imageUrl, isFeatured, link
    - Relations: user, application, booking

### System & Admin Tables

22. **AuditLog** - System audit trail
    - Fields: id, timestamp, adminId, entityType (enum), entityId, action (enum), description, metadata (JSON)
    - Relations: admin

23. **Setting** - Application settings
    - Fields: key (primary), value (JSON), updatedAt

24. **Notification** - User notifications
    - Fields: id, userId, roleScope, type, title, message, data (JSON), link, channelEmail, channelInApp, channelPush, readAt, createdAt
    - Indexes: userId, userId+readAt, userId+createdAt

25. **UserNotificationSettings** - User notification preferences
    - Fields: id, userId (unique), emailEnabled (JSON), inAppEnabled (JSON), pushEnabled (JSON)

### Content & Marketing Tables

26. **BlogPost** - Blog posts
    - Fields: id, title, slug (unique), excerpt, coverImage, content, category, readTime, isPublished, isFeatured, publishedAt, metaTitle, metaDescription, focusKeyword, author

27. **TeamMember** - Team members
    - Fields: id, name, title, slug (unique), bio, email (unique), phone, photoKey, photoUrl, resumeKey, resumeUrl, socialLinks (JSON), isActive, isFeatured, sortOrder, createdBy, updatedBy
    - Indexes: isActive+isFeatured, sortOrder

### Lead & Contact Tables

28. **CorporateLead** - Corporate inquiries
    - Fields: id, companyName, contactName, email, phone, message, status (enum), internalNotes
    - Indexes: status, email, createdAt

29. **ContactMessage** - Contact form submissions
    - Fields: id, name, email, phone, subject, message
    - Indexes: email, createdAt

30. **CustomTourRequest** - Custom tour requests
    - Fields: id, name, email, phone, preferredDates, pax, budget, message, attachments (JSON), status (enum), internalNotes
    - Indexes: status, email, createdAt

### Career Tables

31. **CareerApplication** - Job applications
    - Fields: id, name, email, phone, location, positionTitle, experience, currentCompany, expectedCtc, coverNote, resumeUrl, status (enum), internalNotes
    - Indexes: status, positionTitle, email, createdAt

### Policy Tables

32. **SitePolicy** - Site policies (terms, privacy, etc.)
    - Fields: id, key (unique), title, content, version
    - Indexes: key

### Email Management Tables

33. **EmailEvent** - Email bounce/complaint tracking
    - Fields: id, type, email, details (JSON), count, lastOccurred, createdAt, updatedAt
    - Unique: email+type
    - Indexes: email, type
    - Table name: email_events

## 🔍 Verification Steps

### 1. Run Prisma Validation
```bash
npx prisma validate
```

### 2. Check Migration Status
```bash
npx prisma migrate status
```

### 3. Run Schema Verification Script
```bash
npx tsx scripts/verify-schema.ts
```

### 4. Run SQL Verification Script
```bash
psql -d your_database -f scripts/verify-database-schema.sql
```

## 📝 Important Notes

1. **Enums**: The schema uses several enums:
   - UserRole: CUSTOMER, STAFF_ADMIN, SUPER_ADMIN
   - DocScope: PER_TRAVELLER, PER_APPLICATION
   - VisaMode: EVISA, STICKER, VOA, VFS, ETA, OTHER
   - EntryType: SINGLE, DOUBLE, MULTIPLE
   - StayType: SHORT_STAY, LONG_STAY
   - ReviewType: VISA, TOUR
   - AuditEntityType: APPLICATION, BOOKING, USER, ADMIN, SETTINGS, REVIEW, PAYMENT, TEAM, OTHER
   - AuditAction: CREATE, UPDATE, DELETE, STATUS_CHANGE, DOC_VERIFY, DOC_REJECT, APPROVE, REJECT, HIDE, ANALYTICS_CHANGE, SETTING_CHANGE, RESET_PASSWORD, LOGIN, LOGOUT, EXPORT
   - CorporateLeadStatus: NEW, CONTACTED, PROPOSAL_SENT, WON, LOST
   - CareerApplicationStatus: NEW, REVIEWED, SHORTLISTED, REJECTED, ON_HOLD
   - CustomTourRequestStatus: NEW, REVIEWED, QUOTED, CLOSED

2. **JSON Fields**: Several tables use JSON fields:
   - Booking.documents
   - Booking.requiredDocuments
   - Payment.metadata
   - Review.data
   - Notification.data
   - UserNotificationSettings.emailEnabled, inAppEnabled, pushEnabled
   - Tour: citiesCovered, images, itinerary, inclusions, exclusions, availableDates, hotelCategories, customizationOptions, seasonalPricing, highlights, bestFor, regionTags, themes
   - CustomTourRequest.attachments
   - BookingAddOn.metadata
   - AuditLog.metadata
   - TeamMember.socialLinks
   - EmailEvent.details

3. **Indexes**: Key indexes are defined for:
   - Foreign keys
   - Frequently queried fields (email, status, createdAt)
   - Composite indexes for common query patterns

4. **Relations**: All foreign key relationships are properly defined in the schema.

## ✅ Verification Checklist

- [ ] All 33 tables exist in database
- [ ] All columns match Prisma schema
- [ ] All foreign keys are properly set up
- [ ] All indexes are created
- [ ] All enums are defined
- [ ] No missing migrations
- [ ] Database constraints match schema

## 🚨 Common Issues to Check

1. **Missing Columns**: Check if all columns from Prisma schema exist in database
2. **Type Mismatches**: Verify data types match (especially JSON fields)
3. **Missing Indexes**: Ensure all indexes are created
4. **Foreign Key Issues**: Verify all foreign key constraints
5. **Enum Values**: Check if all enum values are present
6. **Default Values**: Verify default values are set correctly


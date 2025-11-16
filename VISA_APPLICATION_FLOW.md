# Visa Application - Customer Workflow Implementation

## Overview

Complete 6-step visa application workflow with guest support, localStorage auto-save, document uploads, and payment integration.

## User Flow

### Path A - From Visa Detail Page
1. User clicks "Apply Now" on visa detail page
2. Navigates to `/apply/visa/[country]/[type]`
3. Starts at Step 1 with pre-filled country and visa type

### Guest Behavior
- ✅ User can start application as guest
- ✅ Progress auto-saved to localStorage
- ✅ If user returns on same device/browser, flow resumes
- ✅ No server-side draft until account created
- ✅ At Step 6 (Payment), user must login/signup

## 6-Step Visa Wizard

### Step 1: Select Visa
- Country (pre-filled from detail page)
- Visa Type (pre-filled from detail page)
- Travel Date (optional)
- Trip Type (optional: Tourism, Business, Family, Other)
- Auto-saves to localStorage

### Step 2: Primary Applicant & Contact
- Full Name *
- Email * (may be used for account creation)
- Mobile Number (optional)
- Address (optional)
- For logged-in users: Auto-fills from profile, editable
- Auto-saves to localStorage

### Step 3: Travellers
- Support for multiple travellers
- For each traveller:
  - First Name (as per passport) *
  - Last Name (as per passport) *
  - Date of Birth *
  - Gender *
  - Passport Number *
  - Passport Issue Date *
  - Passport Expiry Date *
  - Nationality * (defaults to "Indian")
  - Current City (optional)
- Add/Remove traveller buttons
- If logged in: Can pick from saved Traveller Profiles (future feature)
- Auto-saves to localStorage

### Step 4: Documents
- **Per-Traveller Documents:**
  - Passport scan *
  - Photo *
- **Per-Application Documents:**
  - Flight tickets *
  - Hotel booking *
- Upload rules:
  - Formats: JPG, JPEG, PNG, PDF
  - Max size: 20MB per file
  - Preview available
  - Can remove and re-upload
- All required documents must be uploaded before proceeding
- Auto-saves to localStorage (metadata only, files stored in memory)

### Step 5: Review & Confirm
- Read-only summary:
  - Visa details
  - Primary contact
  - List of travellers
  - Document checklist
  - Final price (tax included)
- Can navigate back to edit any section
- "Confirm & Continue to Payment" button:
  - Validates all required fields
  - If guest: Redirects to signup/login
  - If logged in: Saves to server and proceeds to Step 6

### Step 6: Signup/Login & Payment
- **If guest:**
  - Shows auth box with:
    - "Create Account" button (pre-fills email)
    - "Login" button
  - After login/signup: Application linked to account
- **Payment:**
  - Razorpay checkout integration
  - Full amount payment
  - On success:
    - Application status: SUBMITTED
    - Payment status: Paid
    - Redirect to Thank You page
    - Email confirmation (TODO)
  - On failure/cancel:
    - Application status: PAYMENT_PENDING
    - User can retry payment from dashboard

## Application Statuses

- **DRAFT** - Started but not reached payment, or reached step 5 but never confirmed
- **PAYMENT_PENDING** - Payment attempt failed or not completed
- **SUBMITTED** - Paid successfully, waiting for processing
- **IN_PROCESS** - Admin has started working on it
- **APPROVED** - Visa issued & uploaded
- **REJECTED** - Visa rejected, with reason
- **EXPIRED** - Draft expired (7 days) or Payment Pending expired (48 hours)

## Expiry Rules

### Draft Applications
- Auto-expire after 7 days of inactivity
- Not shown in active list after expiry
- Can be viewed in "Expired" section (optional)

### Payment Pending
- Auto-expire after 48 hours if no successful payment
- User can retry payment before expiry

### Expired Applications
- Status changed to "EXPIRED"
- Hidden from main dashboard view
- Can be shown in separate "Expired" section

## Documents After Submission

### After Payment
- Application is fully locked
- User cannot change details
- Documents are submitted for review

### Document Rejection
- Admin can reject specific documents
- Document status set to "REJECTED" with note
- User sees rejected documents in Dashboard
- User can re-upload only rejected documents
- Application remains in "SUBMITTED" or "IN_PROCESS"

## Final Visa Delivery

### When Admin Marks Approved
- Admin uploads final visa PDF/image
- System triggers:
  - Email: "Your visa is approved. Download from dashboard."
  - Dashboard shows download section
- User can:
  - View & download visa document
  - Leave visa service review (future feature)

## Technical Implementation

### localStorage Management
- Key: `travunited_visa_draft`
- Auto-saves on every step change
- Stores all form data except actual file objects
- File metadata stored (name, size, type, preview)
- Expires after 7 days
- Cleared after successful submission

### API Routes
- `POST /api/applications/create` - Create application (requires auth)
- `GET /api/applications` - List user's applications
- `GET /api/applications/[id]` - Get application details
- `POST /api/applications/[id]/documents` - Upload document
- `POST /api/applications/[id]/documents/reupload` - Re-upload rejected document
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/applications/expire` - Expire old applications (cron job)

### Document Storage
- Files uploaded to MinIO (S3-compatible)
- Path: `applications/[applicationId]/[travellerId]/[documentType]-[timestamp]-[filename]`
- Document records stored in database with file path
- Status tracking: PENDING, APPROVED, REJECTED

### Payment Integration
- Razorpay order creation
- Payment status tracking
- Application status updates based on payment
- Retry payment capability

## Dashboard Features

### Application List
- Shows all non-expired applications
- Status badges with colors
- Quick view of key details
- Link to full application details

### Application Detail Page
- Complete application information
- Document list with status
- Re-upload rejected documents
- Download approved visa
- Payment retry for pending payments

## Next Steps

1. ✅ Complete 6-step flow
2. ✅ localStorage auto-save
3. ✅ Document upload
4. ✅ Payment integration structure
5. ⏳ Integrate actual Razorpay SDK
6. ⏳ Email notifications
7. ⏳ Traveller Profiles (save for reuse)
8. ⏳ Application expiry cron job
9. ⏳ Review/rating system


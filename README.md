# EVORA – Made to Celebrate
> **B.Tech Capstone Project: AI-Assisted Event Planning & Management Platform**

---

## 🌟 1. Project Overview

**EVORA** is a multi-role web platform designed to streamline celebration planning, artisan vendor hiring, operational volunteer dispatch, and administrative platform governance. Built with modern full-stack web standards, EVORA provides a unified, role-based workspace for four distinct user personas:

1. **User / Event Organizer**: Designs events, manages budgets, browses services, and tracks quotes/proposals.
2. **Vendor Partner**: Showcases service catalogues, responds to client inquiries with commercial proposals, and tracks realized revenue.
3. **Volunteer**: Operates on-ground shifts, checks assigned duty rosters, and submits completion verification.
4. **Platform Administrator**: Oversees platform health, verifies vendors, monitors bookings, and dispatches volunteers to events.

---

## 🛠️ 2. Technology Stack

- **Frontend**: React 19, Vite 8, React Router v6, Axios, Lucide React, Modern CSS3
- **Backend**: Node.js v20+, Express.js, JWT (`jsonwebtoken`), `bcryptjs`, CORS
- **Database**: MongoDB (Mongoose ODM)
- **Architecture**: Decoupled Client-Server REST Architecture

---

## 👥 3. Multi-Role Demo Credentials

All seed accounts come pre-loaded in MongoDB via `npm run seed` in `evora-backend/`.

| Role | Email | Password | Pre-loaded Features |
|---|---|---|---|
| **Organizer** | `organizer@evora.com` | `Password123!` | 2 active events, budget allocations, service requests |
| **Vendor** | `vendor@evora.com` | `Password123!` | 3 published photography/video packages, incoming inquiries |
| **Volunteer** | `volunteer@evora.com` | `Password123!` | On-ground duties, digital credential pass |
| **Administrator** | `admin@evora.com` | `Password123!` | Complete audit console, user toggles, volunteer dispatcher |

---

## 🔄 4. End-to-End Core Workflows

1. **Event Creation & Vendor Booking**: Organizer logs in → Creates a new event → Navigates to **Browse Vendors** → Submits a booking request.
2. **Vendor Inquiry & Commercial Proposal**: Vendor logs in → Views **Event Requests** → Submits pricing breakdown & deliverables proposal.
3. **Proposal Acceptance & Financial Ledger**: Organizer reviews vendor proposal in **Bookings Tracker** → Accepts quote → Expense automatically syncs with event budget.
4. **Duty Dispatch & Execution**: Admin dispatches a volunteer to an upcoming celebration in **Manage Volunteers** → Volunteer views shift roster & marks duty completed.
5. **Platform Governance**: Admin monitors platform volume, audits user roles, suspends/reinstates accounts, and awards quality badges to vendors.

---

## 🚀 5. Quick Start Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas Cloud Database (configured in `evora-backend/.env`) or local MongoDB running on `mongodb://127.0.0.1:27017`

### Step 1: Backend Setup
```bash
cd evora-backend
npm install
npm run seed     # Seeds demo accounts and initial celebration data
npm start        # Starts server on http://localhost:5000
```

### Step 2: Frontend Setup
```bash
cd ../evora-frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

---

## 📡 6. REST API Endpoints Overview

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Account registration (role-scoped) |
| `POST` | `/api/auth/login` | Public | Authenticates credentials & returns JWT |
| `GET/PUT` | `/api/auth/me` | Private | Retrieves or updates authenticated profile |
| `GET/POST` | `/api/events` | Organizer / Admin | Event management |
| `GET/POST` | `/api/services` | Vendor / Public | Service catalogue management |
| `GET/POST` | `/api/bookings` | Multi-role | Inquiries, booking orders & status updates |
| `POST` | `/api/bookings/:id/proposal` | Vendor | Transmit commercial proposals |
| `GET/POST` | `/api/expenses` | Organizer | Budget line-item tracking |
| `GET/POST` | `/api/tasks` | Volunteer / Admin | Shift assignments & completion reporting |
| `GET` | `/api/admin/stats` | Admin | Real-time platform KPI metrics |
| `GET/PUT` | `/api/admin/users` | Admin | User audit & suspension controls |
| `POST` | `/api/reviews` | Organizer | Submit vendor review & star rating |
| `GET` | `/api/reviews` | Private | Retrieve artisan ratings & feedback |
| `POST` | `/api/auth/send-otp` | Public | Dispatches 6-digit email verification passcode |
| `POST` | `/api/auth/verify-otp` | Public | Validates OTP and issues session token |
| `POST` | `/api/ai/chat` | Private | 1. EVORA AI Conversational Chatbot Assistant |
| `POST` | `/api/ai/budget` | Private | 2. AI Budget Assistant with Overrun Alerts & Cheaper Alternatives |
| `POST` | `/api/ai/vendors` | Private | 3. AI Vendor Recommendation & Profile Matching |
| `POST` | `/api/ai/food` | Private | 4. AI Food Planner & Surplus Waste Prevention Calculation |
| `POST` | `/api/ai/invitation` | Private | 5. AI Invitation Generator (Royal/Modern/Hindi) |
| `POST` | `/api/ai/checklist` | Private | 6. AI Preparation Checklist & Milestone Tracker |
| `POST` | `/api/charity/donations` | Organizer | Surplus celebration food listing for volunteer pickup |
| `GET` | `/api/charity/donations` | Multi-role | Audit community meals & dispatch volunteer pickups |

---

## 🍲 7. Charity AI (Surplus Food Donation & Rescue Engine)

### Overview
When an event concludes with surplus food (e.g. 500 meals leftover from a 1000-guest wedding in Hyderabad), **Charity AI** empowers organizers to rescue and redirect hot, fresh food to verified nearby NGOs, orphanages, old-age homes, and community shelters before it spoils.

### User Flow
1. **Organizer Launch**: From the Event Dashboard, click **"Charity AI / Donate Food"** (or open the **AI Planning Suite**).
2. **Surplus Specification (Stepper Step 1)**: Enter event celebration details, venue address, food items with vegetarian / non-vegetarian designations, total quantity, safe-until expiration time, packaging readiness, and coordinator phone.
3. **Geospatial Discovery & Deterministic AI Ranking (Stepper Step 2)**:
   - Evaluates nearby charities using a MongoDB `$geoNear` 2dsphere spatial index.
   - Computes a deterministic multi-factor match score (0–100%) incorporating:
     - **Transit Distance**: Scaled proximity score and urban traffic transit turnaround calculation (~3 min/km + 25 min turnaround).
     - **Cooked Food Compatibility**: Prioritizes shelters equipped to accept hot meals vs packaged goods.
     - **Capacity Matching**: Evaluates shelter's daily capacity against donation volume.
     - **Food Safety Margin**: Flags critical time alerts if safe consumption limits approach transit turnaround thresholds.
   - LLM Layer generates a concise, contextual justification for why the top matches are recommended.
4. **Interactive Leaflet / OpenStreetMap**: Visualizes the venue pin, nearby orphanages/shelters, distance radii, and top recommendations with interactive selection popups.
5. **Dispatch & Multi-Charity Request (Stepper Step 3)**: Dispatches donation requests to selected shelters with automated in-app alerts sent to charity coordinators and volunteers.
6. **Volunteer & Charity Portal (`/volunteer/donations`)**: On-ground drivers and shelters review incoming requests, specify estimated arrival time, and click **Accept Pickup** or **Decline**.
7. **Delivery Impact Tracking & Zero-Waste Receipt**: Status updates from `pending` → `accepted` → `picked_up` → `delivered`. Once marked delivered, organizers receive an impact summary highlighting the charity partner, timestamp, and estimated number of people nourished.
8. **Admin Governance (`/admin/charities`)**: Administrators can add verified shelters or audit and revoke charity listings.

### Charity AI REST Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/charity-ai/surplus` | Organizer / Admin | Validates surplus food details, geocodes venue address, and evaluates safety window |
| `GET` | `/api/charity-ai/nearby` | Authenticated | Geospatial 2dsphere query returning nearby shelters (`lat`, `lng`, `radius`, `type`) |
| `POST` | `/api/charity-ai/recommend` | Authenticated | Deterministic scoring + AI rationale generation for top matched shelters |
| `POST` | `/api/charity-ai/request` | Organizer / Admin | Submits surplus donation requests to one or multiple charities |
| `PATCH` | `/api/charity-ai/request/:id/status` | Volunteer / Admin / User | Updates status (`accepted`, `declined`, `picked_up`, `delivered`) with impact calculation |
| `GET` | `/api/charity-ai/history/:eventId` | Authenticated | Retrieves donation history and cumulative people-served metrics |
| `GET` | `/api/charity-ai/incoming` | Volunteer / Admin | Lists incoming requests for charity and volunteer coordination |
| `GET` | `/api/charity-ai/request/:id` | Authenticated | Retrieves single donation request record with complete status timeline |
| `GET` | `/api/charity-ai/charities` | Authenticated | Lists registered charities with category and verification filters |
| `POST` | `/api/charity-ai/charities` | Admin | Registers a new verified charity or shelter |
| `PATCH` | `/api/charity-ai/charities/:id` | Admin | Updates charity details or toggles verification status |

### Seeding Sample Charities
To populate the database with 14 sample Hyderabad charities (clearly marked as dummy data across Banjara Hills, Hitec City, Begumpet, Secunderabad, Charminar, etc.):
```bash
cd evora-backend
npm run seed:charities
```


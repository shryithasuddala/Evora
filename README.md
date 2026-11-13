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

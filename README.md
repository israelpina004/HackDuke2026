# 🏥 Handoff

**Closing the gap between the hospital bed and the home bed.**

Handoff transforms complex hospital discharge papers into clear, multilingual, voice-enabled care plans. 40% of discharge instructions are misunderstood by patients — Handoff ensures no family is left guessing.

Built at **HackDuke 2026**.

---

## The Problem

Every year, 20% of patients experience adverse events within 30 days of discharge — and 79% of those are preventable. Discharge summaries are 20-page walls of medical jargon, and the family caregivers and home aides who need them most are often non-native English speakers with no medical background.

## The Solution

Upload a discharge PDF. Handoff uses **Google Gemini 2.5 Flash** to parse it into a structured, translated care plan, **ElevenLabs** to read it aloud in the caregiver's language, and a shared dashboard to keep the entire care team on the same page.

---

## Features

### 📄 PDF → Structured Care Plan
Upload a discharge PDF or photo. Gemini extracts medications, care instructions, red flags, and contact info into structured data — each tagged with a confidence level (High / Medium / Low) so caregivers know what to double-check.

### 🌍 6-Language Support
The entire platform — UI, care plans, audio briefings, messaging, and even the Auth0 login page — works in **English, Spanish, Chinese, Korean, Hindi, and Russian**. Translations are powered by Gemini and cached for instant access.

### 🔊 Audio Briefings
One tap generates a warm, conversational daily briefing read aloud by ElevenLabs in the caregiver's language. Covers medications, instructions, and red flags. Cached so it plays instantly on repeat visits.

### 💬 Coordinator–Caregiver Messaging
Built-in chat between caregivers and coordinators with automatic translation. When an AI extraction has low confidence, the app surfaces it immediately and lets caregivers message the coordinator for clarification.

### 📅 Calendar Export
Export medications and reminders as `.ics` files — one tap to add daily recurring reminders to Google Calendar, Apple Calendar, or Outlook. Generated entirely client-side from the care plan data.

### 🔑 Invite Code Sharing
Coordinators share a 6-character invite code. Caregivers enter it to link to the care plan — no email exchange or complex setup required.

### 💡 "Explain / Elaborate"
Each section of the care plan has an Explain button. Gemini breaks down medical jargon into plain-language explanations in the caregiver's language, using the patient's full context.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, React 19) |
| **Deployment** | Cloudflare Workers via OpenNext |
| **Auth** | Auth0 (`@auth0/nextjs-auth0` v4) |
| **AI — Logic & OCR** | Google Gemini 2.5 Flash |
| **AI — Voice** | ElevenLabs (Multilingual v2) |
| **Database** | MongoDB Atlas (Mongoose) |
| **UI** | Inline styles (Safari-compatible), Lucide icons |

---

## Architecture

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│   Browser    │──────▶│  Cloudflare  │──────▶│  MongoDB Atlas  │
│  (React 19)  │       │   Workers    │       │  (Users, Plans, │
└─────────────┘       │  (Next.js)   │       │   Messages)     │
                      └──────┬───────┘       └─────────────────┘
                             │
                 ┌───────────┼───────────┐
                 ▼           ▼           ▼
          ┌──────────┐ ┌──────────┐ ┌─────────┐
          │  Gemini  │ │ElevenLabs│ │  Auth0  │
          │  2.5     │ │   TTS    │ │         │
          │  Flash   │ │          │ │         │
          └──────────┘ └──────────┘ └─────────┘
```

### Data Models

**User** — `auth0Id`, `name`, `phone`, `role` (Coordinator / Caregiver), `preferredLanguage`

**CarePlan** — `coordinatorId`, `caregiverIds[]`, `inviteCode`, `patientName`, `medications[]` (with confidence), `careInstructions[]`, `redFlags[]`, `documents[]`, `contactInfo`, `notes`, translation/audio caches

**Message** — `carePlanId`, `senderId`, `receiverId`, `content`, `translations` cache, `read` status

---

## User Flows

### Coordinator
1. Sign up → Onboarding (name, phone, language, role) → Dashboard
2. Upload discharge PDF → Gemini parses → Care plan created with invite code
3. Share invite code with caregiver
4. Edit plan, view linked caregivers, respond to messages

### Caregiver
1. Sign up → Onboarding → Enter invite code → Linked to care plan
2. View care plan in preferred language
3. Listen to audio briefing, export calendar reminders
4. Use "Explain" for clarity, message coordinator with questions

---

## API Routes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/onboarding` | Save user profile (name, phone, role, language) |
| POST | `/api/link-caregiver` | Link caregiver to plan via invite code |
| POST | `/api/parse-pdf` | Upload PDF → Gemini extraction → create care plan |
| PUT | `/api/plan/[planId]` | Edit care plan (Coordinator only) |
| POST/GET | `/api/plan/[planId]/messages` | Send & retrieve translated messages |
| POST | `/api/translate-plan` | Translate entire care plan to target language |
| POST | `/api/generate-audio` | Generate ElevenLabs audio briefing |
| POST | `/api/explain-plan-section` | AI explanation of a plan section |
| GET | `/api/documents/[planId]/[docIndex]` | Serve uploaded document |
| POST | `/api/export-ics` | Generate `.ics` calendar file |

---

## Getting Started

This app is fully deployed at https://hackduke2026.handoff.workers.dev - no setup required! Just create an account where indicated and navigate to your dashboard to create your account!

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout (i18n, fonts)
│   ├── middleware.ts             # Auth0 middleware + locale injection
│   ├── onboarding/page.tsx       # New user onboarding
│   ├── link/page.tsx             # Caregiver invite code entry
│   ├── dashboard/
│   │   ├── page.tsx              # Role-based dashboard
│   │   └── plan/[planId]/
│   │       ├── page.tsx          # Full care plan view
│   │       └── messages/page.tsx # Messaging thread
│   └── api/                      # 10 API routes (see above)
├── components/
│   ├── CoordinatorDashboard.tsx  # Upload, manage plans, share codes
│   ├── CaregiverDashboard.tsx    # View plans, upload supplemental docs
│   ├── CarePlanCard.tsx          # Full plan detail (meds, flags, audio, calendar)
│   ├── AppHeader.tsx             # Navigation header
│   └── LanguageSwitcher.tsx      # Global language toggle (6 languages)
├── models/                       # Mongoose schemas (User, CarePlan, Message)
├── translations/                 # i18n strings + React language context
└── lib/                          # Auth0 client, MongoDB connection
```

---

## Internationalization

Handoff provides end-to-end multilingual support:

| Layer | How |
| :--- | :--- |
| **UI strings** | React Context with 140+ translated keys per language |
| **Care plan content** | Gemini translates medications, instructions, red flags on demand |
| **Audio briefings** | ElevenLabs Multilingual v2 generates native-language audio |
| **Messaging** | Auto-translated between coordinator and caregiver |
| **Auth0 login** | `ui_locales` parameter injected via middleware |
| **Language switcher** | Persistent cookie, flag emoji selector, available on every page |

Supported: 🇺🇸 English · 🇲🇽 Spanish · 🇨🇳 Chinese · 🇰🇷 Korean · 🇮🇳 Hindi · 🇷🇺 Russian

---

## Acknowledgments

Built with [Next.js](https://nextjs.org), [Auth0](https://auth0.com), [Google Gemini](https://ai.google.dev), [ElevenLabs](https://elevenlabs.io), [MongoDB Atlas](https://www.mongodb.com/atlas), and [Cloudflare Workers](https://workers.cloudflare.com).

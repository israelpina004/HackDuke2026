# 🏥 Master Build Plan: Care Handoff Copilot
**Tagline:** Closing the gap between the hospital bed and the home bed.

### 🚨 1. The Core Problem
* **The Gap:** 20% of patients experience adverse events within 30 days of discharge; 79% are preventable.
* **The Pain:** 20-page discharge summaries are "medical jargon walls." Home aides and family caregivers (often non-native speakers) lack a single source of truth.

### 💡 2. The Solution
A multimodal AI platform that transforms static medical PDFs into a **living, shared, voice-enabled care plan.** It uses **Gemini** to "think" and translate jargon, **ElevenLabs** to "speak" conversationally, and a **Shared Dashboard** to keep the care team synchronized.

---

### 🛠️ 3. The Optimized Tech Stack
| Layer | Technology | Prize Track Target |
| :--- | :--- | :--- |
| **Frontend** | Next.js (React) + Tailwind CSS | Standard High-Perf Web |
| **Deployment** | Cloudflare Pages + Workers | **Best AI App (Cloudflare)** |
| **Auth** | Auth0 | **Best Use of Auth0** |
| **AI (Logic/OCR)** | Google Gemini 1.5 Flash | **Best Use of Gemini API** |
| **AI (Voice)** | ElevenLabs API | **Best Use of ElevenLabs** |
| **Database** | MongoDB Atlas | **Best Use of MongoDB Atlas** |
| **Sharing** | Web Share API | Interoperability/UX |

---

### 🚀 4. Core Features & Implementation

#### Phase A: The "Paperwork to Plan" Engine (Gemini OCR)
* **Direct Extraction:** Coordinator uploads a photo/PDF of discharge papers. Gemini 1.5 Flash parses the jargon into structured JSON (Medications, Follow-ups, Red Flags).
* **AI Disclaimer:** Persistent footer stating: *"AI-generated summary. Verify with official medical documents before acting."*

#### Phase B: The "Invite Code" Team Linking 
* **Generation:** When a Coordinator uploads a plan, MongoDB generates a random 6-character `inviteCode` (e.g., "X7B9TQ").
* **Onboarding:** When a Caregiver signs up, the app sees they have no assigned care plan and presents a prompt: *"Enter Invite Code from your Coordinator."*
* **Linking:** Entering the code links the Caregiver's Auth0 `user_id` to that specific Care Plan in MongoDB.

#### Phase C: Conversational Voice & Multilingual Access
* **The Script:** A second Gemini call converts the JSON task list into a warm, conversational script (e.g., *"Good morning, here is today's care schedule..."*).
* **Audio on Demand:** ElevenLabs reads the script aloud **only** when the user clicks "Play Daily Briefing." 

#### Phase D: Clarity & Sharing (UX Features)
* **The "Unclear" Loop:** A button that triggers Gemini to re-explain a specific medical task using a 5th-grade reading level or simple analogy.
* **WhatsApp/IMS Export:** A native "Share" button via the Web Share API to send a concise text summary to family group chats.

---

### 🚰 5. The "Plumbing" Blueprint (Auth & Data)

**The Auth0 "Dynamic Default" Shortcut:**
Using a single Post-Login Action to handle roles without complex database writes.
* If a user logs in with no roles, Auth0 dynamically injects `["Caregiver"]` into their token.
* Next.js middleware uses this token to block Caregivers from the `/upload` route.

**The MongoDB "CarePlan" Schema:**
Unified embedded document, avoiding relational complexity.
* `coordinatorId`: String (Auth0 ID)
* `caregiverIds`: Array of Strings (Auth0 IDs added via Invite Code)
* `inviteCode`: String (Unique 6-character string)
* `patientName`: String
* `medications`: Array of Objects (Name, Dosage, Frequency)
* `redFlags`: Array of Strings

---

### 📅 6. The 36-Hour Sprint Timeline

| Time | Goal | Focus |
| :--- | :--- | :--- |
| **Hours 0–4** | **Foundation** | Initialize Next.js, Auth0, MongoDB. Deploy to Cloudflare. Configure Auth0 Action. |
| **Hours 4–12** | **The Brain & DB** | Build Gemini PDF Parser. Save JSON to MongoDB & generate `inviteCode`. |
| **Hours 12–18** | **The Link** | Build Caregiver "Enter Invite Code" screen & API route for linking. |
| **Hours 18–24** | **The Dashboard** | Build UI. Implement Task List, "Unclear" logic, and Web Share API. |
| **Hours 24–30** | **The Voice** | Integrate ElevenLabs. Create Gemini prompt for conversational script. |
| **Hours 30–36** | **Polish & Pitch** | Bug fixes, UI styling, recording demo video. |

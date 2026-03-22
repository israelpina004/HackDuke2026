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
| **AI (Logic/OCR)** | Google Gemini 2.5 Flash | **Best Use of Gemini API** |
| **AI (Voice)** | ElevenLabs API | **Best Use of ElevenLabs** |
| **Database** | MongoDB Atlas | **Best Use of MongoDB Atlas** |
| **Sharing** | Web Share API | Interoperability/UX |

---

### 🚀 4. Core Features & Implementation

#### Phase A: The "Paperwork to Plan" Engine (Gemini OCR)
* **Direct Extraction:** Coordinator uploads a photo/PDF of discharge papers. Gemini 1.5 Flash parses the jargon into structured JSON.
* **Confidence Scoring:** The AI tags each extracted medication or task with a `High`, `Medium`, or `Low` confidence rating. 
* **AI Disclaimer:** Persistent footer stating: *"AI-generated summary. Verify with official medical documents before acting."*

#### Phase B: The "Invite Code" Team Linking 
* **Generation:** When a Coordinator uploads a plan, MongoDB generates a random 6-character `inviteCode` (e.g., "X7B9TQ").
* **Onboarding:** When a Caregiver signs up, the app sees they have no assigned care plan and presents a prompt: *"Enter Invite Code from your Coordinator."*
* **Linking:** Entering the code links the Caregiver's Auth0 `user_id` to that specific Care Plan in MongoDB.

#### Phase C: Conversational Voice & Multilingual Access
* **The Script:** A second Gemini call converts the JSON task list into a warm, conversational script (e.g., *"Good morning, here is today's care schedule..."*).
* **Audio on Demand:** ElevenLabs reads the script aloud **only** when the user clicks "Play Daily Briefing." 

#### Phase D: Clarity & Scheduling
* **The "Unclear" Loop:** A button that triggers Gemini to re-explain a specific medical task using simple analogies.
* **Vertical Timeline Feed:** Daily schedule presented as a vertical scrolling timeline explicitly designed for mobile readability. Gemini pre-populates it, but caregivers can manually edit/reschedule.
* **Calendar/WhatsApp Export:** Ability to generate and download `.ics` files, and share quick updates via Web Share API.

#### Phase E: Coordinator-Caregiver Messaging
* **Resolution Modals:** If an extracted task has "Low/Medium" confidence (due to poor handwriting or contradiction), the UI presents a modal explaining the uncertainty and immediately offers an instant-message input field to contact the Coordinator.
* **Platform Messaging:** A built-in chat system allowing Caregivers to message the primary Care Coordinator without leaving the app.

#### Phase F: "Handoff Without Borders" (i18n & Localization)
* **Clinical Translation Mapping:** When parsing the PDF, Gemini translates all medical jargon and calendar events directly into the Caregiver's native language (English, Spanish, Chinese, Korean, Hindi, Russian).
* **Multilingual Audio:** ElevenLabs uses `eleven_multilingual_v2` to read the daily briefing natively in the target language.
* **UI Dictionary Context:** Next.js React Context manages translations for hardcoded app UI elements (buttons, headers), proving total platform accessibility.

---

### 🚰 5. The "Plumbing" Blueprint (Auth & Data)

**The MongoDB Role Strategy (Replacing Auth0 Actions):**
Instead of wrestling with Auth0 rule injections or custom JWT claims, we use a single source of truth:
* We capture basic Email/Password via Auth0.
* Upon login, our Next.js Server Layouts query MongoDB for their profile.
* If a User doesn't exist, we forcibly route them to `/onboarding` to capture their Name, Phone Number, and explicitly set their **Role** (Caregiver vs Coordinator).
* To block Caregivers from sensitive routes (like `/upload`), Server Components simply check `dbUser.role === 'Coordinator'`.

**The MongoDB Schemas:**
To support the new features, we expand to three core embedded philosophies:
1. `User`: `auth0Id`, `name`, `phone`, `role`, and `preferredLanguage`.
2. `CarePlan`: Contains `coordinatorId`, `caregiverIds`, `patientName`, `medications` (with `confidence` scores), `redFlags` (with `confidence` scores), and `calendarEvents` (Title, time, frequency).
3. `Message`: Stores `senderId`, `receiverId`, `content`, and timestamp for the direct messaging feature.

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

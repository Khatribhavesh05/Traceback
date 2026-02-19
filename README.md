<div align="center">

<img src="screenshots/home.png" alt="Traceback Banner" width="100%" style="border-radius: 12px;" />

# 🔍 Traceback

**A full-stack Lost & Found platform built for privacy, structure, and trust.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Firebase-orange?style=for-the-badge&logo=firebase)](https://studio--studio-5844244304-a603d.us-central1.hosted.app)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repo-black?style=for-the-badge&logo=github)](https://github.com/khatribhavesh05/Traceback)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Backend-yellow?style=for-the-badge&logo=firebase)](https://firebase.google.com/)

</div>

---

## 🧭 What is Traceback?

Recovering lost belongings is stressful — and most systems make it worse. Traceback is a structured, secure web application that makes it easy to **report, match, claim, and return lost items** — without exposing anyone's personal information prematurely.

Built as a full-stack learning project, it explores real-world challenges like **authentication, Firestore security rules, claim state machines, AI-assisted matching, and secure physical handovers.**

---

## 📸 Screenshots

| Home | Dashboard |
|------|-----------|
| ![Home](screenshots/home.png) | ![Dashboard](screenshots/dashboard.png) |

| Report Found Item | Item Details |
|-------------------|--------------|
| ![Form](screenshots/form.png) | ![Item Details](screenshots/item_details.png) |

---

## ✨ Features

### 🔐 Authentication & Dashboard
- Secure sign-in via **Firebase Authentication**
- Personal dashboard to manage all reports and claims in one place

### 📋 Lost & Found Reporting
- Separate, structured flows for reporting **lost** and **found** items
- Optional image uploads for better identification
- All data stored securely in **Firestore**

### 🤖 AI-Assisted Matching *(Prototype)*
- Experimental matching logic using item descriptions, categories, and images
- Powered by **Google Genkit** — built to explore AI in discovery workflows

### 🔒 Ownership Verification & Secure Handover
- AI-generated questions to verify ownership before approval
- Finder can **approve or reject** each claim
- One-time **6-digit PIN** generated for secure physical handover
- Contact details only revealed after claim approval

### 📊 Full Claim Lifecycle
- Clear state flow: `pending → approved → closed`
- Firestore security rules enforce valid state transitions
- Complete claim history visible from the dashboard

---

## 🔄 How It Works

```
1. Someone finds an item → Reports it on Traceback
2. Owner sees it → Submits a claim
3. Finder reviews the claim → Approves or rejects
4. On approval → A one-time 6-digit PIN is generated
5. Physical handover → PIN verified in person
6. Claim closed → Both parties have a record
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Frontend | React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Auth & Database | Firebase Auth, Firestore, Storage |
| AI Tooling | Google Genkit *(experimental)* |
| Validation | React Hook Form + Zod |
| Deployment | Firebase Hosting / Vercel |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18 or later
- A Firebase project

### Setup

```bash
git clone https://github.com/khatribhavesh05/Traceback.git
cd Traceback
npm install
```

Create a `.env` file in the root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI tooling (experimental)
GEMINI_API_KEY=your_api_key
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📌 Project Note

Traceback is a **functional prototype** built to explore full-stack development concepts including:
- Firebase security rules and authentication flows
- Structured state machines for claim management
- Privacy-first design patterns
- Experimental AI integration with Google Genkit

AI features are implemented for learning purposes and are not production-grade systems.

---

<div align="center">

Made with ☕ and curiosity · [Live Demo →](https://studio--studio-5844244304-a603d.us-central1.hosted.app)

</div>

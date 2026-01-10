# AI Internal Security Analyst (MVP)

End-to-end MVP that performs a **real** static scan on a demo backend project and uses **Gemini** to explain one detected issue.

## Complete Product Documentation

### 1. Executive Summary

AI Internal Security Analyst is a web-based security platform designed to help small and medium-sized organizations evaluate the security of their software projects before deployment. The platform integrates GitHub-based project imports, static security analysis, and AI-assisted vulnerability explanations to prevent insecure applications from reaching production.

### 2. Problem Statement

Many development teams deploy applications without a structured security review process. Small companies often lack dedicated security teams and rely on manual checks, leading to exposed APIs, leaked secrets, insecure dependencies, and unsafe coding practices.

### 3. Product Vision and Objectives

- Enable secure-by-design application development
- Provide automated pre-deployment security analysis
- Integrate directly with GitHub workflows
- Offer AI-powered, developer-friendly explanations
- Reduce security risks early in the SDLC

### 4. Target Users

- Small and medium-sized software companies
- Startup development teams
- Individual developers
- Academic and hackathon teams

### 5. Product Scope

The platform performs Static Application Security Testing (SAST) by analyzing application source code imported from GitHub repositories. It does not perform live penetration testing or exploit execution. All analysis is ethical, read-only, and pre-deployment focused.

### 6. Core Product Features

- GitHub Authentication (OAuth-based login)
- GitHub Repository Import and Management
- Static Source Code Security Analysis
- API Endpoint Security Validation via Code Analysis
- Hardcoded Secrets Detection
- Dangerous Function and Insecure Pattern Detection
- Dependency Vulnerability Analysis
- Authentication and Authorization Review
- Security Score and Risk Categorization
- AI-powered Vulnerability Explanation and Fix Recommendations
- Scan History and Security Reports Dashboard

### 7. Non-Functional Requirements

- Secure handling of user data and source code
- Scalability for multiple concurrent scans
- High availability and responsiveness
- Minimal permissions and privacy-first design
- Clear and intuitive user interface

### 8. System Architecture

The system follows a cloud-native, web-based architecture:

User (Web Browser)
   ↓
Frontend Web Application (React)
   ↓
Firebase Authentication (GitHub OAuth)
   ↓
Backend API Layer (Node.js / Express)
   ↓
GitHub API (Repository Access – Read Only)
   ↓
Static Security Analysis Engine
   ↓
Google Gemini AI (Explanation & Fix Suggestions)
   ↓
Firebase Firestore (User & Scan Metadata)
   ↓
Security Dashboard

### 9. Authentication and Authorization

User authentication is implemented using Firebase Authentication with GitHub OAuth. Users sign in using their GitHub accounts, allowing the platform to securely access authorized repositories. The system requests minimal read-only permissions required for static analysis.

### 10. Data Storage and Management

Firebase Firestore is used to store non-sensitive metadata:

- User profile information
- Imported repository details
- Scan timestamps and results summaries
- Security scores and issue counts

Source code is fetched temporarily from GitHub during scanning and processed in memory. No source code or secrets are permanently stored.

### 11. End-to-End Workflow

1. User signs in using GitHub OAuth
2. User selects repositories to import
3. Backend fetches repository files securely
4. Static security analysis is executed
5. Vulnerabilities are detected and classified
6. Gemini AI generates explanations and fix suggestions
7. Scan metadata is stored in Firebase
8. User views results on the security dashboard

### 12. Technology Stack

- Frontend: React, HTML, CSS
- Backend: Node.js, Express
- AI Model: Google Gemini (Paid)
- Authentication: Firebase Authentication (GitHub OAuth)
- Database: Firebase Firestore
- Hosting: Vercel, Google Cloud

### 13. Security and Privacy Considerations

- Read-only GitHub access
- No permanent storage of source code
- Encrypted data storage in Firebase
- Ethical static analysis only
- Clear permission transparency for users

### 14. Known Limitations

- Static analysis may not detect runtime vulnerabilities
- Limited framework support in early versions
- No active exploitation or DAST in current version

### 15. Future Roadmap

- GitHub App integration
- CI/CD pipeline security checks
- CLI-based local scanning tool
- Multi-language support
- Automated fix pull request generation

### 16. Conclusion

AI Internal Security Analyst is designed as a scalable, cloud-native security platform that integrates seamlessly into GitHub-based development workflows. By combining static analysis, AI intelligence, and secure cloud infrastructure, the product enables teams to deploy applications with greater confidence and security.

## Prerequisites

- Node.js 18+ recommended
- A Google AI Studio API key (Gemini)

## Project structure

- `backend/` Express API (`POST /scan`)
- `backend/demo-project/` intentionally vulnerable demo project scanned by the backend
- `frontend/` React + Tailwind dashboard

## Implementation Architecture (MVP)

This repo is a small monorepo that runs the same way locally and on Vercel by standardizing on **`/api/*`** routes.

### Components

- **Frontend (Vite + React + Tailwind)**
  - Location: `frontend/`
  - UI pages: `frontend/src/pages/*`
  - Calls the backend using `fetch('/api/scan')`
  - In dev, Vite proxies `/api/*` to the local Express server.

- **Backend (Express dev server)**
  - Location: `backend/src/server.js`
  - Endpoints:
    - `POST /scan` (core)
    - `POST /api/scan` (alias for frontend consistency)
    - `GET /health`, `GET /api/health`
  - Orchestrates the scan and optionally requests a Gemini explanation.

- **Scan engine (rule-based static analysis)**
  - Location: `backend/src/scan.js`
  - Scans: `backend/demo-project/` (intentionally vulnerable)
  - Detects (current MVP rules):
    - Unprotected Express endpoints (simple route heuristics)
    - Hardcoded secrets (regex-based)
    - Dangerous function usage (`eval`, `exec` patterns)
  - Produces:
    - `findings[]` with severity, file, line, evidence
    - `score` starting at 100 with deductions per finding severity

- **Gemini integration (optional AI explanation)**
  - Location: `backend/src/gemini.js`
  - Triggered when:
    - A top finding exists, or
    - The client requests a specific finding via `explainFindingId`
  - Uses `GEMINI_API_KEY` and includes model fallback / rate-limit handling.

### Request flow

1. User clicks **Run demo scan** (or **Fix with Gemini** on a specific finding)
2. Frontend sends `POST /api/scan` with JSON body:
   - `{}` for a normal scan
   - `{ "explainFindingId": "..." }` to explain one specific finding
3. Server runs `runScan()`:
   - Lists files under `backend/demo-project/`
   - Applies detection rules
   - Computes the score
   - Optionally calls Gemini to generate an explanation
4. Frontend renders:
   - Security score
   - Findings list
   - AI explanation panel (when present)

### Local vs Vercel behavior

- **Local development**
  - Frontend dev server (`frontend`) proxies `/api/*` to `http://localhost:5050`.
  - Backend is a normal Express process.

- **Vercel deployment**
  - Backend runs as serverless functions in `api/`:
    - `api/scan.js` exposes `POST /api/scan`
    - `api/health.js` exposes `GET /api/health`
  - Serverless functions reuse the scan engine from `backend/src/*`.

## Backend: run

1. Create `backend/.env` (copy from `.env.example`):

   - `GEMINI_API_KEY=...`

2. Install + start:

   - `npm install`
   - `npm run dev`

Backend runs on `http://localhost:5050`

### API

- `POST /scan`
  - Scans `backend/demo-project` files
  - Detects:
    - Unprotected Express endpoints
    - Hardcoded secrets
    - Dangerous function usage (`eval`, `exec`)
  - Computes a score starting at 100 and deducts per finding
  - Sends **one** finding to Gemini for explanation

## Frontend: run

1. Install + start:

   - `npm install`
   - `npm run dev`

Frontend runs on `http://localhost:5173` and proxies `/api/*` to the backend.

## Notes

- This MVP intentionally includes insecure code in `backend/demo-project` so the scanner returns real findings.
- No uploads, no auth, no scan history, no CI/CD integration (per MVP scope).

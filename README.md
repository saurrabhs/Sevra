# AI Internal Security Analyst (MVP- Stage)

End-to-end MVP that performs a **real** static scan on a demo backend project and uses **Gemini** to explain one detected issue.

## Prerequisites

- Node.js 18+ recommended
- A Google AI Studio API key (Gemini)

## Project structure

- `backend/` Express API (`POST /scan`)
- `backend/demo-project/` intentionally vulnerable demo project scanned by the backend
- `frontend/` React + Tailwind dashboard

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

Frontend runs on `http://localhost:5173` and proxies `/scan` to the backend.

## Notes

- This MVP intentionally includes insecure code in `backend/demo-project` so the scanner returns real findings.
- No uploads, no auth, no scan history, no CI/CD integration (per MVP scope).

# Techin By Raj — Product Requirements

## Original Problem Statement
Build a course-selling website for "Techin By Raj". Sell a trading indicator (self-designed) and, later, video courses for beginner & pro traders. Unique, attractive, user-friendly design.

## User Choices
- Sell both indicator + courses now
- Online payment via Stripe (test mode), instant access
- User accounts with login (JWT email/password)
- Indicator price: ₹5499 (INR)
- Design: dark, premium trading/finance look

## Architecture
- Frontend: React 19, react-router, framer-motion, Lenis smooth scroll, Tailwind, shadcn/ui, sonner
- Backend: FastAPI, Motor (MongoDB), JWT (httpOnly cookie) auth, bcrypt
- Payments: Stripe via emergentintegrations (shared test sandbox `sk_test_emergent`; India not eligible for claimable sandbox). Currency INR. Webhook at /api/webhook/stripe, status polling at /api/payments/status/{id}.
- Design: Cabinet Grotesk + IBM Plex, obsidian #050505 + volt #E2FF4A accent, grain overlay, kinetic masked hero, marquee, numbered method chapters.

## User Personas
- New trader wanting structured education (Beginner course)
- Experienced trader wanting the indicator + pro masterclass

## Core Requirements (static)
- Landing page (hero, indicator, method, courses, pricing, FAQ)
- Auth (signup/login/logout, session via cookie)
- Stripe checkout for 3 products, instant access on success
- Dashboard showing owned + locked products

## Implemented (2026-08-20)
- JWT auth (register/login/logout/me), admin seed (raj@techinbyraj.com), brute-force lockout (5 fails/15min, keyed by X-Forwarded-For IP+email)
- Product catalog: indicator_pro ₹5499, course_beginner ₹2999, course_pro ₹7999
- Stripe checkout + status polling + webhook; fulfillment adds product to user.purchases
- Award-level dark landing page with framer-motion + Lenis; distinctive outlined/fill hero wordmark; custom candlestick logo mark
- Real TradingView candlestick chart in Indicator section (with load fallback)
- File & media storage (Emergent object storage): admin uploads product files per product; buyers download owned assets from dashboard; gated /api/assets/{id}/download (owner/admin only)
- Auth modal with buy-gating; Dashboard library (owned assets + locked) + admin upload panel; payment success/cancel pages
- Verified: backend curl (auth, products, checkout, storage upload/download/403, lockout) + testing agent frontend e2e 100% (2 iterations)

## Backlog / Remaining
- P1: Claude AI trading assistant (playbook fetched; awaiting user's use-case + model choice — Emergent key ready)
- P1: Password reset (forgot-password) flow
- P1: Course video player UI (files can be uploaded/downloaded; no in-app player yet)
- P2: Email confirmations (Resend), order history/receipts
- P2: Admin panel for editing products/prices; testimonials/blog

## Next Tasks
- Wire actual downloadable indicator file + course lessons player
- Add forgot/reset password
- Email receipts

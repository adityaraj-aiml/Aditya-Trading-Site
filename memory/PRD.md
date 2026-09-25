# Techin By Raj — Product Requirements

## Original Problem Statement
Build a course-selling website for "Techin By Raj". Sell a trading indicator (self-designed) and, later, video courses for beginner & pro traders. Unique, attractive, user-friendly design.

## User Choices
- Sell both indicator + courses now
- Online payment via Razorpay (test mode), instant access
- User accounts with login (JWT email/password)
- Indicator price: ₹5499 (INR)
- Design: dark, premium trading/finance look

## Architecture
- Frontend: React 19, react-router, framer-motion, Lenis smooth scroll, Tailwind, shadcn/ui, sonner
- Backend: FastAPI, Motor (MongoDB), JWT (httpOnly cookie) auth, bcrypt
- Payments: Razorpay, via the official `razorpay` Python SDK + Razorpay Checkout.js on the frontend (own `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`). Currency INR. Order created server-side, paid via an inline JS modal (no redirect), verified via signature check in /api/payments/verify, with /api/webhook/razorpay and /api/payments/status/{order_id} as reliability backstops.
- Design: Cabinet Grotesk + IBM Plex, obsidian #050505 + volt #E2FF4A accent, grain overlay, kinetic masked hero, marquee, numbered method chapters.

## User Personas
- New trader wanting structured education (Beginner course)
- Experienced trader wanting the indicator + pro masterclass

## Core Requirements (static)
- Landing page (hero, indicator, method, courses, pricing, FAQ)
- Auth (signup/login/logout, session via cookie)
- Razorpay checkout for 3 products, instant access on success
- Dashboard showing owned + locked products

## Implemented (2026-08-20)
- JWT auth (register/login/logout/me), admin seed (raj@techinbyraj.com), brute-force lockout (5 fails/15min, keyed by X-Forwarded-For IP+email)
- Product catalog: indicator_pro ₹5499, course_beginner ₹2999, course_pro ₹7999
- Stripe checkout + status polling + webhook; fulfillment adds product to user.purchases
- Award-level dark landing page with framer-motion + Lenis; distinctive outlined/fill hero wordmark; custom candlestick logo mark
- Real TradingView candlestick chart in Indicator section (with load fallback)
- File & media storage (MongoDB GridFS, same database — no third-party storage service): admin uploads product files per product; buyers download owned assets from dashboard; gated /api/assets/{id}/download (owner/admin only)
- Proof / Results section (#results): real indicator screenshots (LONG/SHORT + TP1–TP5 targets) with a "how to read it" legend, object-contain framing (no cropping), click-to-enlarge
- Social links live: Telegram (t.me/themindfultrader), Instagram (aditya__raj02), Email (withadityat@gmail.com) — in Results section + footer
- Fixed React StrictMode race that hid the TradingView chart behind its fallback
- Auth modal with buy-gating; Dashboard library (owned assets + locked) + admin upload panel; payment success/cancel pages
- Verified: backend curl (auth, products, checkout, storage upload/download/403, lockout) + testing agent frontend e2e 100% (2 iterations)

## Implemented (2026-09-26)
- Removed all Emergent platform dependencies: payments and storage no longer route through emergentintegrations / integrations.emergentagent.com
- Payments switched from Stripe to Razorpay: order created server-side via the `razorpay` SDK, paid through an inline Checkout.js modal (no redirect), verified via signature check at /api/payments/verify, with /api/webhook/razorpay and /api/payments/status/{order_id} as backstops
- File storage switched from Emergent's object-storage proxy to MongoDB GridFS in the same database

## Backlog / Remaining
- P1: Claude AI trading assistant (playbook fetched; awaiting user's use-case + model choice, and a direct Anthropic API key)
- P1: Password reset (forgot-password) flow
- P1: Course video player UI (files can be uploaded/downloaded; no in-app player yet)
- P2: Email confirmations (Resend), order history/receipts
- P2: Admin panel for editing products/prices; testimonials/blog

## Next Tasks
- Wire actual downloadable indicator file + course lessons player
- Add forgot/reset password
- Email receipts

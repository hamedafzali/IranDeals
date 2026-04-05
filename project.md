# Iranian Diaspora Discount Network — Project Document

**Version:** 1.0  
**Status:** MVP Planning  
**Last updated:** April 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Vision & Goals](#2-vision--goals)
3. [User Personas](#3-user-personas)
4. [Product Architecture](#4-product-architecture)
5. [MVP: Telegram Bot](#5-mvp-telegram-bot)
6. [Bot Conversation Flows](#6-bot-conversation-flows)
7. [Data Model](#7-data-model)
8. [Backend Architecture](#8-backend-architecture)
9. [Tech Stack](#9-tech-stack)
10. [File & Folder Structure](#10-file--folder-structure)
11. [Admin & Moderation](#11-admin--moderation)
12. [Notification & Delivery System](#12-notification--delivery-system)
13. [Localisation & Language](#13-localisation--language)
14. [Design System](#14-design-system)
15. [Security & Privacy](#15-security--privacy)
16. [Roadmap](#16-roadmap)
17. [Future Phases](#17-future-phases)
18. [Launch Checklist](#18-launch-checklist)

---

## 1. Project Overview

The Iranian Diaspora Discount Network is a two-sided platform connecting Iranian-owned or Iranian-friendly businesses with members of the Iranian diaspora community. Businesses register and post exclusive discounts; community members subscribe and receive personalised deal notifications filtered by their city and interests.

The MVP is delivered entirely through a Telegram bot and a public Telegram channel — zero app installation required, immediate reach to the community.

---

## 2. Vision & Goals

### Vision

Build the go-to discovery platform for the Iranian diaspora to find trusted, community-verified deals from businesses that understand their culture, language, and preferences.

### MVP Goals

- Allow businesses to self-register in under 5 minutes
- Allow subscribers to onboard and set preferences in under 2 minutes
- Deliver relevant deals to the right subscribers within seconds of posting
- Support bilingual (Farsi + English) interactions throughout
- Validate the business model before building a website or app

### Success Metrics (MVP)

| Metric                       | Target (Month 3) |
| ---------------------------- | ---------------- |
| Registered businesses        | 30+              |
| Active subscribers           | 500+             |
| Deals posted per week        | 20+              |
| Subscriber open rate         | 40%+             |
| Business retention (monthly) | 70%+             |

---

## 3. User Personas

### Persona A — Business Owner (Dariush, 42, Berlin)

Runs an Iranian grocery store. Active on Telegram. Wants to attract diaspora customers but has no budget for ads. Comfortable with Farsi-language interfaces. Needs a simple way to share weekly deals without technical complexity.

**Needs:** Fast deal posting, ability to target local Iranians, trust signals (verification badge), statistics on how many people saw his deal.

### Persona B — Subscriber (Shirin, 28, London)

Second-generation Iranian. Uses Telegram daily. Interested in Iranian restaurants, beauty salons, and travel deals. Dislikes spam but values relevant offers from culturally familiar businesses.

**Needs:** Only receive relevant deals, easy to pause or unsubscribe, Farsi or English, no noise.

### Persona C — Platform Admin (Internal)

Reviews new business registrations, handles abuse reports, monitors delivery stats, manages the public channel.

**Needs:** Simple approval interface, ability to ban businesses, visibility into system health.

---

## 4. Product Architecture

The platform is structured as three layers:

```
Layer 1 — Interfaces
          Telegram bot (grammy, TypeScript)
          Admin SPA (React + Vite)
          Future: public web app, iOS/Android app

Layer 2 — Backend (irandeals-bot — single Node.js process)
          ┌─────────────────────────────────────────────┐
          │  Telegram bot handler (grammy)               │
          │  REST API  /api/*  (Express)                 │
          │    ├── Auth  (JWT)                           │
          │    ├── Businesses, Deals, Subscribers        │
          │    ├── Locations (countries + cities)        │
          │    ├── Analytics                             │
          │    └── Delivery log                          │
          │  Scheduler  (node-cron)                      │
          │    ├── Daily digest    09:00 UTC             │
          │    ├── Weekly digest   Sun 10:00 UTC         │
          │    └── Deal expiry     every hour            │
          └─────────────────────────────────────────────┘

Layer 3 — Data stores
          PostgreSQL 15  (core data, via Prisma)
          Redis 7        (grammy sessions + rate limiting)
          Object storage (Cloudflare R2 or Telegram file IDs)
```

The Telegram bot and the REST API run in the same Node.js process. The React admin SPA calls the REST API directly. Future web and mobile clients do the same — no backend work is duplicated.

---

## 5. MVP: Telegram Bot

### Bot identity

- **Bot username:** `@IranDealsBot` (or regional variant, e.g. `@IranDeals_DE`)
- **Display name:** Iran Deals / تخفیف‌های ایرانی
- **Language:** Bilingual Farsi + English throughout
- **Bot type:** Private bot (users DM the bot) + a linked public channel for broadcast

### Public channel strategy

Run two parallel Telegram presences:

**Private bot** — Handles registration, subscriptions, personalised delivery, settings. Users must initiate a conversation.

**Public channel** — e.g. `@IranDealsLondon`, `@IranDealsBerlin`. Anyone can join without interacting. Broadcasts deals for that city. Grows organically via sharing. Use one channel per major diaspora city.

The bot auto-posts to the relevant channel whenever a deal is approved and broadcast.

### Commands

| Command        | Who can use               | Description                            |
| -------------- | ------------------------- | -------------------------------------- |
| `/start`       | Everyone                  | Subscriber onboarding                  |
| `/register`    | Anyone (becomes business) | Business registration flow             |
| `/newdeal`     | Approved businesses       | Post a new discount                    |
| `/mydeals`     | Approved businesses       | List their active deals                |
| `/editdeal`    | Approved businesses       | Edit or deactivate a deal              |
| `/deals`       | Subscribers               | Browse current active deals            |
| `/settings`    | Subscribers               | Change location, categories, frequency |
| `/unsubscribe` | Subscribers               | Stop all notifications                 |
| `/help`        | Everyone                  | Command list and support info          |
| `/language`    | Everyone                  | Switch between Farsi and English       |
| `/admin`       | Admin only                | Access admin actions                   |

---

## 6. Bot Conversation Flows

### 6.1 Business Registration (`/register`)

The bot guides the business through 5 steps, one message at a time. State is stored in the database keyed to the user's Telegram ID.

**Step 1 — Business name**
Bot asks for the shop or company name. Free text input.

**Step 2 — Location**
Bot asks for country first (inline keyboard), then city (inline keyboard or free text for smaller cities).

**Step 3 — Category**
Bot presents inline keyboard with categories:

- Restaurant / رستوران
- Grocery / سوپرمارکت
- Beauty & hair / آرایشگاه
- Travel / سفر
- Real estate / مسکن
- Legal & financial / حقوقی و مالی
- Healthcare / بهداشت
- Retail / فروشگاه
- Other / سایر

**Step 4 — Contact info**
Bot asks for phone number, website (optional), and Instagram handle (optional).

**Step 5 — Confirmation**
Bot shows a summary card and asks "Is this correct? / آیا اطلاعات صحیح است؟" with Yes / Edit buttons.

On confirmation, the business is saved with status `pending` and the admin is notified. The business receives a message: "Thank you! Your registration is under review. We'll notify you within 24 hours."

Once approved, the business receives: "You're approved! Use /newdeal to post your first discount."

---

### 6.2 Deal Posting (`/newdeal`)

Only available to businesses with status `approved`.

**Step 1 — Deal title**
Short headline, e.g. "20% off all food this weekend / ۲۰٪ تخفیف روی همه غذاها".

**Step 2 — Discount description**
Full details. What is discounted, any conditions, coupon code if applicable.

**Step 3 — Expiry date**
Bot presents quick options (today, 3 days, 7 days, 14 days, custom date). Deals without expiry are automatically deactivated after 30 days.

**Step 4 — Image (optional)**
Bot asks for a photo. Business can send an image or type "skip / رد کردن".

**Step 5 — Target region**
Defaults to the business's registered city. Can optionally expand to all cities in the same country.

**Step 6 — Confirm and broadcast**
Bot shows a preview of how the deal will look to subscribers. Business confirms. Deal is broadcast immediately (or queued for digest depending on system load).

---

### 6.3 Subscriber Onboarding (`/start`)

**Step 1 — Welcome**
Bilingual welcome message explaining what the bot does. Two buttons: "Subscribe to deals / عضو شو" and "Register my business / ثبت کسب‌وکار".

**Step 2 — Choose location**
Country first (inline keyboard), then city. User can select multiple cities (e.g. "I'm in London but visit Manchester").

**Step 3 — Choose categories**
Multi-select inline keyboard. User taps all relevant categories. A "Done / تمام" button confirms the selection.

**Step 4 — Notification frequency**
Three options:

- Instant: receive each deal as it's posted
- Daily digest: one message per day with all deals from that day
- Weekly digest: one message every Sunday

**Step 5 — Done**
Confirmation message: "You're subscribed! / عضو شدید! You'll start receiving deals shortly."

---

### 6.4 State Machine Implementation

Every user has a `conversation_state` field. All incoming messages are routed through a central dispatcher:

```python
async def handle_message(update, context):
    user_id = update.effective_user.id
    state = db.get_state(user_id)

    if state == "IDLE":
        await handle_idle(update, context)
    elif state.startswith("REG_"):
        await handle_registration(update, context, state)
    elif state.startswith("DEAL_"):
        await handle_deal(update, context, state)
    elif state.startswith("SUB_"):
        await handle_subscriber(update, context, state)
```

**State list:**

| State            | Description                      |
| ---------------- | -------------------------------- |
| `IDLE`           | No active flow                   |
| `REG_NAME`       | Waiting for business name        |
| `REG_CITY`       | Waiting for city                 |
| `REG_CATEGORY`   | Waiting for category selection   |
| `REG_CONTACT`    | Waiting for contact info         |
| `REG_CONFIRM`    | Waiting for confirmation         |
| `DEAL_TITLE`     | Waiting for deal title           |
| `DEAL_DESC`      | Waiting for deal description     |
| `DEAL_EXPIRY`    | Waiting for expiry               |
| `DEAL_IMAGE`     | Waiting for image or skip        |
| `DEAL_REGION`    | Waiting for target region        |
| `DEAL_CONFIRM`   | Waiting for deal confirmation    |
| `SUB_LOCATION`   | Waiting for subscriber location  |
| `SUB_CATEGORIES` | Waiting for category selection   |
| `SUB_FREQUENCY`  | Waiting for frequency preference |

---

## 7. Data Model

### businesses

| Field       | Type         | Notes                                       |
| ----------- | ------------ | ------------------------------------------- |
| id          | UUID         | Primary key                                 |
| telegram_id | BIGINT       | Telegram user ID of owner                   |
| name        | VARCHAR(200) | Business display name                       |
| country     | VARCHAR(100) |                                             |
| city        | VARCHAR(100) |                                             |
| category    | VARCHAR(50)  | Enum from category list                     |
| phone       | VARCHAR(50)  | Optional                                    |
| website     | VARCHAR(200) | Optional                                    |
| instagram   | VARCHAR(100) | Optional                                    |
| status      | VARCHAR(20)  | `pending`, `approved`, `rejected`, `banned` |
| verified    | BOOLEAN      | Admin-verified badge                        |
| created_at  | TIMESTAMP    |                                             |
| approved_at | TIMESTAMP    | Nullable                                    |

### deals

| Field          | Type         | Notes                                   |
| -------------- | ------------ | --------------------------------------- |
| id             | UUID         | Primary key                             |
| business_id    | UUID         | FK → businesses                         |
| title          | VARCHAR(200) |                                         |
| description    | TEXT         |                                         |
| image_url      | VARCHAR(500) | Nullable                                |
| target_country | VARCHAR(100) |                                         |
| target_city    | VARCHAR(100) | Nullable (null = all cities in country) |
| expires_at     | TIMESTAMP    |                                         |
| active         | BOOLEAN      |                                         |
| created_at     | TIMESTAMP    |                                         |
| broadcast_at   | TIMESTAMP    | When it was sent out                    |

### subscribers

| Field       | Type        | Notes                        |
| ----------- | ----------- | ---------------------------- |
| id          | UUID        | Primary key                  |
| telegram_id | BIGINT      | Telegram user ID             |
| cities      | TEXT[]      | Array of subscribed cities   |
| categories  | TEXT[]      | Array of chosen categories   |
| frequency   | VARCHAR(20) | `instant`, `daily`, `weekly` |
| language    | VARCHAR(5)  | `fa`, `en`                   |
| active      | BOOLEAN     |                              |
| created_at  | TIMESTAMP   |                              |

### deal_deliveries

| Field         | Type        | Notes                                     |
| ------------- | ----------- | ----------------------------------------- |
| id            | UUID        | Primary key                               |
| deal_id       | UUID        | FK → deals                                |
| subscriber_id | UUID        | FK → subscribers                          |
| sent_at       | TIMESTAMP   |                                           |
| channel       | VARCHAR(20) | `direct`, `daily_digest`, `weekly_digest` |

### admin_log

| Field             | Type        | Notes                                 |
| ----------------- | ----------- | ------------------------------------- |
| id                | UUID        | Primary key                           |
| admin_telegram_id | BIGINT      |                                       |
| action            | VARCHAR(50) | `approve`, `reject`, `ban`, `feature` |
| target_type       | VARCHAR(20) | `business`, `deal`                    |
| target_id         | UUID        |                                       |
| note              | TEXT        | Optional reason                       |
| created_at        | TIMESTAMP   |                                       |

---

## 8. Backend Architecture

### Single process, three responsibilities

The `irandeals-bot` Node.js process handles all three responsibilities simultaneously:

**Bot handler** — grammy processes Telegram updates. Multi-step flows (registration, deal posting, subscriber onboarding) use grammy sessions stored in Redis as a lightweight state machine.

**REST API** — Express listens on port 3000. All endpoints are under `/api/`. The React admin is the primary consumer. JWT tokens are issued on `/api/auth/login` and verified by middleware on all protected routes.

**Scheduler** — `node-cron` fires digest and cleanup jobs on their configured schedules within the same process. No separate worker needed for MVP.

### Deal broadcast flow

```
Business sends /newdeal
  → Bot collects deal data
  → Deal saved to DB with active = false
  → (Optional: admin review for first deal from new business)
  → Deal activated
  → Broadcast job triggered:
      → Query: SELECT subscribers WHERE city matches AND categories overlap
      → For instant subscribers: send immediately
      → For daily/weekly: add to digest queue
  → Post to public channel for the city
  → Update deal.broadcast_at
```

### Digest job flow

```
Cron: daily at 9:00 AM local time
  → Query all deals posted in last 24h, not yet in daily digest
  → Group by city
  → For each city, find all daily-frequency subscribers
  → Build formatted digest message (max 5 deals)
  → Send to each subscriber
  → Mark as delivered in deal_deliveries
```

---

## 9. Tech Stack

### Bot service (`irandeals-bot/`)

| Layer              | Technology                         | Notes                                             |
| ------------------ | ---------------------------------- | ------------------------------------------------- |
| Language           | TypeScript 5 + Node.js 20          | Strict mode                                       |
| Bot framework      | `grammy` v1                        | TypeScript-native, async, plugin ecosystem        |
| Session storage    | `@grammyjs/storage-redis`          | Conversation state persisted in Redis             |
| ORM                | Prisma 5                           | Type-safe queries, built-in migrations            |
| Database           | PostgreSQL 15                      | Primary data store                                |
| Cache / sessions   | Redis 7                            | Session + rate-limiting                           |
| Job scheduler      | `node-cron`                        | Digest jobs, cleanup                              |
| REST API           | Express 4                          | Exposes `/api` endpoints consumed by the admin UI |
| Image storage      | Cloudflare R2 or Telegram file IDs | R2 is cheapest; file IDs avoid storage entirely   |
| Hosting            | Railway, Render, or Fly.io         | From €5–15/month                                  |
| Environment config | `dotenv`                           |                                                   |

### Admin UI (`irandeals-admin/`)

| Layer         | Technology                                          | Notes                                 |
| ------------- | --------------------------------------------------- | ------------------------------------- |
| Language      | TypeScript 5                                        |                                       |
| Framework     | React 18                                            |                                       |
| Build tool    | Vite 5                                              | Fast HMR, optimised production builds |
| UI components | shadcn/ui + Tailwind CSS                            | Accessible, unstyled-first components |
| Data fetching | TanStack Query v5                                   | Server state, caching, pagination     |
| Routing       | React Router v6                                     | SPA client-side routing               |
| Charts        | Recharts                                            | Analytics dashboard                   |
| Forms         | React Hook Form + Zod                               | Validated admin forms                 |
| Auth          | JWT stored in `httpOnly` cookie (issued by bot API) |                                       |
| Hosting       | Vercel or same Railway service                      | Static SPA                            |

### Future (mobile app)

| Layer      | Technology                        |
| ---------- | --------------------------------- |
| Mobile app | React Native or Flutter           |
| Payments   | Stripe                            |
| Search     | Meilisearch or Postgres full-text |

---

## 10. File & Folder Structure

The repository is split into two independent projects sharing one `docker-compose.yml` at the root.

Docker build note: The bot service Dockerfile currently uses `npm install` (not `npm ci`) because there is no committed `package-lock.json` in the repo. For reproducible builds, add/commit a lockfile and switch back to `npm ci`.

```
IranDeals/                          # Monorepo root
├── docker-compose.yml              # Runs bot + db + redis together
├── irandeals-bot/                  # Node.js service
│   ├── src/
│   │   ├── bot/
│   │   │   ├── handlers/
│   │   │   │   ├── start.ts        # /start, subscriber onboarding
│   │   │   │   ├── register.ts     # Business registration flow
│   │   │   │   ├── newdeal.ts      # Deal posting flow
│   │   │   │   ├── settings.ts     # /settings, /language, /unsubscribe
│   │   │   │   ├── browse.ts       # /deals command
│   │   │   │   └── admin.ts        # /admin command (restricted)
│   │   │   ├── jobs/
│   │   │   │   ├── broadcast.ts    # Instant deal delivery
│   │   │   │   ├── digest.ts       # Daily and weekly digest
│   │   │   │   └── cleanup.ts      # Expire old deals, purge subscribers
│   │   │   ├── utils/
│   │   │   │   ├── keyboards.ts    # All InlineKeyboard builders
│   │   │   │   ├── formatting.ts   # Message template functions
│   │   │   │   └── validators.ts   # Input validation helpers
│   │   │   ├── i18n/
│   │   │   │   ├── fa.json         # Farsi strings
│   │   │   │   └── en.json         # English strings
│   │   │   └── bot.ts              # Bot instance + middleware setup
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts         # POST /api/auth/login, logout
│   │   │   │   ├── businesses.ts   # CRUD + approve/reject/ban
│   │   │   │   ├── deals.ts        # CRUD + activate/deactivate
│   │   │   │   ├── subscribers.ts  # Read + deactivate
│   │   │   │   ├── locations.ts    # Countries + cities CRUD
│   │   │   │   ├── analytics.ts    # GET /api/analytics/summary
│   │   │   │   └── deliveries.ts   # Read-only delivery log
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # JWT verification middleware
│   │   │   │   └── errorHandler.ts
│   │   │   └── server.ts           # Express app factory
│   │   ├── config/
│   │   │   └── settings.ts         # Typed env variable loading
│   │   └── index.ts                # Entry point — starts bot + API server
│   ├── prisma/
│   │   └── schema.prisma           # All models + migrations
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── irandeals-admin/                # React SPA
    ├── src/
    │   ├── api/
    │   │   └── client.ts           # Axios instance + typed API calls
    │   ├── components/
    │   │   ├── ui/                 # shadcn/ui re-exports
    │   │   ├── DataTable.tsx       # Reusable paginated table
    │   │   └── StatCard.tsx        # KPI card for dashboard
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── Dashboard.tsx       # Analytics overview
    │   │   ├── Businesses.tsx      # List + approve/reject/ban
    │   │   ├── Deals.tsx           # List + activate/deactivate
    │   │   ├── Subscribers.tsx
    │   │   ├── Locations.tsx       # Countries + cities management
    │   │   └── DeliveryLog.tsx
    │   ├── hooks/
    │   │   └── useAuth.ts
    │   ├── router.tsx              # React Router routes + auth guard
    │   └── main.tsx
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── package.json
    └── tsconfig.json
```

---

## 11. Admin & Moderation

### Admin Telegram bot

The admin receives notifications for:

- New business registration (with Approve / Reject buttons)
- First deal from a newly approved business
- User reports (subscriber flags an inappropriate deal)

Admin commands (restricted by Telegram ID):

```
/pending    — List all businesses awaiting approval
/approve <id>  — Approve a business
/reject <id> <reason>  — Reject with reason
/ban <id>   — Ban a business
/stats      — View platform statistics
/broadcast  — Send a message to all subscribers (emergency use)
```

### Moderation rules

- All new businesses require manual approval before they can post
- A business's first deal can optionally be held for review
- Businesses who receive 3 reports in 30 days are auto-paused and flagged for admin
- Deals containing phone numbers in the description (spam signal) are flagged

---

## 12. Notification & Delivery System

### Delivery modes

**Instant** — Deal is delivered within seconds of being posted. Best for time-sensitive offers (e.g. "today only").

**Daily digest** — All deals from the past 24 hours are bundled into one message, sent at 9:00 AM in the subscriber's timezone. Maximum 5 deals per digest; if more, show top 5 by recency and link to the channel for the rest.

**Weekly digest** — Sent every Sunday at 10:00 AM. Maximum 10 deals.

### Deal message format

```
🏷 [Business Name] — [City]

[Deal Title]
[Deal Description]

Valid until: [Date]
[Optional: promo code]

📍 [City] | 🏪 [Category]
```

### Anti-spam rules

- A subscriber cannot receive the same deal twice
- Maximum 3 instant messages per day per subscriber (additional deals queue for next digest)
- Businesses cannot post more than 5 deals per week
- Duplicate deals (same title from same business within 7 days) are rejected

---

## 13. Localisation & Language

### Supported languages

- **Farsi (fa)** — primary language, RTL, all strings available
- **English (en)** — full parity with Farsi

### Language selection

On first `/start`, the bot detects Telegram's `language_code` field:

- `fa` → default to Farsi
- All others → default to English

User can switch at any time with `/language`.

### String management

All user-facing text lives in `i18n/fa.json` and `i18n/en.json`. No hardcoded strings in handler code. Each string has a key:

```json
{
  "welcome_title": "به ربات تخفیف‌های ایرانیان خوش آمدید",
  "welcome_body": "اینجا می‌توانید تخفیف‌های ویژه از کسب‌وکارهای ایرانی دریافت کنید.",
  "register_prompt_name": "نام کسب‌وکار خود را وارد کنید:",
  "deal_confirm_prompt": "آیا این تخفیف را تأیید می‌کنید؟"
}
```

### RTL considerations

Telegram renders Farsi text correctly in RTL without any special handling. However, mixed Farsi/English lines should put Farsi first to ensure correct rendering direction.

---

## 14. Design System

This section applies to the future web app and mobile app. The Telegram bot uses inline keyboards and standard message formatting.

### Brand identity

**Name:** Iran Deals / تخفیف ایرانی  
**Tagline:** Deals from your community / تخفیف از جامعه شما

### Colour palette

| Name       | Hex       | Usage                      |
| ---------- | --------- | -------------------------- |
| Saffron    | `#E8A020` | Primary brand, CTAs        |
| Deep green | `#1A6B3C` | Secondary, verified badges |
| Ivory      | `#FAF7F2` | Background                 |
| Charcoal   | `#2C2C2A` | Primary text               |
| Muted sage | `#8AAF8B` | Subtle accents             |
| Alert red  | `#D93025` | Errors, warnings           |

### Typography

- **Headings:** Vazirmatn (supports Farsi + Latin, free, Google Fonts)
- **Body:** Vazirmatn Regular for Farsi; Inter for English-only interfaces
- **Monospace:** JetBrains Mono (admin/code views)

### Component principles

- Cards for business listings: image thumbnail (optional) + name + city + category badge + discount preview
- Full-width deal cards on mobile
- Bilingual labels: always show both languages side by side or stacked for key UI elements
- Badge system: Verified (green), New (saffron), Expiring soon (red)

---

## 15. Security & Privacy

### Data minimisation

The platform collects only what is needed:

- From businesses: name, location, category, optional contact info
- From subscribers: Telegram ID, city preferences, category preferences

No email address, no real name, no payment data in MVP.

### Telegram ID handling

Telegram IDs are permanent user identifiers. They are stored but never displayed publicly. Subscribers are anonymous to businesses — businesses cannot look up who received their deal.

### Bot token security

- Telegram bot token stored as environment variable, never hardcoded
- Webhook endpoint served over HTTPS only
- Webhook secret token set to reject requests not from Telegram

### Admin access

Admin commands are restricted by a hardcoded list of Telegram IDs in the config. No password-based admin access in MVP.

### Data retention

- Subscriber data deleted 90 days after unsubscribing (soft delete + scheduled cleanup)
- Deal delivery logs retained for 12 months for analytics, then purged
- Banned businesses retained indefinitely (to prevent re-registration)

---

## 16. Roadmap

### Phase 1 — MVP (Months 1–2)

- Telegram bot: business registration, deal posting, subscriber onboarding
- Manual admin approval via Telegram
- Instant delivery + daily digest
- Public channels (one per major city)
- Bilingual Farsi/English
- Target cities: Berlin, London, Stockholm, Toronto, Los Angeles

### Phase 2 — Growth (Months 3–4)

- Business analytics: how many subscribers saw each deal, click tracking
- Deal performance badges (Most viewed, Most saved)
- /referral — businesses earn verified badge faster by referring other businesses
- Subscriber /save command to bookmark deals
- Automated reminders to businesses who haven't posted in 14 days
- Expand to 10+ cities

### Phase 3 — Web App (Months 5–7)

- Public website built with Next.js 14 (App Router): browse deals without Telegram
- Business dashboard: manage profile, post deals, view stats
- Subscriber account: manage preferences, view saved deals
- SEO-optimised deal pages
- City landing pages (e.g. iranbiz.deals/berlin)
- Shares the same REST API already built for the admin

### Phase 4 — Monetisation (Month 6+)

- Featured deal placement (business pays to pin deal to top of digest)
- Verified business badge (one-time or subscription fee)
- Premium subscriber tier: extended categories, cross-city deals
- Business subscription plan: unlimited deals + analytics

### Phase 5 — Mobile App (Month 8+)

- iOS + Android app
- Push notifications
- Map view of nearby deals
- Business QR code for in-store display

---

## 17. Future Phases

### Extended features (post-MVP consideration)

**Deal categories expansion** — Events (concerts, cultural events), online-only deals (apps, e-commerce), service bookings.

**Community features** — Business reviews, deal ratings, "recommended by community" badges.

**Business networking** — Businesses can follow each other, share deal announcements within the platform.

**API for partners** — Allow diaspora media outlets or community apps to embed deal feeds.

**Multi-language expansion** — Arabic, Turkish for adjacent diaspora communities.

---

## 18. Launch Checklist

### Before first user

- [ ] Bot created via @BotFather, token stored securely
- [ ] Webhook set up on HTTPS endpoint
- [ ] Database schema applied (PostgreSQL)
- [ ] Redis instance running
- [ ] Admin Telegram ID configured
- [ ] At least 5 approved businesses seeded manually
- [ ] At least 3 active deals ready to show new subscribers
- [ ] Farsi strings reviewed by native speaker
- [ ] All commands tested end-to-end
- [ ] Rate limiting and anti-spam rules active

### Launch channels

- [ ] Telegram public channels created for target cities
- [ ] Bot link shared in Iranian diaspora Facebook groups
- [ ] Posted in relevant WhatsApp community groups
- [ ] Outreach to Iranian community organisations
- [ ] Instagram post with bot link (story + post)
- [ ] Post on Iranian diaspora Reddit communities (r/iranian, r/persianculture)

### Monitoring (week 1)

- [ ] Check for unhandled error states daily
- [ ] Review all pending business registrations within 24 hours
- [ ] Monitor delivery success rates
- [ ] Collect first feedback from businesses and subscribers

---

_This document is a living specification. Update it as the product evolves._

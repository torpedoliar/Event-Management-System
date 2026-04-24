# Technical Blueprint & Architecture

## Guest Registration & Check-in System

Dokumen ini menjelaskan blueprint teknis, flowchart, dan struktur aplikasi secara detail.

---

## Daftar Isi

1. [System Architecture](#system-architecture)
2. [Folder Structure](#folder-structure)
3. [Database Schema](#database-schema)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [API Flow](#api-flow)
6. [Component Architecture](#component-architecture)
7. [Real-time Communication](#real-time-communication)
8. [Authentication Flow](#authentication-flow)
9. [Feature Flowcharts](#feature-flowcharts)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Browser    │  │   Browser    │  │   Browser    │  │   Browser    │    │
│  │  (Admin 1)   │  │  (Admin 2)   │  │  (Check-in)  │  │  (Display)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │             │
│         └─────────────────┴─────────────────┴─────────────────┘             │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js 14)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        App Router (Pages)                            │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │ /checkin│ │/souvenir│ │/luckydraw│ │  /show  │ │ /admin/* │       │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────┴───────────────────────────────────┐    │
│  │                         Shared Services                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │  SSE Context │  │  API Utils  │  │  Auth Hook  │                  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                          Proxy Rewrite (/api → backend)                      │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (NestJS)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          Controllers                                 │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │    │
│  │  │ Guests │ │Souvenirs│ │ Prizes │ │ Events │ │  Auth  │ │ Public │ │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────┴───────────────────────────────────┐    │
│  │                           Services                                   │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │    │
│  │  │GuestsService│ │SouvenirsService│ │PrizesService│ │EventsService│       │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────┴───────────────────────────────────┐    │
│  │                        Common Services                               │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │ SSE Emitter │  │ JWT Service │  │Prisma Service│                  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE (PostgreSQL)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ Event  │ │ Guest  │ │Souvenir│ │ Prize  │ │PrizeWin│ │  User  │        │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
│  ┌────────────┐ ┌────────────┐                                             │
│  │SouvenirTake│ │PrizeCollect│                                             │
│  └────────────┘ └────────────┘                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer Description

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| Client | Browser | User interface, interaction |
| Frontend | Next.js 14 | SSR, routing, UI components, SSE client |
| Backend | NestJS | REST API, business logic, SSE server |
| Database | PostgreSQL | Data persistence |

---

## Folder Structure

### Monorepo Structure

```
Registrasi Tamu/
├── apps/
│   ├── frontend/                    # Next.js Application
│   │   ├── app/                     # App Router
│   │   │   ├── admin/               # Admin pages
│   │   │   │   ├── dashboard/       # Dashboard page
│   │   │   │   ├── guests/          # Guest management
│   │   │   │   │   ├── [id]/        # Edit guest
│   │   │   │   │   └── new/         # Add guest
│   │   │   │   ├── login/           # Admin login
│   │   │   │   ├── prizes/          # Prize management
│   │   │   │   ├── settings/        # Settings
│   │   │   │   │   ├── event/       # Event config
│   │   │   │   │   └── users/       # User management
│   │   │   │   ├── souvenirs/       # Souvenir management
│   │   │   │   └── statistics/      # Statistics page
│   │   │   ├── about/               # About page
│   │   │   ├── checkin/             # Guest check-in
│   │   │   ├── luckydraw/           # Lucky draw
│   │   │   ├── show/                # Display board
│   │   │   ├── souvenir/            # Souvenir check-in
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── page.tsx             # Home page
│   │   │   └── globals.css          # Global styles
│   │   ├── components/              # Shared components
│   │   │   ├── ui/                  # UI primitives
│   │   │   ├── RequireAuth.tsx      # Auth wrapper
│   │   │   ├── GuestStatsChart.tsx  # Chart component
│   │   │   └── CompanyStatsChart.tsx
│   │   ├── lib/                     # Utilities
│   │   │   ├── api.ts               # API helpers
│   │   │   └── sse-context.tsx      # SSE provider
│   │   ├── public/                  # Static assets
│   │   ├── next.config.js           # Next.js config
│   │   ├── tailwind.config.js       # Tailwind config
│   │   └── package.json
│   │
│   └── backend/                     # NestJS Application
│       ├── src/
│       │   ├── auth/                # Authentication
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── auth.module.ts
│       │   │   ├── jwt.strategy.ts
│       │   │   └── jwt-auth.guard.ts
│       │   ├── common/              # Shared utilities
│       │   │   └── sse.ts           # SSE emitter
│       │   ├── config/              # Config module
│       │   │   └── config.controller.ts
│       │   ├── events/              # Event management
│       │   │   ├── events.controller.ts
│       │   │   ├── events.service.ts
│       │   │   └── events.module.ts
│       │   ├── guests/              # Guest management
│       │   │   ├── guests.controller.ts
│       │   │   ├── guests.service.ts
│       │   │   ├── guests.module.ts
│       │   │   └── dto/
│       │   │       ├── create-guest.dto.ts
│       │   │       ├── update-guest.dto.ts
│       │   │       └── query-guests.dto.ts
│       │   ├── prizes/              # Prize management
│       │   │   ├── prizes.controller.ts
│       │   │   ├── prizes.service.ts
│       │   │   └── prizes.module.ts
│       │   ├── prisma/              # Prisma service
│       │   │   ├── prisma.service.ts
│       │   │   └── prisma.module.ts
│       │   ├── public/              # Public endpoints
│       │   │   └── public.controller.ts
│       │   ├── souvenirs/           # Souvenir management
│       │   │   ├── souvenirs.controller.ts
│       │   │   ├── souvenirs.service.ts
│       │   │   └── souvenirs.module.ts
│       │   ├── app.module.ts        # Root module
│       │   └── main.ts              # Entry point
│       ├── prisma/
│       │   ├── schema.prisma        # Database schema
│       │   └── migrations/          # DB migrations
│       ├── uploads/                 # Uploaded files
│       └── package.json
│
├── DOCUMENTATION.md                 # User documentation
├── TECHNICAL_BLUEPRINT.md           # This file
└── README.md
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│      Event       │
├──────────────────┤
│ id (PK)          │
│ name             │
│ date             │
│ location         │
│ logoUrl          │
│ backgroundType   │
│ backgroundImageUrl│
│ backgroundVideoUrl│
│ overlayOpacity   │
│ isActive         │
│ createdAt        │
│ updatedAt        │
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      Guest       │       │     Souvenir     │       │      Prize       │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ eventId (FK)     │       │ eventId (FK)     │       │ eventId (FK)     │
│ guestId          │       │ name             │       │ name             │
│ name             │       │ description      │       │ description      │
│ queueNumber      │       │ quantity         │       │ quantity         │
│ tableLocation    │       │ imageUrl         │       │ category         │
│ company          │       │ createdAt        │       │ allowMultipleWins│
│ division         │       │ updatedAt        │       │ createdAt        │
│ photoUrl         │       └────────┬─────────┘       │ updatedAt        │
│ notes            │                │                 └────────┬─────────┘
│ checkedIn        │                │                          │
│ checkedInAt      │                │                          │
│ checkedInById    │                │                          │
│ checkedInByName  │                │                          │
│ createdAt        │                │                          │
│ updatedAt        │                │                          │
└────────┬─────────┘                │                          │
         │                          │                          │
         │                          │                          │
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  SouvenirTake    │       │   PrizeWinner    │       │ PrizeCollection  │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ guestId (FK)     │◄──────│ guestId (FK)     │───────►│ prizeWinnerId(FK)│
│ souvenirId (FK)  │       │ prizeId (FK)     │       │ collectedAt      │
│ takenAt          │       │ wonAt            │       │ collectedById    │
│ takenById        │       └──────────────────┘       │ collectedByName  │
│ takenByName      │                                  └──────────────────┘
└──────────────────┘


┌──────────────────┐
│      User        │
├──────────────────┤
│ id (PK)          │
│ username         │
│ password (hash)  │
│ displayName      │
│ role             │
│ createdAt        │
│ updatedAt        │
└──────────────────┘
```

### Relationships Summary

| Parent | Child | Relationship | Description |
|--------|-------|--------------|-------------|
| Event | Guest | 1:N | Event has many guests |
| Event | Souvenir | 1:N | Event has many souvenirs |
| Event | Prize | 1:N | Event has many prizes |
| Guest | SouvenirTake | 1:N | Guest can take many souvenirs |
| Souvenir | SouvenirTake | 1:N | Souvenir taken by many guests |
| Guest | PrizeWinner | 1:N | Guest can win many prizes |
| Prize | PrizeWinner | 1:N | Prize can have many winners |
| PrizeWinner | PrizeCollection | 1:1 | Winner collects prize once |

---

## Data Flow Diagrams

### Guest Check-in Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GUEST CHECK-IN FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  START  │
    └────┬────┘
         │
         ▼
    ┌─────────────────┐
    │ Input Guest ID  │
    │   or Scan QR    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     GET /api/public/guests/search
    │  Search Guest   │────────────────────────────────────►┌──────────────┐
    │   in Database   │                                     │   Backend    │
    └────────┬────────┘◄────────────────────────────────────│   Service    │
             │                     Response                  └──────────────┘
             │
             ▼
    ┌─────────────────┐
    │ Results Found?  │
    └────────┬────────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
┌─────────┐    ┌──────────┐
│ 0 Found │    │ 1+ Found │
└────┬────┘    └────┬─────┘
     │              │
     ▼              │
┌──────────────┐    │
│Auto-Create   │    │
│  Enabled?    │    │
└──────┬───────┘    │
       │            │
   ┌───┴───┐        │
   │       │        │
   ▼       ▼        ▼
┌─────┐ ┌─────┐  ┌─────────────┐
│ No  │ │ Yes │  │ Count = 1?  │
└──┬──┘ └──┬──┘  └──────┬──────┘
   │       │            │
   │       │     ┌──────┴──────┐
   │       │     │             │
   │       ▼     ▼             ▼
   │  ┌─────────────┐   ┌─────────────┐
   │  │Create Guest │   │ Auto Select │
   │  │& Check-in   │   │ & Check-in  │
   │  └──────┬──────┘   └──────┬──────┘
   │         │                 │
   │         │                 │
   ▼         ▼                 │
┌─────────┐  │                 │
│ Show    │  │                 ▼
│ Error   │  │          ┌─────────────┐
└─────────┘  │          │ Count > 1?  │
             │          └──────┬──────┘
             │                 │
             │                 ▼
             │          ┌─────────────┐
             │          │Manual Select│
             │          │   Guest     │
             │          └──────┬──────┘
             │                 │
             │                 ▼
             │          ┌─────────────┐
             │          │  Check-in   │
             │          │   Guest     │
             │          └──────┬──────┘
             │                 │
             └────────┬────────┘
                      │
                      ▼
               ┌─────────────┐
               │ POST /api/  │
               │public/guests│
               │  /checkin   │
               └──────┬──────┘
                      │
                      ▼
               ┌─────────────┐
               │ Emit SSE    │
               │ 'checkin'   │
               └──────┬──────┘
                      │
                      ▼
               ┌─────────────┐
               │ Show Popup  │
               │ Confirmation│
               └──────┬──────┘
                      │
                      ▼
                 ┌─────────┐
                 │   END   │
                 └─────────┘
```

### Souvenir Distribution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SOUVENIR DISTRIBUTION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  START  │
    └────┬────┘
         │
         ▼
    ┌─────────────────┐
    │ Select Souvenir │
    │  from Dropdown  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  Input/Scan     │
    │  Guest ID       │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  Search Guest   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  Guest Found?   │
    └────────┬────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
  ┌───────┐    ┌───────────┐
  │  No   │    │   Yes     │
  └───┬───┘    └─────┬─────┘
      │              │
      ▼              ▼
┌──────────────┐  ┌─────────────────┐
│ Auto-Create? │  │ Souvenir Stock  │
└──────┬───────┘  │   Available?    │
       │          └────────┬────────┘
   ┌───┴───┐               │
   │       │        ┌──────┴──────┐
   ▼       ▼        │             │
┌─────┐ ┌──────┐    ▼             ▼
│Error│ │Create│  ┌─────┐    ┌─────────┐
└─────┘ │& Give│  │ No  │    │  Yes    │
        └──┬───┘  └──┬──┘    └────┬────┘
           │         │            │
           │         ▼            ▼
           │    ┌─────────┐  ┌─────────────┐
           │    │ Error:  │  │Give Souvenir│
           │    │Out Stock│  │  to Guest   │
           │    └─────────┘  └──────┬──────┘
           │                        │
           └────────────────────────┤
                                    │
                                    ▼
                             ┌─────────────┐
                             │ POST /api/  │
                             │souvenirs/   │
                             │   give      │
                             └──────┬──────┘
                                    │
                                    ▼
                             ┌─────────────┐
                             │ Update Stock│
                             │ Emit SSE    │
                             └──────┬──────┘
                                    │
                                    ▼
                             ┌─────────────┐
                             │Check Prizes │
                             │  to Collect │
                             └──────┬──────┘
                                    │
                                    ▼
                               ┌─────────┐
                               │   END   │
                               └─────────┘
```

### Lucky Draw Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LUCKY DRAW FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  START  │
    └────┬────┘
         │
         ▼
    ┌─────────────────┐
    │ Select Prize    │
    │  to Draw        │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Prize Quantity  │
    │  Available?     │
    └────────┬────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
  ┌───────┐    ┌───────────┐
  │  No   │    │   Yes     │
  └───┬───┘    └─────┬─────┘
      │              │
      ▼              ▼
┌──────────┐   ┌─────────────────┐
│  Error:  │   │ Click "PUTAR!"  │
│ All Given│   │    Button       │
└──────────┘   └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ POST /api/prizes│
               │   /:id/draw     │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Get Eligible    │
               │ Candidates      │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ allowMultiple   │
               │     Wins?       │
               └────────┬────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
    ┌───────────────┐      ┌───────────────┐
    │    False      │      │    True       │
    │ Only guests   │      │ Guests who    │
    │ who never won │      │ haven't won   │
    │ any prize     │      │ THIS prize    │
    └───────┬───────┘      └───────┬───────┘
            │                       │
            └───────────┬───────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Random Select   │
               │   1 Winner      │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Create Prize    │
               │ Winner Record   │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Start Animation │
               │ Slot Machine    │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Emit SSE        │
               │ 'prize_draw'    │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Display Winner  │
               │ with Confetti   │
               └────────┬────────┘
                        │
                        ▼
                   ┌─────────┐
                   │   END   │
                   └─────────┘
```

---

## API Flow

### Request/Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API REQUEST FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐                                            ┌──────────────┐
│   Browser    │                                            │   Database   │
└──────┬───────┘                                            └──────┬───────┘
       │                                                           │
       │  1. HTTP Request                                          │
       │  ─────────────────────►┌──────────────┐                   │
       │                        │  Next.js     │                   │
       │                        │  Frontend    │                   │
       │                        └──────┬───────┘                   │
       │                               │                           │
       │                 2. Proxy Rewrite (/api → backend)         │
       │                               │                           │
       │                        ┌──────▼───────┐                   │
       │                        │  NestJS      │                   │
       │                        │  Backend     │                   │
       │                        └──────┬───────┘                   │
       │                               │                           │
       │               3. JWT Auth Check (if protected)            │
       │                               │                           │
       │                        ┌──────▼───────┐                   │
       │                        │  Controller  │                   │
       │                        └──────┬───────┘                   │
       │                               │                           │
       │                 4. Business Logic                         │
       │                               │                           │
       │                        ┌──────▼───────┐                   │
       │                        │   Service    │                   │
       │                        └──────┬───────┘                   │
       │                               │                           │
       │                   5. Database Query                       │
       │                               │                           │
       │                        ┌──────▼───────┐    6. SQL Query   │
       │                        │   Prisma     │───────────────────►
       │                        │    ORM       │◄───────────────────
       │                        └──────┬───────┘    7. Result      │
       │                               │                           │
       │                   8. Transform Response                   │
       │                               │                           │
       │  ◄────────────────────────────┘                           │
       │   9. JSON Response                                        │
       │                                                           │
└──────┴───────────────────────────────────────────────────────────┘
```

### Protected vs Public Endpoints

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENDPOINT CLASSIFICATION                              │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │       All API Requests          │
                    └───────────────┬─────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │  Public Endpoints │           │Protected Endpoints│
        │   (/api/public/*) │           │    (/api/*)       │
        │   (/api/config/*) │           │                   │
        └─────────┬─────────┘           └─────────┬─────────┘
                  │                               │
                  │                               ▼
                  │                     ┌───────────────────┐
                  │                     │ JWT Auth Guard    │
                  │                     └─────────┬─────────┘
                  │                               │
                  │                     ┌─────────┴─────────┐
                  │                     │                   │
                  │                     ▼                   ▼
                  │             ┌───────────┐       ┌───────────┐
                  │             │  Valid    │       │  Invalid  │
                  │             │  Token    │       │  Token    │
                  │             └─────┬─────┘       └─────┬─────┘
                  │                   │                   │
                  │                   │                   ▼
                  │                   │           ┌───────────────┐
                  │                   │           │ 401 Unauthorized│
                  │                   │           └───────────────┘
                  │                   │
                  ▼                   ▼
        ┌───────────────────────────────────────┐
        │           Process Request             │
        │         Return Response               │
        └───────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND COMPONENT TREE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

RootLayout
├── SSEProvider (Context)
│   │
│   ├── HomePage (/)
│   │
│   ├── CheckinPage (/checkin)
│   │   ├── SearchInput
│   │   ├── QRScanner (Html5Qrcode)
│   │   ├── ResultsList
│   │   ├── GuestCard
│   │   ├── SettingsModal
│   │   └── ConfirmationPopup
│   │
│   ├── SouvenirPage (/souvenir)
│   │   ├── SouvenirDropdown
│   │   ├── SearchInput
│   │   ├── QRScanner
│   │   ├── ResultsList
│   │   ├── PrizeWinsList
│   │   ├── SettingsModal
│   │   └── ConfirmationPopup
│   │
│   ├── LuckyDrawPage (/luckydraw)
│   │   ├── PrizeSelector
│   │   ├── CandidateSlot (Animation)
│   │   ├── WinnerDisplay
│   │   └── ConfettiEffect
│   │
│   ├── ShowPage (/show)
│   │   ├── EventBranding
│   │   ├── CheckinStats
│   │   ├── RecentCheckins
│   │   └── WelcomePopup
│   │
│   ├── AboutPage (/about)
│   │   ├── HeroSection
│   │   ├── FeatureCards
│   │   ├── TechStack
│   │   └── Footer
│   │
│   └── AdminLayout (/admin/*)
│       │
│       ├── RequireAuth (HOC)
│       │   │
│       │   ├── DashboardPage
│       │   │   ├── StatsCards
│       │   │   ├── GuestStatsChart
│       │   │   └── QuickActions
│       │   │
│       │   ├── GuestsPage
│       │   │   ├── SearchBar
│       │   │   ├── FilterTabs
│       │   │   ├── GuestTable
│       │   │   ├── Pagination
│       │   │   ├── ImportCSVModal
│       │   │   └── ExportButton
│       │   │
│       │   ├── GuestEditPage
│       │   │   ├── GuestForm
│       │   │   └── PhotoUpload
│       │   │
│       │   ├── StatisticsPage
│       │   │   ├── StatsCards
│       │   │   ├── GuestStatsChart
│       │   │   ├── CompanyStatsChart
│       │   │   ├── SouvenirStatsChart
│       │   │   └── PrizeStatsChart
│       │   │
│       │   ├── SouvenirsPage
│       │   │   ├── SouvenirList
│       │   │   ├── AddSouvenirForm
│       │   │   └── EditSouvenirModal
│       │   │
│       │   ├── PrizesPage
│       │   │   ├── PrizeList
│       │   │   ├── AddPrizeForm
│       │   │   ├── WinnersList
│       │   │   └── DrawButton
│       │   │
│       │   └── SettingsPages
│       │       ├── EventSettingsPage
│       │       │   ├── EventForm
│       │       │   ├── LogoUpload
│       │       │   ├── BackgroundUpload
│       │       │   └── PreviewPanel
│       │       │
│       │       └── UsersPage
│       │           ├── UserList
│       │           └── AddUserForm
│       │
│       └── LoginPage (/admin/login)
│           └── LoginForm
```

---

## Real-time Communication

### SSE (Server-Sent Events) Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SSE COMMUNICATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Browser 1   │  │  Browser 2   │  │  Browser 3   │  │  Browser 4   │
│  (Admin)     │  │  (Check-in)  │  │  (Display)   │  │  (Stats)     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                 │
       │   EventSource   │   EventSource   │   EventSource   │   EventSource
       │   Connection    │   Connection    │   Connection    │   Connection
       │                 │                 │                 │
       └─────────────────┴─────────────────┴─────────────────┘
                                    │
                                    ▼
                         ┌────────────────────┐
                         │  GET /api/public/  │
                         │      stream        │
                         └──────────┬─────────┘
                                    │
                                    ▼
                         ┌────────────────────┐
                         │   SSE Controller   │
                         │   (Keep-Alive)     │
                         └──────────┬─────────┘
                                    │
                                    ▼
                         ┌────────────────────┐
                         │   Event Listener   │
                         │   (onEvent)        │
                         └──────────┬─────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ Action: Guest │         │Action: Souvenir│         │ Action: Prize │
│   Check-in    │         │    Given      │         │     Draw      │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ emitEvent()   │         │ emitEvent()   │         │ emitEvent()   │
│type: 'checkin'│         │type: 'souvenir│         │type: 'prize   │
│               │         │      _given'  │         │      _draw'   │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │
        └─────────────────────────┴─────────────────────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │ Broadcast to All   │
                         │ Connected Clients  │
                         └────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Browser 1   │         │  Browser 2   │         │  Browser 3   │
│  Updates UI  │         │  Updates UI  │         │  Updates UI  │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Event Types

| Event | Trigger | Data | Consumers |
|-------|---------|------|-----------|
| `checkin` | Guest checked in | Guest object | Dashboard, Stats, Show |
| `uncheckin` | Check-in cancelled | Guest object | Dashboard, Stats, Show |
| `guest-update` | Guest CRUD | Action type | Guest List |
| `souvenir_given` | Souvenir distributed | Take record | Souvenir, Stats |
| `souvenir_removed` | Souvenir revoked | IDs | Souvenir, Stats |
| `prize_draw` | Winner drawn | Prize + Winner | Lucky Draw, Stats |
| `prize_collected` | Prize picked up | Collection | Souvenir, Stats |
| `config` | Event config changed | Config object | All pages |
| `preview` | Live preview mode | Preview config | Settings |

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    User      │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Access Protected │
│    Route         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     No Token
│ Check LocalStorage├──────────────────►┌──────────────────┐
│   for JWT Token  │                    │ Redirect to      │
└────────┬─────────┘                    │ /admin/login     │
         │                              └────────┬─────────┘
         │ Has Token                             │
         ▼                                       ▼
┌──────────────────┐                    ┌──────────────────┐
│ Include Token in │                    │ Login Form       │
│ Request Header   │                    │ username/password│
│ Authorization:   │                    └────────┬─────────┘
│ Bearer <token>   │                             │
└────────┬─────────┘                             ▼
         │                              ┌──────────────────┐
         ▼                              │ POST /api/auth/  │
┌──────────────────┐                    │     login        │
│ JWT Auth Guard   │                    └────────┬─────────┘
│ (Backend)        │                             │
└────────┬─────────┘                             ▼
         │                              ┌──────────────────┐
         ▼                              │ Validate         │
┌──────────────────┐                    │ Credentials      │
│ Verify Token     │                    └────────┬─────────┘
│ - Signature      │                             │
│ - Expiration     │                    ┌────────┴────────┐
└────────┬─────────┘                    │                 │
         │                              ▼                 ▼
    ┌────┴────┐                    ┌─────────┐      ┌─────────┐
    │         │                    │  Valid  │      │ Invalid │
    ▼         ▼                    └────┬────┘      └────┬────┘
┌───────┐ ┌───────┐                     │                │
│ Valid │ │Invalid│                     ▼                ▼
└───┬───┘ └───┬───┘               ┌──────────┐    ┌──────────┐
    │         │                   │ Generate │    │ 401 Error│
    ▼         ▼                   │ JWT Token│    └──────────┘
┌────────┐ ┌────────┐             └────┬─────┘
│Process │ │  401   │                  │
│Request │ │  Error │                  ▼
└────────┘ └────────┘             ┌──────────────┐
                                  │ Store Token  │
                                  │ localStorage │
                                  └──────────────┘
```

---

## Feature Flowcharts

### Complete Event Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EVENT LIFECYCLE FLOWCHART                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           1. SETUP PHASE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │ Create  │───►│ Configure   │───►│ Import      │───►│ Setup       │      │
│  │ Event   │    │ Branding    │    │ Guest List  │    │ Souvenirs   │      │
│  └─────────┘    └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                              │               │
│                                                              ▼               │
│                                                       ┌─────────────┐       │
│                                                       │ Setup       │       │
│                                                       │ Prizes      │       │
│                                                       └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           2. EVENT DAY                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     PARALLEL OPERATIONS                              │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │    │
│  │  │  STATION 1  │   │  STATION 2  │   │  STATION 3  │               │    │
│  │  │  Check-in   │   │  Souvenir   │   │  Display    │               │    │
│  │  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘               │    │
│  │         │                 │                 │                       │    │
│  │         ▼                 ▼                 ▼                       │    │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │    │
│  │  │ Scan/Search │   │Select Souvenir│  │ Show Stats │               │    │
│  │  │   Guest     │   │  Give Guest  │   │ & Branding │               │    │
│  │  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘               │    │
│  │         │                 │                 │                       │    │
│  │         │                 │                 │                       │    │
│  │         └─────────────────┴─────────────────┘                       │    │
│  │                           │                                         │    │
│  │                           ▼                                         │    │
│  │                   ┌───────────────┐                                 │    │
│  │                   │ SSE Broadcast │                                 │    │
│  │                   │ All Stations  │                                 │    │
│  │                   │  Sync Data    │                                 │    │
│  │                   └───────────────┘                                 │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       LUCKY DRAW SESSION                             │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │    │
│  │  │ Select Prize│──►│  Draw       │──►│  Announce   │               │    │
│  │  │ Category    │   │  Winner     │   │  Winner     │               │    │
│  │  └─────────────┘   └─────────────┘   └─────────────┘               │    │
│  │                                             │                       │    │
│  │                                             ▼                       │    │
│  │                                      ┌─────────────┐               │    │
│  │                                      │ Winner Goes │               │    │
│  │                                      │ to Souvenir │               │    │
│  │                                      │  Station    │               │    │
│  │                                      └─────────────┘               │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           3. POST-EVENT                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │ View Final  │───►│ Export      │───►│ Archive     │                     │
│  │ Statistics  │    │ Reports     │    │ Event Data  │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │    Internet     │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  Load Balancer  │
                         │    (Optional)   │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
           ┌─────────────────┐        ┌─────────────────┐
           │   Frontend      │        │   Backend       │
           │   Container     │        │   Container     │
           │                 │        │                 │
           │  ┌───────────┐  │        │  ┌───────────┐  │
           │  │ Next.js   │  │        │  │  NestJS   │  │
           │  │  Server   │  │        │  │  Server   │  │
           │  └───────────┘  │        │  └───────────┘  │
           │                 │        │                 │
           │  Port: 3000     │        │  Port: 3001     │
           └────────┬────────┘        └────────┬────────┘
                    │                          │
                    │                          │
                    │         ┌────────────────┘
                    │         │
                    │         ▼
                    │  ┌─────────────────┐
                    │  │   PostgreSQL    │
                    │  │   Container     │
                    │  │                 │
                    │  │  Port: 5432     │
                    │  └─────────────────┘
                    │
                    ▼
           ┌─────────────────┐
           │  Static Files   │
           │   (Uploads)     │
           │                 │
           │  /api/uploads   │
           └─────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         NETWORK TOPOLOGY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                            Local Network (LAN)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │    │
│  │  │ Admin PC │  │ Check-in │  │ Display  │  │ Souvenir │            │    │
│  │  │          │  │  Tablet  │  │    TV    │  │  Tablet  │            │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │    │
│  │       │             │             │             │                   │    │
│  │       └─────────────┴─────────────┴─────────────┘                   │    │
│  │                           │                                         │    │
│  │                           ▼                                         │    │
│  │                    ┌────────────┐                                   │    │
│  │                    │   Router   │                                   │    │
│  │                    └─────┬──────┘                                   │    │
│  │                          │                                          │    │
│  │                          ▼                                          │    │
│  │                    ┌────────────┐                                   │    │
│  │                    │   Server   │                                   │    │
│  │                    │  (Host)    │                                   │    │
│  │                    │            │                                   │    │
│  │                    │ Frontend   │                                   │    │
│  │                    │ Backend    │                                   │    │
│  │                    │ Database   │                                   │    │
│  │                    └────────────┘                                   │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

Dokumen ini menjelaskan:

1. **System Architecture** - High-level view of all system components
2. **Folder Structure** - Complete project organization
3. **Database Schema** - Entity relationships and data model
4. **Data Flow Diagrams** - How data moves through the system
5. **API Flow** - Request/response lifecycle
6. **Component Architecture** - Frontend component hierarchy
7. **Real-time Communication** - SSE event flow
8. **Authentication Flow** - JWT-based auth process
9. **Feature Flowcharts** - Detailed flow for each feature
10. **Deployment Architecture** - Production deployment setup

---

*Technical Blueprint - Last Updated: November 2025*

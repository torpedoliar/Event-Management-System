# Project Context: Guest Registration & Check-in System

## Project Overview

This is an **enterprise-grade event management solution** built with a monorepo architecture featuring:

- **Frontend**: Next.js 15 with React 18, Tailwind CSS, and TypeScript
- **Backend**: NestJS 10 with TypeScript, Prisma ORM
- **Database**: PostgreSQL 14
- **Deployment**: Docker Compose (production-ready with HTTPS)

The system provides real-time guest registration, QR code check-in, souvenir distribution, lucky draw functionality, and public display screens with live updates via Server-Sent Events (SSE).

## Repository Structure

```
E:\Vibe\Registrasi Tamu\
├── apps/
│   ├── backend/                 # NestJS API Server
│   │   ├── prisma/              # Database schema, migrations, seeds
│   │   ├── src/
│   │   │   ├── auth/            # JWT authentication
│   │   │   ├── guests/          # Guest CRUD & check-in
│   │   │   ├── prizes/          # Lucky draw management
│   │   │   ├── souvenirs/       # Souvenir inventory
│   │   │   ├── events/          # Event configuration
│   │   │   ├── config/          # Settings & email config
│   │   │   ├── public/          # Public endpoints & SSE
│   │   │   ├── common/          # Shared utilities (SSE emitter)
│   │   │   └── main.ts          # Entry point
│   │   └── uploads/             # User-uploaded files
│   │
│   └── frontend/                # Next.js Web App
│       ├── app/
│       │   ├── admin/           # Admin dashboard (guests, prizes, settings)
│       │   ├── checkin/         # Check-in station with QR scanner
│       │   ├── luckydraw/       # Lucky draw slot machine
│       │   ├── show/            # Public display screen
│       │   ├── souvenir/        # Souvenir distribution
│       │   └── about/           # About page
│       ├── components/          # Shared UI components
│       └── lib/                 # Utilities (API client, SSE context)
│
├── certs/                       # SSL certificates
├── docs/                        # Documentation files
├── backup-*.bat                 # Backup scripts
├── deploy-prod.bat              # One-click production deployment
├── docker-compose.prod.yml      # Production Docker config
├── docker-compose.dev-https.yml # Development HTTPS config
└── .env.production              # Production environment variables
```

## Building and Running

### Prerequisites

- Node.js ≥ 18.x
- Docker & Docker Compose (latest)
- OpenSSL (for HTTPS certificate generation)

### Production Deployment (Recommended)

```batch
# One-click deploy (Windows)
deploy-prod.bat
```

This script:
1. Validates environment variables
2. Generates SSL certificates (if missing)
3. Backs up existing database
4. Builds and starts all containers
5. Waits for services to be healthy

**Access URLs after deployment:**
- Admin Panel: `https://localhost:443/admin/login`
- Check-in Station: `https://localhost:443/checkin`
- Souvenir: `https://localhost:443/souvenir`
- Lucky Draw: `https://localhost:443/luckydraw`
- Public Display: `https://localhost:443/show`

### Manual Development Setup

#### Backend

```batch
cd apps\backend

# Install dependencies
npm install

# Copy and configure environment
copy .env.example .env

# Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate
npm run seed

# Start development server
npm run dev
```

#### Frontend

```batch
cd apps\frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Docker Commands Reference

| Command | Description |
|---------|-------------|
| `docker compose -f docker-compose.prod.yml up -d` | Start production stack |
| `docker compose -f docker-compose.prod.yml down` | Stop all containers |
| `docker compose -f docker-compose.prod.yml logs -f` | View live logs |
| `docker compose -f docker-compose.prod.yml build --no-cache` | Rebuild images |
| `docker exec guest-db-prod pg_dump -U postgres guest_registry > backup.sql` | Backup database |

## Key Features

### Guest Management
- CRUD operations with search/filter
- Bulk import via CSV/Excel
- QR code generation and scanning
- Multiple check-in tracking per guest
- Category-based segmentation (VIP, VVIP, Regular, etc.)

### Check-in System
- Webcam-based QR code scanning (html5-qrcode)
- Manual search fallback
- Auto-create guest option for walk-ins
- Real-time counter updates
- Duplicate prevention

### Lucky Draw
- Slot machine animation
- Configurable prize categories
- Winner history tracking
- Prize collection management
- Confetti celebration effect

### Souvenir Distribution
- Inventory tracking
- Guest-based distribution
- Lucky draw prize collection integration
- Stock level alerts

### Real-time Features
- Server-Sent Events (SSE) for live updates
- Multi-device synchronization
- Public display auto-refresh
- Check-in notifications

## Database Schema

### Core Entities

| Entity | Description |
|--------|-------------|
| `Event` | Event configuration (name, date, branding, settings) |
| `Guest` | Guest records with check-in status |
| `GuestCheckin` | Multiple check-in tracking |
| `Prize` | Lucky draw prizes |
| `PrizeWinner` | Prize draw results |
| `PrizeCollection` | Prize pickup tracking |
| `Souvenir` | Souvenir inventory |
| `SouvenirTake` | Distribution records |
| `AdminUser` | Admin accounts |
| `EmailSettings` | SMTP configuration |
| `EmailLog` | Email sending history |
| `AuditLog` | System audit trail |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login

### Guests
- `GET /api/guests` - List guests (paginated)
- `GET /api/guests/:id` - Get guest by ID
- `POST /api/guests` - Create guest
- `PUT /api/guests/:id` - Update guest
- `DELETE /api/guests/:id` - Delete guest
- `POST /api/guests/import` - Bulk import
- `GET /api/guests/export` - Export to CSV

### Public (No Auth)
- `GET /api/public/guests/search?q=` - Search guest
- `POST /api/public/guests/checkin` - Check-in guest
- `GET /api/public/events` - Get event config
- `GET /api/public/sse` - SSE endpoint for real-time updates

### Prizes
- `GET /api/prizes` - List prizes
- `POST /api/prizes/:id/draw` - Conduct lucky draw
- `POST /api/prizes/winners/:id/collect` - Mark prize collected

### Souvenirs
- `GET /api/souvenirs` - List souvenirs
- `POST /api/souvenirs/give` - Give souvenir to guest

### Settings
- `GET /api/config` - Get configuration
- `PUT /api/config` - Update configuration
- `POST /api/config/upload` - Upload assets (logo, background)

## Environment Variables

### Production (`.env.production`)

| Variable | Required | Description |
|----------|:--------:|-------------|
| `DB_USER` | ✅ | PostgreSQL username |
| `DB_PASSWORD` | ✅ | PostgreSQL password |
| `DB_NAME` | ✅ | Database name |
| `JWT_SECRET` | ✅ | JWT signing secret (min 32 chars) |
| `ADMIN_USERNAME` | ✅ | Admin username |
| `ADMIN_PASSWORD` | ✅ | Admin password |
| `FRONTEND_PORT` | ❌ | Frontend port (default: 443) |
| `BACKEND_PORT` | ❌ | Backend port (default: 4000) |
| `SMTP_HOST` | ❌ | Email server host |
| `SMTP_PORT` | ❌ | Email server port |
| `SMTP_USER` | ❌ | Email username |
| `SMTP_PASS` | ❌ | Email password |
| `SMTP_FROM` | ❌ | Sender email address |
| `CORS_ORIGIN` | ❌ | Allowed CORS origins |

## Development Conventions

### Code Style
- **TypeScript**: Strict mode enabled
- **Backend**: NestJS modular architecture with DTOs for validation
- **Frontend**: React functional components with hooks, React Query for data fetching
- **Naming**: camelCase for variables/functions, PascalCase for components/classes

### Testing Practices
- Run backend tests: `npm test` (in `apps/backend`)
- Run frontend tests: `npm test` (in `apps/frontend`)

### Git Workflow
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Commits follow conventional commit format

### File Organization
- Backend: Module-based (`src/module-name/`)
- Frontend: Route-based (`app/route-name/`)
- Shared types: Keep in respective `lib/` or `common/` folders

## Common Tasks

### Add New Guest Programmatically
```typescript
// Backend service example
await prisma.guest.create({
  data: {
    guestId: 'G001',
    name: 'John Doe',
    tableLocation: 'Table A1',
    company: 'PT ABC',
    eventId: 'event-uuid'
  }
});
```

### Trigger SSE Event
```typescript
// In any service with SseService injected
this.sseService.emit('checkin', guestData);
```

### Upload File
Files are stored in `apps/backend/uploads/` and served at `/api/uploads/:filename`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera not working | Ensure HTTPS or localhost access; browsers block webcam on HTTP |
| SSE not connecting | Check network/firewall; verify backend is running |
| Database connection failed | Check `DATABASE_URL` and container health |
| SSL certificate errors | Run `generate-ssl.bat` or access via `localhost` |
| Container won't start | Check logs: `docker logs guest-<service>-prod` |

## Scripts Reference

| Script | Location | Description |
|--------|----------|-------------|
| `deploy-prod.bat` | Root | Full production deployment |
| `backup-docker.bat` | Root | Backup database and uploads |
| `restore-docker.bat` | Root | Restore from backup |
| `generate-ssl.bat` | Root | Generate self-signed SSL certs |
| `renew-ssl.bat` | Root | Renew SSL certificates |
| `update.bat` | Root | Update and redeploy |
| `start-dev-docker-https.bat` | Root | Start dev with HTTPS |

## Additional Documentation

- `README.md` - Project overview and quick start
- `TECHNICAL_BLUEPRINT.md` - Detailed architecture diagrams and flowcharts
- `USER_GUIDE.md` - End-user instructions
- `DOCUMENTATION.md` - Comprehensive feature documentation
- `CHANGELOG.md` - Version history
- `docs/` - Additional guides (API, deployment, Docker)

## Qwen Added Memories
- Multi-Station Offline Mode feature implementation for Guest Registration system - 25% complete as of 2026-04-15. Completed: design spec, Prisma schema updates (CheckinStation model, GuestCheckin offline fields, Event offline settings), Station management backend module (controller, service, DTOs). Pending: database migration, offline check-in endpoint, bulk sync endpoint with conflict resolution, health check endpoint, frontend implementation (IndexedDB, sync service, UI components), testing. Implementation files in apps/backend/src/stations/ and apps/backend/src/guests/dto/offline-checkin.dto.ts. Progress tracked in docs/superpowers/IMPLEMENTATION_PROGRESS.md.

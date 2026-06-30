# Graph Report - Registrasi Tamu  (2026-06-29)

## Corpus Check
- 233 files · ~181,389 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1303 nodes · 2281 edges · 85 communities (53 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5aaeb5ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Guest Management|Guest Management]]
- [[_COMMUNITY_Landing Page Backend|Landing Page Backend]]
- [[_COMMUNITY_Frontend Core Layout|Frontend Core Layout]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Landing Page Components|Landing Page Components]]
- [[_COMMUNITY_Lucky Draw|Lucky Draw]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_IndexedDB Service|IndexedDB Service]]
- [[_COMMUNITY_Admin Settings|Admin Settings]]
- [[_COMMUNITY_Check-in & Show|Check-in & Show]]
- [[_COMMUNITY_Offline Sync Service|Offline Sync Service]]
- [[_COMMUNITY_Stations & Users|Stations & Users]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_NestJS App Modules|NestJS App Modules]]
- [[_COMMUNITY_Backend Core Services|Backend Core Services]]
- [[_COMMUNITY_Admin Dashboard|Admin Dashboard]]
- [[_COMMUNITY_Statistics & Charts|Statistics & Charts]]
- [[_COMMUNITY_Email Service|Email Service]]
- [[_COMMUNITY_Logger Service|Logger Service]]
- [[_COMMUNITY_Souvenir & Queue|Souvenir & Queue]]
- [[_COMMUNITY_Guest Edit & Landing|Guest Edit & Landing]]
- [[_COMMUNITY_Service Worker|Service Worker]]
- [[_COMMUNITY_Frontend Config|Frontend Config]]
- [[_COMMUNITY_Check-in UI|Check-in UI]]
- [[_COMMUNITY_Service Worker|Service Worker]]
- [[_COMMUNITY_Souvenirs Backend|Souvenirs Backend]]
- [[_COMMUNITY_Stations Backend|Stations Backend]]
- [[_COMMUNITY_Service Worker|Service Worker]]
- [[_COMMUNITY_Authentication|Authentication]]
- [[_COMMUNITY_SSE & Souvenirs|SSE & Souvenirs]]
- [[_COMMUNITY_Offline Types|Offline Types]]
- [[_COMMUNITY_Storage & Events|Storage & Events]]
- [[_COMMUNITY_Reports|Reports]]
- [[_COMMUNITY_Frontend Hooks|Frontend Hooks]]
- [[_COMMUNITY_Events Service|Events Service]]
- [[_COMMUNITY_Backend Config|Backend Config]]
- [[_COMMUNITY_Guards & SSE|Guards & SSE]]
- [[_COMMUNITY_Events Controller|Events Controller]]
- [[_COMMUNITY_Lucky Draw Page|Lucky Draw Page]]
- [[_COMMUNITY_Connection Status|Connection Status]]
- [[_COMMUNITY_Service Worker|Service Worker]]
- [[_COMMUNITY_Public Checkin API|Public Checkin API]]
- [[_COMMUNITY_Server Config|Server Config]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Prizes Service|Prizes Service]]
- [[_COMMUNITY_Prizes Controller|Prizes Controller]]
- [[_COMMUNITY_Guests Admin Page|Guests Admin Page]]
- [[_COMMUNITY_IndexedDB Utils|IndexedDB Utils]]
- [[_COMMUNITY_Service Worker|Service Worker]]
- [[_COMMUNITY_Backend Scripts|Backend Scripts]]
- [[_COMMUNITY_Service Worker|Service Worker]]
- [[_COMMUNITY_Package Config|Package Config]]
- [[_COMMUNITY_Audit Controller|Audit Controller]]
- [[_COMMUNITY_Events DTOs|Events DTOs]]
- [[_COMMUNITY_Lazy Modal|Lazy Modal]]
- [[_COMMUNITY_Landing Capabilities|Landing Capabilities]]
- [[_COMMUNITY_Landing TrustStrip|Landing TrustStrip]]
- [[_COMMUNITY_Image Utils|Image Utils]]
- [[_COMMUNITY_Next Config|Next Config]]
- [[_COMMUNITY_Next Config|Next Config]]
- [[_COMMUNITY_Rapid Scan Script|Rapid Scan Script]]
- [[_COMMUNITY_Souvenir Scan Script|Souvenir Scan Script]]
- [[_COMMUNITY_Deploy Script|Deploy Script]]
- [[_COMMUNITY_Update Script|Update Script]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]

## God Nodes (most connected - your core abstractions)
1. `IndexedDBService` - 42 edges
2. `emitEvent()` - 40 edges
3. `GuestsService` - 36 edges
4. `PrismaService` - 33 edges
5. `OfflineSyncService` - 33 edges
6. `useSSE()` - 31 edges
7. `toApiUrl()` - 28 edges
8. `EventsService` - 27 edges
9. `LandingPageService` - 24 edges
10. `apiBase()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `EditGuestPage()` --calls--> `toApiUrl()`  [EXTRACTED]
  apps/frontend/app/(main)/admin/guests/[id]/page.tsx → apps/frontend/lib/api.ts
- `GuestsListPage()` --calls--> `useSSE()`  [EXTRACTED]
  apps/frontend/app/(main)/admin/guests/page.tsx → apps/frontend/lib/sse-context.tsx
- `LoginPage()` --calls--> `toApiUrl()`  [EXTRACTED]
  apps/frontend/app/(main)/admin/login/page.tsx → apps/frontend/lib/api.ts
- `EventSettingsPage()` --calls--> `toApiUrl()`  [EXTRACTED]
  apps/frontend/app/(main)/admin/settings/event/page.tsx → apps/frontend/lib/api.ts
- `UsersManagementPage()` --calls--> `useSSE()`  [EXTRACTED]
  apps/frontend/app/(main)/admin/settings/users/page.tsx → apps/frontend/lib/sse-context.tsx

## Import Cycles
- None detected.

## Communities (85 total, 32 thin omitted)

### Community 0 - "Guest Management"
Cohesion: 0.10
Nodes (9): BulkDeleteGuestsDto, BulkUpdateGuestsDto, CreateGuestDto, GuestCategory, QueryGuestsDto, UpdateGuestDto, formatLocalTime(), truncateText() (+1 more)

### Community 1 - "Landing Page Backend"
Cohesion: 0.07
Nodes (8): CreateFeatureDto, UpdateFeatureDto, UpdateLandingConfigDto, IMAGE_FILTER, IMAGE_LIMITS, LandingPageController, LandingPageModule, LandingPageService

### Community 2 - "Frontend Core Layout"
Cohesion: 0.19
Nodes (6): Skeleton(), SkeletonCard(), SkeletonChart(), SkeletonProps, SkeletonTable(), cn()

### Community 3 - "Frontend Dependencies"
Cohesion: 0.05
Nodes (40): dependencies, canvas-confetti, clsx, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, @ducanh2912/next-pwa, html5-qrcode (+32 more)

### Community 4 - "Landing Page Components"
Cohesion: 0.06
Nodes (22): EventConfig, getEventConfig(), getLandingPageData(), LandingPage(), LandingPageData, Feature, FeatureImage, FeaturesProps (+14 more)

### Community 5 - "Lucky Draw"
Cohesion: 0.06
Nodes (23): FESTIVE_COLORS, FINALE_CONFETTI, GRAND_CONFETTI, Prize, REGULAR_CONFETTI, TICKER_COLORS, FINALE_CONFETTI, GRAND_CONFETTI (+15 more)

### Community 6 - "Backend Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, bcrypt, cache-manager, cache-manager-redis-yet, class-transformer, class-validator, compression, dotenv (+25 more)

### Community 8 - "Admin Settings"
Cohesion: 0.08
Nodes (28): CalendarDay, Event, Event, EventStats, KanbanColumn, ViewMode, EventConfig, LoginPage() (+20 more)

### Community 9 - "Check-in & Show"
Cohesion: 0.10
Nodes (27): CheckinPage(), CarouselDrawPage(), LiveDisplayPage(), LuckyDrawPage(), AutoScrollWinnersPage(), Prize, Winner, EventConfig (+19 more)

### Community 11 - "Stations & Users"
Cohesion: 0.07
Nodes (13): PrismaModule, RegisterStationDto, ListStationsResponseDto, StationResponseDto, StationsController, StationsModule, StationsService, ChangePasswordDto (+5 more)

### Community 12 - "UI Components"
Cohesion: 0.11
Nodes (20): Alert(), config, Props, Variant, Badge(), Props, styles, Variant (+12 more)

### Community 13 - "NestJS App Modules"
Cohesion: 0.27
Nodes (6): AuditModule, EmailModule, EventsModule, GuestsModule, PublicModule, SouvenirsModule

### Community 14 - "Backend Core Services"
Cohesion: 0.18
Nodes (9): AuditLog, AuditStats, formatUptime(), HealthStatus, LogEntry, LogFile, LogStats, SystemPage() (+1 more)

### Community 15 - "Admin Dashboard"
Cohesion: 0.19
Nodes (11): GuestStatsChart, CATEGORY_OPTIONS, GuestCategory, Prize, PRIZE_CATEGORIES, Souvenir, SouvenirTake, RequireAuth() (+3 more)

### Community 16 - "Statistics & Charts"
Cohesion: 0.10
Nodes (17): colorMap, CompanyStats, PrizeStats, SouvenirStats, StatisticsPage(), Stats, COLORS, CompanyStats (+9 more)

### Community 18 - "Logger Service"
Cohesion: 0.12
Nodes (4): LoggerController, LoggerModule, LogEntry, LoggerService

### Community 19 - "Souvenir & Queue"
Cohesion: 0.13
Nodes (15): EventConfig, Guest, PrizeWin, Souvenir, SouvenirTakeInfo, QueueManagementPanelProps, StationSetupModalProps, LocalGuest (+7 more)

### Community 20 - "Guest Edit & Landing"
Cohesion: 0.09
Nodes (18): CATEGORY_OPTIONS, EditGuestPage(), Guest, GuestCategory, CATEGORY_CONFIG, Guest, GuestCategory, GuestCheckin (+10 more)

### Community 21 - "Service Worker"
Cohesion: 0.18
Nodes (4): a, get(), h(), k()

### Community 22 - "Frontend Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+12 more)

### Community 23 - "Check-in UI"
Cohesion: 0.04
Nodes (46): A. Admin Tournament List (`/admin/tournaments`), API Endpoints, Architecture, B. Create/Edit Tournament (`/admin/tournaments/new` atau `/[id]/edit`), Backend Architecture & Data Model, Backend Module Structure, Bracket Engine Logic, Bracket Rendering Strategy (+38 more)

### Community 24 - "Service Worker"
Cohesion: 0.13
Nodes (9): b(), constructor(), deleteCacheAndMetadata(), et, F, G, i, O() (+1 more)

### Community 27 - "Service Worker"
Cohesion: 0.29
Nodes (6): m(), s, st(), T(), U(), v

### Community 28 - "Authentication"
Cohesion: 0.16
Nodes (5): AuthController, AuthModule, AuthService, LoginDto, JwtStrategy

### Community 30 - "Offline Types"
Cohesion: 0.12
Nodes (14): ConnectionStatusIndicatorProps, ConnectionInfo, ConnectionStatus, StatusListener, ConnectionStatus, HealthCheckResponse, OfflineCheckinRequest, OfflineCheckinResponse (+6 more)

### Community 31 - "Storage & Events"
Cohesion: 0.23
Nodes (6): backgroundsStorage(), landingPageStorage(), logosStorage(), photosStorage(), soundsStorage(), CreateEventDto

### Community 32 - "Reports"
Cohesion: 0.18
Nodes (4): ReportsController, ReportsModule, ReportOptions, ReportsService

### Community 33 - "Frontend Hooks"
Cohesion: 0.13
Nodes (9): DashboardPage(), Event, Guest, GuestListResponse, queryKeys, Stats, useActiveEvent(), useGuestStats() (+1 more)

### Community 35 - "Backend Config"
Cohesion: 0.13
Nodes (14): compilerOptions, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, module, moduleResolution, outDir (+6 more)

### Community 36 - "Guards & SSE"
Cohesion: 0.08
Nodes (25): Backend Files (Phase 1-3), Code Quality Checklist (Run Before Each Commit), Context Management, Error Recovery, Execution Approaches, File Structure, Frontend Files (Phase 1-3), Global Constraints (+17 more)

### Community 38 - "Lucky Draw Page"
Cohesion: 0.14
Nodes (11): DRAMA_CONFIGS, DramaConfig, EligibleGuest, EligibleGuestsResponse, FINALE_CONFETTI, GRAND_CONFETTI, Guest, Prize (+3 more)

### Community 41 - "Public Checkin API"
Cohesion: 0.32
Nodes (4): emitter, onEvent(), ServerEvent, reqOnClose()

### Community 42 - "Server Config"
Cohesion: 0.15
Nodes (10): config, app, { createServer }, { createServer: createHttpServer }, fs, handle, https, next (+2 more)

### Community 43 - "Dev Dependencies"
Cohesion: 0.17
Nodes (12): devDependencies, prisma, ts-node, ts-node-dev, @types/bcrypt, @types/compression, @types/express, @types/multer (+4 more)

### Community 47 - "IndexedDB Utils"
Cohesion: 0.36
Nodes (10): CreateTournamentDto, UpdateTournamentDto, MatchStatus, ParticipantType, SchedulingMode, ScoringConfig, ScoringMode, SportType (+2 more)

### Community 48 - "Service Worker"
Cohesion: 0.27
Nodes (3): j(), q(), r

### Community 49 - "Backend Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, prisma:deploy, prisma:generate, prisma:migrate, seed, start

### Community 51 - "Package Config"
Cohesion: 0.40
Nodes (4): main, name, private, version

### Community 52 - "Audit Controller"
Cohesion: 0.13
Nodes (4): AuditAction, AuditLogInput, AuditService, PrismaService

### Community 55 - "Landing Capabilities"
Cohesion: 0.50
Nodes (3): OfflineCheckinDto, SyncBatchDto, SyncBatchItemDto

### Community 71 - "Community 71"
Cohesion: 0.24
Nodes (6): cinzel, inter, jetbrainsMono, metadata, QueryProvider(), SSEProvider()

### Community 75 - "Community 75"
Cohesion: 0.18
Nodes (8): DEFAULT_CONFIG, Feature, FeatureCardProps, FeatureImage, GalleryImage, HeroImage, LandingConfig, LandingPageAdminData

### Community 77 - "Community 77"
Cohesion: 0.50
Nodes (3): BulkSendEmailDto, EmailSettingsDto, SendEmailDto

### Community 80 - "Community 80"
Cohesion: 0.19
Nodes (7): AppModule, bootstrap(), compression, BracketEngineService, GeneratedMatch, TeamSeed, TournamentsModule

### Community 81 - "Community 81"
Cohesion: 0.29
Nodes (4): EventConfig, Guest, GuestCheckin, ScanLogItem

## Knowledge Gaps
- **420 isolated node(s):** `TeamSeed`, `GeneratedMatch`, `name`, `version`, `private` (+415 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiFetch()` connect `Admin Dashboard` to `Frontend Hooks`, `Landing Page Components`, `Lucky Draw`, `Lucky Draw Page`, `Admin Settings`, `Check-in & Show`, `Backend Core Services`, `Statistics & Charts`, `Souvenir & Queue`, `Guest Edit & Landing`, `Service Worker`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `PrismaService` connect `Audit Controller` to `Guest Management`, `Landing Page Backend`, `Events Service`, `Reports`, `Public Checkin API`, `Stations & Users`, `Prizes Service`, `Community 77`, `NestJS App Modules`, `Email Service`, `Events DTOs`, `Souvenirs Backend`, `Authentication`, `Storage & Events`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `LandingPageService` connect `Landing Page Backend` to `Audit Controller`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `TeamSeed`, `GeneratedMatch`, `name` to the rest of the system?**
  _420 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Guest Management` be split into smaller, more focused modules?**
  _Cohesion score 0.09797979797979799 - nodes in this community are weakly interconnected._
- **Should `Landing Page Backend` be split into smaller, more focused modules?**
  _Cohesion score 0.07102040816326531 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
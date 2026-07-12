# Graph Report - E:/Vibe/Registrasi Tamu  (2026-07-12)

## Corpus Check
- 317 files · ~256,653 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1555 nodes · 3134 edges · 98 communities (70 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Guest Management|Guest Management]]
- [[_COMMUNITY_IndexedDB & Offline Storage|IndexedDB & Offline Storage]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Landing Page UI|Landing Page UI]]
- [[_COMMUNITY_Admin Event & Checkin|Admin Event & Checkin]]
- [[_COMMUNITY_Public Registration & Forms|Public Registration & Forms]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_Login & Registration Pages|Login & Registration Pages]]
- [[_COMMUNITY_Public Registration Backend|Public Registration Backend]]
- [[_COMMUNITY_Offline Sync Service|Offline Sync Service]]
- [[_COMMUNITY_Tournament Live Match|Tournament Live Match]]
- [[_COMMUNITY_Tournament Team Management|Tournament Team Management]]
- [[_COMMUNITY_Tournament Service & SSE|Tournament Service & SSE]]
- [[_COMMUNITY_Backend Core Infrastructure|Backend Core Infrastructure]]
- [[_COMMUNITY_Backend Module Config|Backend Module Config]]
- [[_COMMUNITY_Tournament Controller|Tournament Controller]]
- [[_COMMUNITY_Email Service|Email Service]]
- [[_COMMUNITY_Admin System Page|Admin System Page]]
- [[_COMMUNITY_Users Management|Users Management]]
- [[_COMMUNITY_Root Layout & Error Handling|Root Layout & Error Handling]]
- [[_COMMUNITY_Auth & Audit|Auth & Audit]]
- [[_COMMUNITY_Logger Service|Logger Service]]
- [[_COMMUNITY_Statistics & Charts|Statistics & Charts]]
- [[_COMMUNITY_Tournament Form|Tournament Form]]
- [[_COMMUNITY_Guests Controller|Guests Controller]]
- [[_COMMUNITY_Tournament Types & DTOs|Tournament Types & DTOs]]
- [[_COMMUNITY_Tournament Team UI|Tournament Team UI]]
- [[_COMMUNITY_Service Worker|Service Worker]]
- [[_COMMUNITY_Frontend tsconfig|Frontend tsconfig]]
- [[_COMMUNITY_Dashboard & Guest Hooks|Dashboard & Guest Hooks]]
- [[_COMMUNITY_Event Selection & Navigation|Event Selection & Navigation]]
- [[_COMMUNITY_Checkin Page & Buttons|Checkin Page & Buttons]]
- [[_COMMUNITY_Souvenir Page & Queue|Souvenir Page & Queue]]
- [[_COMMUNITY_Service Worker Cache|Service Worker Cache]]
- [[_COMMUNITY_Souvenirs Backend|Souvenirs Backend]]
- [[_COMMUNITY_Stations Management|Stations Management]]
- [[_COMMUNITY_Cache Strategy|Cache Strategy]]
- [[_COMMUNITY_Public Checkin API|Public Checkin API]]
- [[_COMMUNITY_Landing Page Storage|Landing Page Storage]]
- [[_COMMUNITY_Events Controller|Events Controller]]
- [[_COMMUNITY_Landing Page Service|Landing Page Service]]
- [[_COMMUNITY_Connection Status|Connection Status]]
- [[_COMMUNITY_Auth Backend|Auth Backend]]
- [[_COMMUNITY_Reports Service|Reports Service]]
- [[_COMMUNITY_Prizes Backend|Prizes Backend]]
- [[_COMMUNITY_Souvenirs Controller|Souvenirs Controller]]
- [[_COMMUNITY_Storage & Events|Storage & Events]]
- [[_COMMUNITY_Events Service|Events Service]]
- [[_COMMUNITY_Landing Page Controller|Landing Page Controller]]
- [[_COMMUNITY_Backend tsconfig|Backend tsconfig]]
- [[_COMMUNITY_Page Navigation|Page Navigation]]
- [[_COMMUNITY_Tournament Bracket Components|Tournament Bracket Components]]
- [[_COMMUNITY_Tournament Bracket Layout|Tournament Bracket Layout]]
- [[_COMMUNITY_Tournament Checkin DTOs|Tournament Checkin DTOs]]
- [[_COMMUNITY_Lucky Draw Carousel|Lucky Draw Carousel]]
- [[_COMMUNITY_Lucky Draw Page|Lucky Draw Page]]
- [[_COMMUNITY_Tournament Utilities|Tournament Utilities]]
- [[_COMMUNITY_Connection Status Service|Connection Status Service]]
- [[_COMMUNITY_Workbox Cache|Workbox Cache]]
- [[_COMMUNITY_Lucky Draw Display|Lucky Draw Display]]
- [[_COMMUNITY_Server & Middleware|Server & Middleware]]
- [[_COMMUNITY_Backend Dev Dependencies|Backend Dev Dependencies]]
- [[_COMMUNITY_Admin Guests Page|Admin Guests Page]]
- [[_COMMUNITY_Tournament Checkin Page|Tournament Checkin Page]]
- [[_COMMUNITY_API Client|API Client]]
- [[_COMMUNITY_Souvenir UI Components|Souvenir UI Components]]
- [[_COMMUNITY_Tournament Bracket Pages|Tournament Bracket Pages]]
- [[_COMMUNITY_Lucky Draw Winners|Lucky Draw Winners]]
- [[_COMMUNITY_Guest Stats Chart|Guest Stats Chart]]
- [[_COMMUNITY_Show Page|Show Page]]
- [[_COMMUNITY_Company Stats Chart|Company Stats Chart]]
- [[_COMMUNITY_Landing Page Capabilities|Landing Page Capabilities]]
- [[_COMMUNITY_Product Showcase|Product Showcase]]
- [[_COMMUNITY_Trust Strip|Trust Strip]]
- [[_COMMUNITY_Image Utils|Image Utils]]
- [[_COMMUNITY_Tournament Checkin Backend|Tournament Checkin Backend]]
- [[_COMMUNITY_Prizes Controller|Prizes Controller]]
- [[_COMMUNITY_Prizes Page|Prizes Page]]
- [[_COMMUNITY_Souvenirs Page|Souvenirs Page]]
- [[_COMMUNITY_Station Setup|Station Setup]]
- [[_COMMUNITY_Webcam Capture|Webcam Capture]]
- [[_COMMUNITY_Error Handling Utils|Error Handling Utils]]
- [[_COMMUNITY_Help Panel|Help Panel]]
- [[_COMMUNITY_Lucky Draw Winners Page|Lucky Draw Winners Page]]
- [[_COMMUNITY_Landing Page Features|Landing Page Features]]
- [[_COMMUNITY_Landing Page Gallery|Landing Page Gallery]]
- [[_COMMUNITY_Landing Page Footer|Landing Page Footer]]
- [[_COMMUNITY_Landing Page Product|Landing Page Product]]
- [[_COMMUNITY_Tournament Tabs|Tournament Tabs]]
- [[_COMMUNITY_Tournament Match Card|Tournament Match Card]]

## God Nodes (most connected - your core abstractions)
1. `emitEvent()` - 55 edges
2. `IndexedDBService` - 48 edges
3. `PrismaService` - 45 edges
4. `GuestsService` - 38 edges
5. `TournamentsController` - 37 edges
6. `Button` - 36 edges
7. `useSSE()` - 36 edges
8. `OfflineSyncService` - 33 edges
9. `EventsService` - 32 edges
10. `TournamentsService` - 31 edges

## Surprising Connections (you probably didn't know these)
- `GuestsListPage()` --calls--> `useSSE()`  [EXTRACTED]
  apps/frontend/app/(main)/admin/guests/page.tsx → apps/frontend/lib/sse-context.tsx
- `StatisticsPage()` --calls--> `useSSE()`  [EXTRACTED]
  apps/frontend/app/(main)/admin/statistics/page.tsx → apps/frontend/lib/sse-context.tsx
- `LiveMatchPage()` --calls--> `useSSE()`  [EXTRACTED]
  apps/frontend/app/(main)/tournament/live/[matchId]/page.tsx → apps/frontend/lib/sse-context.tsx
- `MatchCardProps` --references--> `Match`  [EXTRACTED]
  apps/frontend/components/tournament/match/MatchCard.tsx → apps/frontend/types/tournament.types.ts
- `useAllTournamentSSE()` --calls--> `useSSE()`  [EXTRACTED]
  apps/frontend/hooks/useTournamentSSE.ts → apps/frontend/lib/sse-context.tsx

## Import Cycles
- None detected.

## Communities (98 total, 28 thin omitted)

### Community 0 - "Guest Management"
Cohesion: 0.10
Nodes (9): BulkDeleteGuestsDto, BulkUpdateGuestsDto, CreateGuestDto, GuestCategory, QueryGuestsDto, UpdateGuestDto, formatLocalTime(), truncateText() (+1 more)

### Community 2 - "Frontend Dependencies"
Cohesion: 0.05
Nodes (40): dependencies, canvas-confetti, clsx, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, @ducanh2912/next-pwa, html5-qrcode (+32 more)

### Community 3 - "Landing Page UI"
Cohesion: 0.06
Nodes (23): EventConfig, getEventConfig(), getLandingPageData(), LandingPage(), LandingPageData, cn(), Feature, FeatureImage (+15 more)

### Community 4 - "Admin Event & Checkin"
Cohesion: 0.10
Nodes (20): CalendarDay, Event, TournamentCalendarItem, CATEGORY_OPTIONS, GuestCategory, Prize, PRIZE_CATEGORIES, COLOR_OPTIONS (+12 more)

### Community 5 - "Public Registration & Forms"
Cohesion: 0.08
Nodes (26): DEFAULT_CONFIG, FIELD_KEY_OPTIONS, RegConfig, RegField, RegStats, Alert(), config, Props (+18 more)

### Community 6 - "Backend Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, bcrypt, cache-manager, cache-manager-redis-yet, class-transformer, class-validator, compression, dotenv (+25 more)

### Community 7 - "Login & Registration Pages"
Cohesion: 0.13
Nodes (16): EventConfig, EmailSettings, PageState, PublicConfig, PublicEvent, RegistrationField, SortableImage, SortableImageListProps (+8 more)

### Community 8 - "Public Registration Backend"
Cohesion: 0.14
Nodes (7): SubmitRegistrationDto, RegistrationFieldDto, UpdateRegistrationConfigDto, PublicRegistrationController, PublicRegistrationService, RegistrationField, VALID_FIELD_KEYS

### Community 10 - "Tournament Live Match"
Cohesion: 0.15
Nodes (18): LiveTournamentInfo, LiveMatchPage(), LiveMatchCard(), LiveMatchCardProps, cn(), LiveMatchDisplay(), LiveMatchDisplayProps, MatchScoringModal() (+10 more)

### Community 11 - "Tournament Team Management"
Cohesion: 0.11
Nodes (24): GuestPicker(), GuestPickerProps, ImportTeamsModalProps, checkinApi, eligibleGuestApi, importApi, statsApi, BracketTeamView (+16 more)

### Community 12 - "Tournament Service & SSE"
Cohesion: 0.13
Nodes (3): emitter, ServerEvent, TournamentsService

### Community 13 - "Backend Core Infrastructure"
Cohesion: 0.09
Nodes (7): BulkSendEmailDto, EmailSettingsDto, SendEmailDto, HealthController, HealthStatus, PrismaService, BracketEngineService

### Community 14 - "Backend Module Config"
Cohesion: 0.18
Nodes (13): AuthModule, AuditModule, RedisCacheModule, throttlerConfig, EmailModule, EventsModule, GuestsModule, PrismaModule (+5 more)

### Community 17 - "Admin System Page"
Cohesion: 0.10
Nodes (15): AuditLog, AuditStats, formatUptime(), HealthStatus, LogEntry, LogFile, LogStats, SystemPage() (+7 more)

### Community 18 - "Users Management"
Cohesion: 0.11
Nodes (6): ChangePasswordDto, CreateUserDto, UpdateUserDto, UsersController, UsersModule, UsersService

### Community 19 - "Root Layout & Error Handling"
Cohesion: 0.11
Nodes (9): cinzel, inter, jetbrainsMono, metadata, ErrorBoundary, Props, State, QueryProvider() (+1 more)

### Community 20 - "Auth & Audit"
Cohesion: 0.13
Nodes (5): JwtAuthGuard, AuditController, AuditAction, AuditLogInput, AuditService

### Community 21 - "Logger Service"
Cohesion: 0.12
Nodes (4): LoggerController, LoggerModule, LogEntry, LoggerService

### Community 22 - "Statistics & Charts"
Cohesion: 0.11
Nodes (16): colorMap, CompanyStats, PrizeStats, SouvenirStats, StatisticsPage(), Stats, COLORS, CompanyStats (+8 more)

### Community 23 - "Tournament Form"
Cohesion: 0.13
Nodes (16): PublicRegistrationSettingsPage(), formatOptions, participantOptions, scoringOptions, sportOptions, TournamentForm(), TournamentFormProps, FormSection() (+8 more)

### Community 25 - "Tournament Types & DTOs"
Cohesion: 0.23
Nodes (11): TeamSeed, CreateTournamentDto, UpdateTournamentDto, MatchStatus, ParticipantType, SchedulingMode, ScoringConfig, ScoringMode (+3 more)

### Community 26 - "Tournament Team UI"
Cohesion: 0.18
Nodes (16): TabId, ImportTeamsModal(), cn(), TeamCard(), TeamCardProps, TeamFormModal(), sizeMap, TeamLogo() (+8 more)

### Community 27 - "Service Worker"
Cohesion: 0.18
Nodes (4): a, get(), h(), k()

### Community 28 - "Frontend tsconfig"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+12 more)

### Community 29 - "Dashboard & Guest Hooks"
Cohesion: 0.13
Nodes (10): DashboardPage(), GuestStatsChart, Event, Guest, GuestListResponse, queryKeys, Stats, useActiveEvent() (+2 more)

### Community 30 - "Event Selection & Navigation"
Cohesion: 0.15
Nodes (15): UsersManagementPage(), EventConfig, Guest, ShowPage(), Event, EventSelector(), EventConfig, ThemeBackground() (+7 more)

### Community 31 - "Checkin Page & Buttons"
Cohesion: 0.12
Nodes (12): EventConfig, Guest, GuestCheckin, ScanLogItem, StationSetupModalProps, Props, Size, sizes (+4 more)

### Community 32 - "Souvenir Page & Queue"
Cohesion: 0.13
Nodes (14): EventConfig, Guest, PrizeWin, Souvenir, SouvenirPage(), SouvenirTakeInfo, QueueManagementPanelProps, LocalGuest (+6 more)

### Community 33 - "Service Worker Cache"
Cohesion: 0.13
Nodes (9): b(), constructor(), deleteCacheAndMetadata(), et, F, G, i, O() (+1 more)

### Community 35 - "Stations Management"
Cohesion: 0.21
Nodes (5): RegisterStationDto, ListStationsResponseDto, StationResponseDto, StationsController, StationsService

### Community 36 - "Cache Strategy"
Cohesion: 0.29
Nodes (6): m(), s, st(), T(), U(), v

### Community 37 - "Public Checkin API"
Cohesion: 0.15
Nodes (3): onEvent(), PublicController, reqOnClose()

### Community 38 - "Landing Page Storage"
Cohesion: 0.18
Nodes (7): landingPageStorage(), CreateFeatureDto, UpdateFeatureDto, UpdateLandingConfigDto, IMAGE_FILTER, IMAGE_LIMITS, LandingPageModule

### Community 41 - "Connection Status"
Cohesion: 0.12
Nodes (14): ConnectionStatusIndicatorProps, ConnectionInfo, ConnectionStatus, StatusListener, ConnectionStatus, HealthCheckResponse, OfflineCheckinRequest, OfflineCheckinResponse (+6 more)

### Community 42 - "Auth Backend"
Cohesion: 0.17
Nodes (4): AuthController, AuthService, LoginDto, JwtStrategy

### Community 43 - "Reports Service"
Cohesion: 0.18
Nodes (4): ReportsController, ReportsModule, ReportOptions, ReportsService

### Community 46 - "Storage & Events"
Cohesion: 0.19
Nodes (6): backgroundsStorage(), logosStorage(), photosStorage(), soundsStorage(), CreateEventDto, CustomCategory

### Community 49 - "Backend tsconfig"
Cohesion: 0.13
Nodes (14): compilerOptions, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, module, moduleResolution, outDir (+6 more)

### Community 50 - "Page Navigation"
Cohesion: 0.15
Nodes (12): EditGuestPage(), LoginPage(), EventSettingsPage(), CheckinPage(), LuckyDrawPage(), AutoScrollWinnersPage(), Prize, Winner (+4 more)

### Community 51 - "Tournament Bracket Components"
Cohesion: 0.19
Nodes (11): cn(), MatchCard(), MatchCardProps, getConfigKey(), statusMap, StatusPill(), StatusPillProps, MatchStatus (+3 more)

### Community 52 - "Tournament Bracket Layout"
Cohesion: 0.24
Nodes (10): BracketConnector(), BracketConnectorProps, BracketMatchBox(), BracketMatchBoxProps, cn(), BracketView(), BracketViewProps, BracketMatchView (+2 more)

### Community 53 - "Tournament Checkin DTOs"
Cohesion: 0.22
Nodes (5): CreateMatchDto, OfflineTournamentCheckinDto, TournamentCheckinBatchSyncDto, TournamentCheckinDto, UpdateScoreDto

### Community 54 - "Lucky Draw Carousel"
Cohesion: 0.15
Nodes (10): CarouselDrawPage(), FESTIVE_COLORS, FINALE_CONFETTI, GRAND_CONFETTI, Prize, REGULAR_CONFETTI, TICKER_COLORS, Guest (+2 more)

### Community 55 - "Lucky Draw Page"
Cohesion: 0.14
Nodes (11): DRAMA_CONFIGS, DramaConfig, EligibleGuest, EligibleGuestsResponse, FINALE_CONFETTI, GRAND_CONFETTI, Guest, Prize (+3 more)

### Community 56 - "Tournament Utilities"
Cohesion: 0.18
Nodes (6): CreateMatchModal(), CreateMatchModalProps, TeamFormModalProps, toUTCDateString(), BracketRound, TournamentTeam

### Community 59 - "Lucky Draw Display"
Cohesion: 0.15
Nodes (9): FINALE_CONFETTI, GRAND_CONFETTI, Guest, LiveDisplayPage(), Prize, REGULAR_CONFETTI, SHIMMER_CONFETTI, SlotRow (+1 more)

### Community 60 - "Server & Middleware"
Cohesion: 0.15
Nodes (10): config, app, { createServer }, { createServer: createHttpServer }, fs, handle, https, next (+2 more)

### Community 61 - "Backend Dev Dependencies"
Cohesion: 0.17
Nodes (12): devDependencies, prisma, ts-node, ts-node-dev, @types/bcrypt, @types/compression, @types/express, @types/multer (+4 more)

### Community 62 - "Admin Guests Page"
Cohesion: 0.17
Nodes (11): CATEGORY_CONFIG, Guest, GuestCategory, GuestCheckin, GuestsListPage(), GuestsResponse, ImportResult, PrizeWin (+3 more)

### Community 65 - "Souvenir UI Components"
Cohesion: 0.18
Nodes (8): DEFAULT_CONFIG, Feature, FeatureCardProps, FeatureImage, GalleryImage, HeroImage, LandingConfig, LandingPageAdminData

### Community 66 - "Tournament Bracket Pages"
Cohesion: 0.24
Nodes (8): TournamentDetailPage(), PublicBracketViewerPage(), TournamentEventHandler, TournamentSSEHandlers, useAllTournamentSSE(), useTournamentSSE(), bracketApi, TournamentEvent

### Community 67 - "Lucky Draw Winners"
Cohesion: 0.20
Nodes (6): Prize, PrizeReceiptModalProps, Winner, Prize, Winner, WinnerHistoryModalProps

### Community 68 - "Guest Stats Chart"
Cohesion: 0.27
Nodes (3): j(), q(), r

### Community 70 - "Company Stats Chart"
Cohesion: 0.25
Nodes (5): HELP_SECTIONS, HelpPanelProps, HelpSection, IconButton, Props

### Community 71 - "Landing Page Capabilities"
Cohesion: 0.22
Nodes (7): Tab, TabId, TabPanel(), TabPanelProps, tabs, TournamentTabs(), TournamentTabsProps

### Community 72 - "Product Showcase"
Cohesion: 0.25
Nodes (8): scripts, build, dev, prisma:deploy, prisma:generate, prisma:migrate, seed, start

### Community 74 - "Image Utils"
Cohesion: 0.29
Nodes (4): CATEGORY_OPTIONS, Guest, GuestCategory, Props

### Community 75 - "Tournament Checkin Backend"
Cohesion: 0.33
Nodes (3): ImportTeamDto, ImportTeamMemberDto, ImportTeamsDto

### Community 76 - "Prizes Controller"
Cohesion: 0.33
Nodes (4): Event, EventStats, KanbanColumn, ViewMode

### Community 78 - "Souvenirs Page"
Cohesion: 0.40
Nodes (4): main, name, private, version

### Community 80 - "Webcam Capture"
Cohesion: 0.67
Nodes (3): AppModule, bootstrap(), compression

### Community 81 - "Error Handling Utils"
Cohesion: 0.50
Nodes (3): OfflineCheckinDto, SyncBatchDto, SyncBatchItemDto

## Knowledge Gaps
- **399 isolated node(s):** `name`, `version`, `private`, `main`, `dev` (+394 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiFetch()` connect `Admin Event & Checkin` to `Souvenir Page & Queue`, `Landing Page UI`, `Cache Strategy`, `Login & Registration Pages`, `Tournament Team Management`, `Admin System Page`, `Page Navigation`, `Lucky Draw Page`, `Statistics & Charts`, `Lucky Draw Carousel`, `Lucky Draw Display`, `Dashboard & Guest Hooks`, `Admin Guests Page`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `IndexedDBService` connect `IndexedDB & Offline Storage` to `Souvenir Page & Queue`, `Admin System Page`, `Connection Status`, `Checkin Page & Buttons`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `PrismaService` connect `Backend Core Infrastructure` to `Guest Management`, `Public Registration Backend`, `Backend Module Config`, `Email Service`, `Users Management`, `Auth & Audit`, `Tournament Types & DTOs`, `Souvenirs Backend`, `Stations Management`, `Public Checkin API`, `Landing Page Storage`, `Auth Backend`, `Reports Service`, `Prizes Backend`, `Storage & Events`, `Events Service`, `Tournament Checkin DTOs`, `API Client`, `Show Page`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `emitEvent()` (e.g. with `.createMatch()` and `.deleteMatch()`) actually correct?**
  _`emitEvent()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _399 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Guest Management` be split into smaller, more focused modules?**
  _Cohesion score 0.09797979797979799 - nodes in this community are weakly interconnected._
- **Should `IndexedDB & Offline Storage` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
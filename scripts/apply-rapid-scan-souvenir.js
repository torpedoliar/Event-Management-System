const fs = require('fs');

const souvenirPath = 'e:\\Vibe\\Registrasi Tamu\\apps\\frontend\\app\\souvenir\\page.tsx';
let souvenirCode = fs.readFileSync(souvenirPath, 'utf8');

// 1. Inject types and state in Souvenir
const souvenirInjection = `type ScanLogItem = {
  id: string;
  guestIdOrName: string;
  status: 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
  message: string;
  timestamp: Date;
};

export default function SouvenirPage() {
    const rapidQueueRef = useRef<string[]>([]);
    const isProcessingQueueRef = useRef<boolean>(false);
    const [rapidLogs, setRapidLogs] = useState<ScanLogItem[]>([]);

    const appendLog = (query: string, status: ScanLogItem['status'], message: string) => {
        setRapidLogs(prev => {
            const newLog: ScanLogItem = { id: Math.random().toString(), guestIdOrName: query, status, message, timestamp: new Date() };
            const logs = [newLog, ...prev];
            if (logs.length > 20) logs.length = 20; // simpan 20 riwayat
            return logs;
        });
    };

    const processRapidQueue = async () => {
        if (isProcessingQueueRef.current) return;
        isProcessingQueueRef.current = true;
        try {
            while (rapidQueueRef.current.length > 0) {
                const activeQuery = rapidQueueRef.current.shift();
                if (!activeQuery) continue;
                
                const params = new URLSearchParams();
                const cleanQ = activeQuery.trim();
                params.set('guestId', cleanQ);
                params.set('name', cleanQ);
                if (/[\\d\\-]/.test(cleanQ) || /^[A-Z0-9_\\-]+$/.test(cleanQ)) params.set('exact', 'true');
                
                const isCurrentlyOffline = connectionStatusService.getStatus() !== 'online';
                
                try {
                    if (isCurrentlyOffline && stationConfig) throw new Error('OfflineMode');
                    const controller = new AbortController();
                    const res = await fetch(\`\${apiBase()}/public/guests/search?\${params.toString()}\`, { signal: controller.signal });
                    if (!res.ok) throw new Error('Search failed');
                    const data = await res.json();
                    
                    if (data.length === 1) {
                        const g = data[0];
                        if (g.souvenirTaken) {
                            appendLog(activeQuery, 'DUPLICATE', 'Souvenir sudah diambil.');
                            continue;
                        }
                        if (requireCheckinForSouvenir && !g.checkedIn) {
                            appendLog(activeQuery, 'ERROR', 'Tamu belum Check-In.');
                            continue;
                        }
                        
                        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                        const takeRes = await fetch(\`\${apiBase()}/guests/\${g.id}\`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': \`Bearer \${token}\` }) },
                            body: JSON.stringify({ souvenirTaken: true })
                        });
                        
                        if (!takeRes.ok) throw new Error('Gagal update status souvenir server');
                        appendLog(activeQuery, 'SUCCESS', 'Souvenir berhasil diberikan.');
                    } else if (data.length === 0) {
                        appendLog(activeQuery, 'NOT_FOUND', 'Tamu tidak ditemukan server.');
                    } else {
                        appendLog(activeQuery, 'ERROR', \`Ditemukan \${data.length}. Butuh manual klik.\`);
                    }
                } catch (e: any) {
                    // Offline Fallback
                    const cleanSearchQ = cleanQ;
                    let matchedGuests: any[] = [];
                    const exactMatch = await indexedDBService.getCachedGuestByGuestId(cleanSearchQ);
                    if (exactMatch) {
                        matchedGuests = [exactMatch];
                    } else {
                        const cachedGuests = await indexedDBService.getAllCachedGuests();
                        for (const g of cachedGuests) {
                            if (g.guestId.toLowerCase() === cleanSearchQ.toLowerCase() || g.name.toLowerCase() === activeQuery.toLowerCase()) {
                                matchedGuests.push(g);
                            }
                        }
                    }
                    
                    if (matchedGuests.length === 1) {
                        const matchedGuest = matchedGuests[0];
                        if (matchedGuest.souvenirTaken) {
                            appendLog(activeQuery, 'DUPLICATE', 'Souvenir sudah diambil (Offline).');
                            continue;
                        }
                        if (requireCheckinForSouvenir && !matchedGuest.checkedIn) {
                            appendLog(activeQuery, 'ERROR', 'Belum Check-In (Offline).');
                            continue;
                        }
                        
                        // Gunakan method addPendingSouvenir atau fallback ke queue update
                        if (offlineSyncService.addPendingSouvenir) {
                             await offlineSyncService.addPendingSouvenir(matchedGuest.guestId, 'default');
                        }
                        await indexedDBService.updateCachedGuest(matchedGuest.id, { souvenirTaken: true });
                        appendLog(activeQuery, 'SUCCESS', 'Souvenir diberikan (Offline).');
                    } else {
                        appendLog(activeQuery, 'NOT_FOUND', 'Offline ID tidak dikenali atau multiple.');
                    }
                }
                await new Promise(res => setTimeout(res, 50));
            }
        } finally {
            isProcessingQueueRef.current = false;
        }
    };

    const [cfg, setCfg] = useState<EventConfig | null>(null);`;

souvenirCode = souvenirCode.replace(
  'export default function SouvenirPage() {\n    const [cfg, setCfg] = useState<EventConfig | null>(null);',
  souvenirInjection
);

// 2. Replace Souvenir input
const souvenirInputOld = `onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !searching && !processing && !creatingGuest) { e.preventDefault(); doSearch(); } }}
                        placeholder="Masukkan Guest ID atau Nama..."
                        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-3 text-white placeholder:text-white/60 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/70"
                        disabled={searching || processing || creatingGuest}
                        autoFocus
                    />
                    {error && (`;

const souvenirInputNew = `onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { 
                            if (e.key === 'Enter') { 
                                e.preventDefault(); 
                                if (!q.trim()) return;
                                rapidQueueRef.current.push(q.trim());
                                setQ(''); 
                                processRapidQueue(); 
                            } 
                        }}
                        placeholder="Masukkan Guest ID atau Nama..."
                        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-brand-primary/70"
                        autoFocus
                    />

                    {/* Rapid Scan Logs */}
                    {rapidLogs.length > 0 && (
                        <div className="relative z-10 mt-4 flex flex-col items-center">
                            <div className="w-full max-w-3xl glass-card-dark p-4 md:p-6 text-sm text-white/80 overflow-y-auto max-h-48 border border-white/10 rounded-xl">
                                <h3 className="text-white font-semibold mb-3">Rapid Scan Logs</h3>
                                <ul className="space-y-2">
                                    {rapidLogs.map((log) => (
                                        <li key={log.id} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                                            <div className="flex gap-3">
                                                <span className="opacity-60">{log.timestamp.toLocaleTimeString()}</span>
                                                <strong className="text-white">{log.guestIdOrName}</strong>
                                            </div>
                                            <span className={\`font-medium \${
                                                log.status === 'SUCCESS' ? 'text-brand-success' :
                                                log.status === 'DUPLICATE' ? 'text-orange-400' :
                                                'text-brand-danger'
                                            }\`}>
                                                {log.message}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {error && (`;

souvenirCode = souvenirCode.replace(souvenirInputOld, souvenirInputNew);
fs.writeFileSync(souvenirPath, souvenirCode);

console.log("Souvenir Page updated.");

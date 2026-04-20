const fs = require('fs');

const checkinPath = 'e:\\Vibe\\Registrasi Tamu\\apps\\frontend\\app\\checkin\\page.tsx';
let checkinCode = fs.readFileSync(checkinPath, 'utf8');

// 1. Inject types and state in Checkin
const checkinInjection = `type ScanLogItem = {
  id: string;
  guestIdOrName: string;
  status: 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
  message: string;
  timestamp: Date;
};

export default function CheckinPage() {
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

  const doCheckinWrapperForQueue = async (g: Guest, useInternalId: boolean, activeQuery: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = \`Bearer \${token}\`;
      const endpoint = useInternalId ? \`\${apiBase()}/public/guests/checkin-by-id\` : \`\${apiBase()}/public/guests/checkin\`;
      const body = useInternalId ? { id: g.id } : { guestId: g.guestId };
      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.status === 409) {
        appendLog(activeQuery, 'DUPLICATE', 'Sudah Check-In sebelumnya.');
        refreshHistory();
        return;
      }
      if (!res.ok) throw new Error('Gagal Check-In Server');
      appendLog(activeQuery, 'SUCCESS', 'Check-In Server Berhasil');
      refreshHistory();
    } catch (e: any) {
      appendLog(activeQuery, 'ERROR', e.message || 'Error Check-In Server');
    }
  };

  const createAndCheckinWrapperForQueue = async (query: string, activeQuery: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(\`\${apiBase()}/public/guests\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': \`Bearer \${token}\` }) },
        body: JSON.stringify({ guestId: query, name: query, autoCheckin: true })
      });
      if (!res.ok) throw new Error('Gagal buat & check-in');
      appendLog(activeQuery, 'SUCCESS', 'Dibuat & Check-In');
      refreshHistory();
    } catch (e: any) {
      appendLog(activeQuery, 'ERROR', e.message || 'Error auto-create');
    }
  };

  const processRapidQueue = async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;
    try {
      while (rapidQueueRef.current.length > 0) {
        const activeQuery = rapidQueueRef.current.shift();
        if (!activeQuery) continue;
        const params = new URLSearchParams();
        const cleanQ = cleanQrContent(activeQuery);
        params.set('guestId', cleanQ);
        params.set('name', activeQuery);
        if (/[\\d\\-]/.test(activeQuery) || /^[A-Z0-9_\\-]+$/.test(activeQuery)) params.set('exact', 'true');
        const isCurrentlyOffline = connectionStatusService.getStatus() !== 'online';
        try {
          if (isCurrentlyOffline && stationConfig) throw new Error('OfflineMode');
          const controller = new AbortController();
          const res = await fetch(\`\${apiBase()}/public/guests/search?\${params.toString()}\`, { signal: controller.signal });
          if (!res.ok) throw new Error('Search failed');
          const data = await res.json();
          if (data.length === 1) {
            await doCheckinWrapperForQueue(data[0], false, activeQuery);
          } else if (data.length === 0) {
            if (autoCreateGuest) {
              await createAndCheckinWrapperForQueue(activeQuery, activeQuery);
            } else {
              appendLog(activeQuery, 'NOT_FOUND', 'Tamu tidak ditemukan server.');
            }
          } else {
            appendLog(activeQuery, 'ERROR', \`Ditemukan \${data.length}. Butuh manual klik.\`);
          }
        } catch (e: any) {
          const cleanSearchQ = cleanQrContent(activeQuery);
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
             // Pastikan cfg.allowMultipleCheckinPerCounter ada
             // if (matchedGuest.checkedIn) { ... }
             await offlineSyncService.addToQueue(matchedGuest.guestId);
             await indexedDBService.updateCachedGuest(matchedGuest.id, {
                checkedIn: true, checkinCount: (matchedGuest.checkinCount || 0) + 1, lastCheckinAt: new Date().toISOString()
             });
             appendLog(activeQuery, 'SUCCESS', 'Check-In Offline Berhasil');
             refreshHistory();
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

checkinCode = checkinCode.replace(
  'export default function CheckinPage() {\n  const [cfg, setCfg] = useState<EventConfig | null>(null);',
  checkinInjection
);

// 2. Replace Checkin input
const checkinInputOld = `onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !searching && !checking) { e.preventDefault(); doSearch(); } }}
                  placeholder="Masukkan Guest ID atau Nama, lalu tekan Enter"
                  className="w-full rounded-xl border border-white/20 bg-white/5 pl-12 pr-4 py-4 text-lg text-white placeholder:text-white/40 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50 transition-all"
                  disabled={searching || checking}
                  autoFocus
                />
              </div>`;

const checkinInputNew = `onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
                      if (!q.trim()) return;
                      rapidQueueRef.current.push(q.trim());
                      setQ(''); 
                      processRapidQueue(); 
                    } 
                  }}
                  placeholder="Masukkan Guest ID atau Nama, lalu tekan Enter"
                  className="w-full rounded-xl border border-white/20 bg-white/5 pl-12 pr-4 py-4 text-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50 transition-all"
                  autoFocus
                />
              </div>

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
              )}`;

checkinCode = checkinCode.replace(checkinInputOld, checkinInputNew);
fs.writeFileSync(checkinPath, checkinCode);

console.log("Checkin Page updated.");

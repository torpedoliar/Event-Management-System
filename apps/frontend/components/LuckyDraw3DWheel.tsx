'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface Guest {
    id: string;
    guestId?: string;
    name: string;
    company?: string;
    division?: string;
    photoUrl?: string;
    queueNumber: number;
}

export interface LuckyDraw3DWheelProps {
  candidates: Guest[];
  winner: Guest | null;
  spinning: boolean;
  isGrandPrize: boolean;
  stopDelay: number;
  onStop: () => void;
}

type WheelPhase = 'idle' | 'spinning' | 'decelerating' | 'fake-stop' | 'wobbling' | 'snapping' | 'stopped';

export default function LuckyDraw3DWheel({
  candidates,
  winner,
  spinning,
  isGrandPrize,
  stopDelay,
  onStop
}: LuckyDraw3DWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const N = 40;
  const H = 100;
  const theta = 360 / N;
  const radius = Math.round((H / 2) / Math.tan(Math.PI / N));
  
  const [wheelItems, setWheelItems] = useState<Guest[]>([]);
  const WINNER_INDEX = 20;

  const onStopRef = useRef(onStop);
  const onStopCalledRef = useRef(false);

  useEffect(() => { onStopRef.current = onStop; }, [onStop]);
  
  const buildWheelItems = useCallback((candidateList: Guest[], winnerGuest?: Guest | null): Guest[] => {
    if (candidateList.length === 0) return [];
    const items: Guest[] = [];
    for (let i = 0; i < N; i++) {
      items.push(candidateList[Math.floor(Math.random() * candidateList.length)]);
    }
    if (winnerGuest) {
      items[WINNER_INDEX] = winnerGuest;
      const nonWinnerCandidates = candidateList.filter(c => c.id !== winnerGuest.id);
      if (nonWinnerCandidates.length > 0) {
        if (WINNER_INDEX > 0) items[WINNER_INDEX - 1] = nonWinnerCandidates[Math.floor(Math.random() * nonWinnerCandidates.length)];
        if (WINNER_INDEX < N - 1) items[WINNER_INDEX + 1] = nonWinnerCandidates[Math.floor(Math.random() * nonWinnerCandidates.length)];
      }
    }
    return items;
  }, [N, WINNER_INDEX]);

  useEffect(() => {
    if (candidates.length > 0 && wheelItems.length === 0) {
      setWheelItems(buildWheelItems(candidates));
    }
  }, [candidates, wheelItems.length, buildWheelItems]);

  // ─── Animation state refs ───
  const currentAngleRef = useRef(0);
  const velocityRef = useRef(0);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<WheelPhase>('idle');
  const stopDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const targetAngleRef = useRef(0);
  const winnerInsertedRef = useRef(false);
  const wobbleStartTimeRef = useRef(0);
  const wobbleCenterRef = useRef(0);
  const wobbleFinalTargetRef = useRef(0);

  // ─── Spinning animation ───
  useEffect(() => {
    if (spinning && candidates.length > 0) {
      onStopCalledRef.current = false;
      winnerInsertedRef.current = false;
      if (containerRef.current) containerRef.current.style.transition = 'none';
      setWheelItems(buildWheelItems(candidates));
      phaseRef.current = 'spinning';
      velocityRef.current = 12 + Math.random() * 4;
      if (stopDelayTimerRef.current) { clearTimeout(stopDelayTimerRef.current); stopDelayTimerRef.current = null; }
      
      let lastTime = performance.now();
      const animate = (time: number) => {
        const dt = Math.min(time - lastTime, 50);
        lastTime = time;
        const frameFactor = dt / 16.67;
        const phase = phaseRef.current;
        
        if (phase === 'spinning') {
          currentAngleRef.current -= velocityRef.current * frameFactor;
        } else if (phase === 'decelerating') {
          const target = targetAngleRef.current;
          const remaining = currentAngleRef.current - target;
          if (remaining > 0.3) {
            currentAngleRef.current -= Math.max(0.1, remaining * 0.025) * frameFactor;
          } else {
            currentAngleRef.current = target;
            phaseRef.current = 'stopped';
            if (!onStopCalledRef.current) { onStopCalledRef.current = true; onStopRef.current(); }
          }
        } else if (phase === 'fake-stop') {
          const target = targetAngleRef.current;
          const remaining = currentAngleRef.current - target;
          if (remaining > 0.3) {
            currentAngleRef.current -= Math.max(0.05, remaining * 0.015) * frameFactor;
          } else {
            currentAngleRef.current = target;
            wobbleCenterRef.current = target;
            wobbleStartTimeRef.current = performance.now();
            phaseRef.current = 'wobbling';
          }
        } else if (phase === 'wobbling') {
          const elapsed = (time - wobbleStartTimeRef.current) / 1000;
          const totalDuration = 5.0;
          
          if (elapsed < totalDuration) {
             const amplitude = (theta / 2) * 0.35;
             const freq = 1.2 * (1 - elapsed / totalDuration); 
             const offset = Math.sin(elapsed * freq * Math.PI * 2) * amplitude;
             currentAngleRef.current = wobbleCenterRef.current + offset;
          } else {
            phaseRef.current = 'snapping';
            if (containerRef.current) {
              containerRef.current.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
              currentAngleRef.current = wobbleFinalTargetRef.current;
              containerRef.current.style.transform = `translateZ(${-radius}px) rotateX(${wobbleFinalTargetRef.current}deg)`;
            }
            setTimeout(() => {
              phaseRef.current = 'stopped';
              if (!onStopCalledRef.current) { onStopCalledRef.current = true; onStopRef.current(); }
            }, 1600);
          }
        }
        
        if (containerRef.current && phase !== 'snapping' && phase !== 'stopped' && phase !== 'idle') {
          containerRef.current.style.transform = `translateZ(${-radius}px) rotateX(${currentAngleRef.current}deg)`;
        }
        if (phase !== 'stopped' && phase !== 'idle' && phase !== 'snapping') {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]);

  // ─── Winner insertion ───
  useEffect(() => {
    if (!winner || winnerInsertedRef.current) return;
    if (phaseRef.current !== 'spinning') return;
    winnerInsertedRef.current = true;
    setWheelItems(prev => {
      const next = [...prev];
      next[WINNER_INDEX] = winner;
      const nonWinner = candidates.filter(c => c.id !== winner.id);
      if (nonWinner.length > 0) {
        if (WINNER_INDEX > 0) next[WINNER_INDEX - 1] = nonWinner[Math.floor(Math.random() * nonWinner.length)];
        if (WINNER_INDEX < N - 1) next[WINNER_INDEX + 1] = nonWinner[Math.floor(Math.random() * nonWinner.length)];
      }
      return next;
    });
    stopDelayTimerRef.current = setTimeout(() => {
      const current = currentAngleRef.current;
      const winnerAngle = WINNER_INDEX * theta;
      const fullRotations = Math.floor(Math.abs(current) / 360) + 3;
      const baseTarget = -(winnerAngle + fullRotations * 360);
      const safeTarget = baseTarget < current ? baseTarget : baseTarget - 360;
      
      if (isGrandPrize) {
        const winnerIsTop = Math.random() > 0.5;
        if (winnerIsTop) {
          targetAngleRef.current = safeTarget - theta / 2;
        } else {
          targetAngleRef.current = safeTarget + theta / 2;
        }
        wobbleFinalTargetRef.current = safeTarget;
        phaseRef.current = 'fake-stop';
      } else {
        targetAngleRef.current = safeTarget;
        phaseRef.current = 'decelerating';
      }
    }, stopDelay);
    return () => { if (stopDelayTimerRef.current) clearTimeout(stopDelayTimerRef.current); };
  }, [winner, candidates, stopDelay, isGrandPrize, theta, radius, WINNER_INDEX, N]);

  useEffect(() => {
    if (!spinning && phaseRef.current === 'spinning' && !winner) {
      phaseRef.current = 'stopped';
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  }, [spinning, winner]);
  
  if (wheelItems.length === 0) return null;

  return (
     <div className="relative w-full max-w-[550px] mx-auto" style={{ perspective: '800px' }}>
       {/* ═══ GOLDEN CELEBRATION WHEEL ═══ */}
       <div className="relative flex items-center justify-center h-[280px]">
         
         {/* Subtle glow behind the wheel */}
         <div className="absolute inset-0 rounded-3xl opacity-30 blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(ellipse, rgba(212,168,83,0.4) 0%, transparent 70%)' }} />

         {/* ─── 3D Cylinder Viewport (overflow: hidden is the KEY fix) ─── */}
         <div className="absolute inset-x-4 top-4 bottom-4 rounded-2xl overflow-hidden z-20 border border-brand-primary/20"
              style={{ 
                background: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(10,10,18,0.98) 50%, rgba(26,26,46,0.95) 100%)',
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)'
              }}>
           
           {/* 3D Cylinder */}
           <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '600px' }}>
             <div 
               ref={containerRef}
               className="relative w-[90%] h-[80px]"
               style={{ transformStyle: 'preserve-3d', transform: `translateZ(${-radius}px)` }}
             >
               {wheelItems.map((item, i) => (
                  <div
                     key={`${item.id}-${i}`}
                     className="absolute left-0 top-0 w-full h-[80px] flex items-center justify-center"
                     style={{
                        transform: `rotateX(${i * theta}deg) translateZ(${radius}px)`,
                        backfaceVisibility: 'hidden',
                        background: 'linear-gradient(180deg, rgba(212,168,83,0.15) 0%, rgba(26,26,46,0.9) 15%, rgba(26,26,46,0.9) 85%, rgba(212,168,83,0.15) 100%)',
                        borderTop: '1px solid rgba(212,168,83,0.3)',
                        borderBottom: '1px solid rgba(212,168,83,0.1)',
                     }}
                  >
                     <div className="flex items-center w-full px-6">
                        <div className="font-black text-2xl tracking-widest text-brand-primary w-16 text-left shrink-0"
                             style={{ textShadow: '0 0 10px rgba(212,168,83,0.6)' }}>
                          {item.queueNumber}
                        </div>
                        <div className="flex-1 flex flex-col items-end min-w-0">
                          <span className="font-bold text-base text-white uppercase tracking-wide leading-tight truncate w-full text-right">
                            {item.name}
                          </span>
                          <span className="text-xs font-mono text-brand-primarySoft/70 mt-0.5 text-right tracking-wider truncate w-full">
                            {item.guestId || item.company || '-'}
                          </span>
                        </div>
                     </div>
                  </div>
               ))}
             </div>
           </div>

           {/* ─── Selection Highlight Frame ─── */}
           <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-[88px] z-30 rounded-xl border-2 border-brand-primary/80 pointer-events-none"
                style={{
                  boxShadow: '0 0 25px rgba(212,168,83,0.35), inset 0 0 25px rgba(212,168,83,0.15)',
                  background: 'linear-gradient(90deg, rgba(212,168,83,0.08), transparent, rgba(212,168,83,0.08))'
                }}>
             
             {/* Chevron Indicators */}
             <div className="absolute -left-5 top-1/2 -translate-y-1/2 text-brand-primary font-black text-sm tracking-tighter drop-shadow-[0_0_8px_rgba(212,168,83,0.8)]">
                &gt;&gt;
             </div>
             <div className="absolute -right-5 top-1/2 -translate-y-1/2 text-brand-primary font-black text-sm tracking-tighter drop-shadow-[0_0_8px_rgba(212,168,83,0.8)]">
                &lt;&lt;
             </div>
             
             {/* Corner accents */}
             <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-white/80" />
             <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-white/80" />
             <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-white/80" />
             <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-white/80" />
           </div>

           {/* Fade Gradients — uses brand-secondary to blend with app theme */}
           <div className="absolute inset-x-0 top-0 h-[90px] z-40 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, #1A1A2E, rgba(26,26,46,0.7), transparent)' }} />
           <div className="absolute inset-x-0 bottom-0 h-[90px] z-40 pointer-events-none"
                style={{ background: 'linear-gradient(to top, #1A1A2E, rgba(26,26,46,0.7), transparent)' }} />
         </div>
       </div>
     </div>
  );
}

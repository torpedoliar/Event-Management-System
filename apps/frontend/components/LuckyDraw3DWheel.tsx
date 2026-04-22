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
  const H = 100; // slightly smaller height for items to fit nicely
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
            // Slower deceleration for a relaxed dramatic stop
            currentAngleRef.current -= Math.max(0.05, remaining * 0.015) * frameFactor;
          } else {
            currentAngleRef.current = target;
            wobbleCenterRef.current = target;
            wobbleStartTimeRef.current = performance.now();
            phaseRef.current = 'wobbling';
          }
        } else if (phase === 'wobbling') {
          const elapsed = (time - wobbleStartTimeRef.current) / 1000;
          const totalDuration = 5.0; // 5 seconds of suspense
          
          if (elapsed < totalDuration) {
             // Very slow, subtle rocking back and forth between the two names
             // The tension makes it feel like momentum is exhausted
             const amplitude = (theta / 2) * 0.35; // Move up to 35% of the half-slot
             // Slow frequency that winds down over time
             const freq = 1.2 * (1 - elapsed / totalDuration); 
             const offset = Math.sin(elapsed * freq * Math.PI * 2) * amplitude;
             currentAngleRef.current = wobbleCenterRef.current + offset;
          } else {
            phaseRef.current = 'snapping';
            if (containerRef.current) {
              containerRef.current.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1)'; // smooth, relaxed snap
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
        // Randomly decide if the winner will be the top name or bottom name during the showdown
        const winnerIsTop = Math.random() > 0.5;
        
        if (winnerIsTop) {
          // Midpoint between winner and neighbor below
          // Winner is at index 20 (WINNER_INDEX). Neighbor below is 21.
          // To put the line between them, target safeTarget - theta/2
          targetAngleRef.current = safeTarget - theta / 2;
        } else {
          // Midpoint between winner and neighbor above
          // Neighbor above is 19.
          // To put the line between them, target safeTarget + theta/2
          targetAngleRef.current = safeTarget + theta / 2;
        }
        wobbleFinalTargetRef.current = safeTarget; // It will always snap back to winner
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

  const topDots = Array.from({ length: 9 }, (_, i) => i);
  const bottomDots = Array.from({ length: 9 }, (_, i) => i);
  const sideDots = Array.from({ length: 3 }, (_, i) => i);

  return (
     <div className="relative w-full max-w-[600px] mx-auto py-4">
       {/* ═══ GOLDEN CELEBRATION TECH DESIGN ═══ */}
       <div className="relative flex items-center justify-center h-[350px]">
         
         {/* Background Glow */}
         <div className="absolute -inset-10 rounded-[50%] opacity-30 blur-[80px] pointer-events-none"
           style={{ background: 'radial-gradient(ellipse, #D4A853 0%, transparent 60%)' }} />

         {/* ─── 3D Cylinder Container ─── */}
         <div className="absolute inset-0 flex items-center justify-center z-20">
           <div 
             ref={containerRef}
             className="relative w-[90%] md:w-[450px] h-[80px]"
             style={{ transformStyle: 'preserve-3d', transform: `translateZ(${-radius}px)` }}
           >
             {wheelItems.map((item, i) => (
                <div
                   key={`${item.id}-${i}`}
                   className="absolute left-0 top-0 w-full h-[80px] flex items-center justify-center rounded-2xl overflow-hidden backdrop-blur-md"
                   style={{
                      transform: `rotateX(${i * theta}deg) translateZ(${radius}px)`,
                      backfaceVisibility: 'hidden',
                      background: 'linear-gradient(180deg, rgba(212,168,83,0.3) 0%, rgba(0,0,0,0.8) 20%, rgba(0,0,0,0.8) 80%, rgba(212,168,83,0.3) 100%)',
                      border: '1px solid rgba(212,168,83,0.5)',
                      boxShadow: '0 0 15px rgba(212,168,83,0.2), inset 0 0 20px rgba(212,168,83,0.1)',
                   }}
                >
                   <div className="flex items-center justify-between w-full px-6 text-center">
                      <div className="font-black text-2xl tracking-widest text-brand-primary drop-shadow-[0_0_8px_rgba(212,168,83,0.8)] w-20 text-left">
                        {item.queueNumber}
                      </div>
                      <div className="flex-1 flex flex-col items-end">
                        <span className="font-bold text-lg text-white uppercase tracking-wide leading-tight drop-shadow-md text-right">
                          {item.name}
                        </span>
                        <span className="text-xs font-mono text-brand-primarySoft mt-0.5 text-right opacity-80 tracking-widest">
                          {item.guestId || item.company || '-'}
                        </span>
                      </div>
                   </div>
                </div>
             ))}
           </div>
         </div>

         {/* ─── Holographic Center Highlight Frame ─── */}
         <div className="absolute left-[2%] right-[2%] md:left-[-5%] md:right-[-5%] top-1/2 -translate-y-1/2 h-[90px] z-30 rounded-2xl border-[2px] border-brand-primary pointer-events-none"
              style={{
                boxShadow: '0 0 30px rgba(212,168,83,0.4), inset 0 0 30px rgba(212,168,83,0.2)',
                background: 'linear-gradient(90deg, rgba(212,168,83,0.1), transparent, rgba(212,168,83,0.1))'
              }}>
           
           {/* Futuristic Chevron Indicators */}
           <div className="absolute -left-[10px] top-1/2 -translate-y-1/2 flex items-center justify-center text-brand-primary font-black text-xl drop-shadow-[0_0_10px_rgba(212,168,83,0.8)] animate-pulse">
              &gt;&gt;
           </div>
           <div className="absolute -right-[10px] top-1/2 -translate-y-1/2 flex items-center justify-center text-brand-primary font-black text-xl drop-shadow-[0_0_10px_rgba(212,168,83,0.8)] animate-pulse">
              &lt;&lt;
           </div>
           
           {/* Corner Tech Accents */}
           <div className="absolute -top-[2px] -left-[2px] w-4 h-4 border-t-[3px] border-l-[3px] border-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
           <div className="absolute -top-[2px] -right-[2px] w-4 h-4 border-t-[3px] border-r-[3px] border-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
           <div className="absolute -bottom-[2px] -left-[2px] w-4 h-4 border-b-[3px] border-l-[3px] border-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
           <div className="absolute -bottom-[2px] -right-[2px] w-4 h-4 border-b-[3px] border-r-[3px] border-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
         </div>

         {/* ─── Massive Glowing Energy Ring (from Image 3) ─── */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] md:w-[130%] h-[200px] z-10 pointer-events-none rounded-[50%] border-[2px] border-brand-primary opacity-60"
              style={{
                transform: 'translate(-50%, -50%) rotateX(75deg)',
                boxShadow: '0 0 50px 10px rgba(212,168,83,0.4), inset 0 0 30px rgba(212,168,83,0.4)',
                animation: spinning ? 'spin 4s linear infinite' : 'none'
              }} />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] md:w-[140%] h-[220px] z-10 pointer-events-none rounded-[50%] border-[1px] border-brand-primarySoft opacity-30 border-dashed"
              style={{
                transform: 'translate(-50%, -50%) rotateX(75deg) rotate(45deg)',
                animation: spinning ? 'spin 6s linear infinite reverse' : 'none'
              }} />

         {/* Fade Gradients for cylinder perspective */}
         <div className="absolute inset-x-0 top-0 h-[100px] bg-gradient-to-b from-[#0B0B13] via-[#0B0B13]/80 to-transparent z-40 pointer-events-none" />
         <div className="absolute inset-x-0 bottom-0 h-[100px] bg-gradient-to-t from-[#0B0B13] via-[#0B0B13]/80 to-transparent z-40 pointer-events-none" />
       </div>
     </div>
  );
}


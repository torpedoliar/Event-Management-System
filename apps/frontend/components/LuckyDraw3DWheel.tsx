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
  const H = 110;
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
  const wobbleDirectionRef = useRef(1);
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
            currentAngleRef.current -= Math.max(0.1, remaining * 0.02) * frameFactor;
          } else {
            currentAngleRef.current = target;
            wobbleCenterRef.current = target;
            wobbleStartTimeRef.current = performance.now();
            wobbleDirectionRef.current = Math.random() > 0.5 ? -1 : 1;
            wobbleFinalTargetRef.current = target - theta / 2;
            phaseRef.current = 'wobbling';
          }
        } else if (phase === 'wobbling') {
          const elapsed = (time - wobbleStartTimeRef.current) / 1000;
          const center = wobbleCenterRef.current;
          const halfSlot = theta / 2;
          const totalDuration = 3.5;
          if (elapsed < totalDuration) {
            const progress = elapsed / totalDuration;
            const ampEnvelope = Math.sin(progress * Math.PI) * (1 - progress * 0.3);
            const amplitude = halfSlot * 0.85 * ampEnvelope;
            const freq = 0.8 + (2.8 - 0.8) * Math.sin(progress * Math.PI);
            const phaseAngle = elapsed * freq * Math.PI * 2;
            let bias = 0;
            if (progress > 0.7) {
              const bp = (progress - 0.7) / 0.3;
              bias = wobbleDirectionRef.current * halfSlot * 0.4 * bp * bp;
            }
            const jitter = (Math.random() - 0.5) * 0.3 * (1 - progress);
            currentAngleRef.current = center + Math.sin(phaseAngle) * amplitude * wobbleDirectionRef.current + bias + jitter;
          } else {
            phaseRef.current = 'snapping';
            if (containerRef.current) {
              containerRef.current.style.transition = 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
              const finalTarget = wobbleFinalTargetRef.current;
              currentAngleRef.current = finalTarget;
              containerRef.current.style.transform = `translateZ(${-radius}px) rotateX(${finalTarget}deg)`;
            }
            setTimeout(() => {
              phaseRef.current = 'stopped';
              if (!onStopCalledRef.current) { onStopCalledRef.current = true; onStopRef.current(); }
            }, 1400);
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
        targetAngleRef.current = safeTarget + theta / 2;
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

  // Generate decorative light dots for the ornate frame
  const topDots = Array.from({ length: 9 }, (_, i) => i);
  const bottomDots = Array.from({ length: 9 }, (_, i) => i);
  const leftDots = Array.from({ length: 5 }, (_, i) => i);
  const rightDots = Array.from({ length: 5 }, (_, i) => i);
  
  return (
     <div className="relative w-full max-w-2xl mx-auto">
       {/* ═══ LUXURY ORNATE FRAME ═══ */}
       <div className="relative">
         {/* Outer glow */}
         <div className="absolute -inset-4 rounded-[2rem] opacity-60 blur-2xl"
           style={{ background: 'radial-gradient(ellipse at center, rgba(212,168,83,0.3) 0%, transparent 70%)' }}
         />

         {/* Double-border ornate frame */}
         <div className="relative rounded-2xl"
           style={{
             background: 'linear-gradient(180deg, #C9A84C 0%, #8B6914 15%, #D4A853 30%, #8B6914 50%, #D4A853 70%, #8B6914 85%, #C9A84C 100%)',
             padding: '4px',
             boxShadow: '0 0 40px rgba(212,168,83,0.25), inset 0 1px 0 rgba(255,255,255,0.3)',
           }}
         >
           {/* Inner gold border */}
           <div className="rounded-[14px]"
             style={{
               background: 'linear-gradient(180deg, #1A1A2E 0%, #0F0F1A 100%)',
               padding: '3px',
             }}
           >
             <div className="rounded-xl overflow-hidden"
               style={{
                 background: 'linear-gradient(180deg, #C9A84C 0%, #A07D28 50%, #C9A84C 100%)',
                 padding: '3px',
               }}
             >
               {/* ─── Light Bulb Dots — Top ─── */}
               <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-[calc(100%/12)] z-40 -translate-y-[2px]">
                 {topDots.map(i => (
                   <div key={`t${i}`} className="w-2 h-2 rounded-full"
                     style={{
                       background: spinning
                         ? `radial-gradient(circle, #FFF9C4 0%, #FFD700 60%, #B8860B 100%)`
                         : `radial-gradient(circle, #D4A853 0%, #8B6914 100%)`,
                       boxShadow: spinning ? '0 0 6px 2px rgba(255,215,0,0.6)' : '0 0 3px rgba(212,168,83,0.3)',
                       animation: spinning ? `bulb-flicker 0.8s ease-in-out ${i * 0.1}s infinite alternate` : 'none',
                     }}
                   />
                 ))}
               </div>

               {/* ─── Light Bulb Dots — Bottom ─── */}
               <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-[calc(100%/12)] z-40 translate-y-[2px]">
                 {bottomDots.map(i => (
                   <div key={`b${i}`} className="w-2 h-2 rounded-full"
                     style={{
                       background: spinning
                         ? `radial-gradient(circle, #FFF9C4 0%, #FFD700 60%, #B8860B 100%)`
                         : `radial-gradient(circle, #D4A853 0%, #8B6914 100%)`,
                       boxShadow: spinning ? '0 0 6px 2px rgba(255,215,0,0.6)' : '0 0 3px rgba(212,168,83,0.3)',
                       animation: spinning ? `bulb-flicker 0.8s ease-in-out ${i * 0.1 + 0.05}s infinite alternate` : 'none',
                     }}
                   />
                 ))}
               </div>

               {/* ─── Light Bulb Dots — Left ─── */}
               <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-40 -translate-x-[2px]">
                 {leftDots.map(i => (
                   <div key={`l${i}`} className="w-2 h-2 rounded-full"
                     style={{
                       background: spinning
                         ? `radial-gradient(circle, #FFF9C4 0%, #FFD700 60%, #B8860B 100%)`
                         : `radial-gradient(circle, #D4A853 0%, #8B6914 100%)`,
                       boxShadow: spinning ? '0 0 6px 2px rgba(255,215,0,0.6)' : '0 0 3px rgba(212,168,83,0.3)',
                       animation: spinning ? `bulb-flicker 0.7s ease-in-out ${i * 0.15}s infinite alternate` : 'none',
                     }}
                   />
                 ))}
               </div>

               {/* ─── Light Bulb Dots — Right ─── */}
               <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-40 translate-x-[2px]">
                 {rightDots.map(i => (
                   <div key={`r${i}`} className="w-2 h-2 rounded-full"
                     style={{
                       background: spinning
                         ? `radial-gradient(circle, #FFF9C4 0%, #FFD700 60%, #B8860B 100%)`
                         : `radial-gradient(circle, #D4A853 0%, #8B6914 100%)`,
                       boxShadow: spinning ? '0 0 6px 2px rgba(255,215,0,0.6)' : '0 0 3px rgba(212,168,83,0.3)',
                       animation: spinning ? `bulb-flicker 0.7s ease-in-out ${i * 0.15 + 0.05}s infinite alternate` : 'none',
                     }}
                   />
                 ))}
               </div>

               {/* ─── Corner Ornaments ─── */}
               {['-top-2 -left-2', '-top-2 -right-2', '-bottom-2 -left-2', '-bottom-2 -right-2'].map((pos, idx) => (
                 <div key={idx} className={`absolute ${pos} w-5 h-5 z-40`}>
                   <div className="w-full h-full rounded-full"
                     style={{
                       background: 'radial-gradient(circle at 30% 30%, #FFE082, #D4A853, #8B6914)',
                       boxShadow: '0 0 10px rgba(212,168,83,0.5), inset 0 1px 2px rgba(255,255,255,0.4)',
                       border: '1px solid rgba(139,105,20,0.6)',
                     }}
                   />
                 </div>
               ))}

               {/* ─── Side Lever/Handle — Left ─── */}
               <div className="absolute -left-8 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-center gap-1">
                 <div className="w-3 h-3 rounded-full"
                   style={{ background: 'radial-gradient(circle at 30% 30%, #FFE082, #C9A84C)', boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
                 />
                 <div className="w-2 h-16 rounded-full"
                   style={{ background: 'linear-gradient(90deg, #8B6914, #D4A853, #8B6914)', boxShadow: '2px 0 8px rgba(0,0,0,0.3)' }}
                 />
                 <div className="w-4 h-4 rounded-full"
                   style={{ background: 'radial-gradient(circle at 30% 30%, #FFE082, #C9A84C)', boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
                 />
               </div>

               {/* ─── Side Lever/Handle — Right ─── */}
               <div className="absolute -right-8 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-center gap-1">
                 <div className="w-3 h-3 rounded-full"
                   style={{ background: 'radial-gradient(circle at 30% 30%, #FFE082, #C9A84C)', boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
                 />
                 <div className="w-2 h-16 rounded-full"
                   style={{ background: 'linear-gradient(90deg, #8B6914, #D4A853, #8B6914)', boxShadow: '-2px 0 8px rgba(0,0,0,0.3)' }}
                 />
                 <div className="w-4 h-4 rounded-full"
                   style={{ background: 'radial-gradient(circle at 30% 30%, #FFE082, #C9A84C)', boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
                 />
               </div>

               {/* ═══ INNER WHEEL VIEWPORT ═══ */}
               <div 
                 className="relative h-[320px] flex items-center justify-center overflow-hidden rounded-lg"
                 style={{ 
                   perspective: '1200px',
                   background: 'linear-gradient(180deg, rgba(15,15,26,0.95) 0%, rgba(26,26,46,0.98) 50%, rgba(15,15,26,0.95) 100%)',
                   WebkitMaskImage: 'linear-gradient(to bottom, transparent 1%, black 12%, black 88%, transparent 99%)',
                   maskImage: 'linear-gradient(to bottom, transparent 1%, black 12%, black 88%, transparent 99%)',
                   boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8), inset 0 0 20px rgba(212,168,83,0.05)',
                 }}
               >
                 {/* ─── Highlight Bar ─── */}
                 <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[88px] z-20"
                   style={{
                     borderTop: '2px solid rgba(212,168,83,0.7)',
                     borderBottom: '2px solid rgba(212,168,83,0.7)',
                     background: 'linear-gradient(90deg, rgba(212,168,83,0.08) 0%, rgba(212,168,83,0.15) 50%, rgba(212,168,83,0.08) 100%)',
                     boxShadow: '0 0 25px rgba(212,168,83,0.15), inset 0 0 25px rgba(212,168,83,0.05)',
                   }}
                 />
                 
                 {/* ─── Pointer Chevrons ─── */}
                 <div className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-30 flex items-center">
                   <span className="text-2xl md:text-3xl font-black tracking-tighter"
                     style={{ color: '#D4A853', textShadow: '0 0 10px rgba(212,168,83,0.8), 0 0 20px rgba(212,168,83,0.4)', filter: spinning ? 'brightness(1.3)' : 'none' }}
                   >&gt;&gt;</span>
                 </div>
                 <div className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 flex items-center">
                   <span className="text-2xl md:text-3xl font-black tracking-tighter"
                     style={{ color: '#D4A853', textShadow: '0 0 10px rgba(212,168,83,0.8), 0 0 20px rgba(212,168,83,0.4)', filter: spinning ? 'brightness(1.3)' : 'none' }}
                   >&lt;&lt;</span>
                 </div>

                 {/* ─── 3D Cylinder ─── */}
                 <div 
                   ref={containerRef}
                   className="relative w-[75%] h-[80px]"
                   style={{ transformStyle: 'preserve-3d', transform: `translateZ(${-radius}px)` }}
                 >
                   {wheelItems.map((item, i) => (
                      <div
                         key={`${item.id}-${i}`}
                         className="absolute left-0 top-0 w-full h-[80px] flex items-center justify-center rounded-lg overflow-hidden"
                         style={{
                            transform: `rotateX(${i * theta}deg) translateZ(${radius}px)`,
                            backfaceVisibility: 'hidden',
                            background: 'linear-gradient(180deg, rgba(40,35,25,0.9) 0%, rgba(30,28,20,0.95) 50%, rgba(40,35,25,0.9) 100%)',
                            borderTop: '1px solid rgba(212,168,83,0.25)',
                            borderBottom: '1px solid rgba(139,105,20,0.3)',
                         }}
                      >
                         <div className="flex items-center w-full px-4 md:px-6 relative z-10 gap-4">
                            <span className="font-black text-3xl md:text-4xl tracking-wider flex-shrink-0"
                              style={{ color: '#D4A853', textShadow: '0 2px 8px rgba(212,168,83,0.4)' }}
                            >{item.queueNumber}</span>
                            <div className="flex flex-col flex-1 min-w-0 text-center">
                               <span className="font-bold text-base md:text-lg truncate"
                                 style={{ color: '#F5ECD7', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                               >{item.name}</span>
                               <span className="text-xs md:text-sm font-mono truncate mt-0.5"
                                 style={{ color: 'rgba(212,168,83,0.5)' }}
                               >{item.guestId || item.company || '-'}</span>
                            </div>
                         </div>
                      </div>
                   ))}
                 </div>
               </div>
             </div>
           </div>
         </div>

         {/* ─── Sparkle Effects ─── */}
         {spinning && (
           <>
             <div className="absolute -top-3 left-1/4 w-1.5 h-1.5 rounded-full bg-yellow-300 z-50" style={{ animation: 'sparkle-float 1.5s ease-in-out infinite', animationDelay: '0s' }} />
             <div className="absolute -top-2 right-1/3 w-1 h-1 rounded-full bg-yellow-200 z-50" style={{ animation: 'sparkle-float 1.8s ease-in-out infinite', animationDelay: '0.3s' }} />
             <div className="absolute top-1/4 -right-3 w-1.5 h-1.5 rounded-full bg-yellow-300 z-50" style={{ animation: 'sparkle-float 1.3s ease-in-out infinite', animationDelay: '0.6s' }} />
             <div className="absolute bottom-1/4 -left-2 w-1 h-1 rounded-full bg-yellow-200 z-50" style={{ animation: 'sparkle-float 1.6s ease-in-out infinite', animationDelay: '0.9s' }} />
             <div className="absolute -bottom-2 left-1/2 w-1.5 h-1.5 rounded-full bg-yellow-300 z-50" style={{ animation: 'sparkle-float 1.4s ease-in-out infinite', animationDelay: '0.2s' }} />
           </>
         )}
       </div>
     </div>
  );
}

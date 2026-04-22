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
     <div className="relative w-full max-w-[800px] mx-auto py-10">
       {/* ═══ LUXURY CASINO MACHINE DESIGN ═══ */}
       <div className="relative flex items-center justify-center">
         
         {/* Background Glow */}
         <div className="absolute -inset-10 rounded-[50%] opacity-40 blur-[60px]"
           style={{ background: 'radial-gradient(circle, #D4A853 0%, transparent 60%)' }} />

         {/* ─── Machine Base Drum ─── */}
         <div className="relative w-full h-[400px] flex items-center justify-center">
           {/* Outer Gear / Drum Back */}
           <div className="absolute inset-0 bg-[#0a0a0a] rounded-full shadow-2xl border-[6px] border-[#3a2808]"
                style={{ 
                  boxShadow: 'inset 0 0 50px rgba(0,0,0,1), 0 20px 50px rgba(0,0,0,0.8)',
                  transform: 'scaleX(0.95)'
                }}>
              {/* Drum Ribs / Metallic texture */}
              <div className="absolute inset-2 rounded-full opacity-30"
                   style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 20px, #D4A853 20px, #D4A853 22px)' }} />
           </div>

           {/* Left Golden Rim */}
           <div className="absolute left-[3%] top-[-5%] bottom-[-5%] w-[100px] z-10 rounded-[100%] border-[4px] border-[#ffe699]"
                style={{ 
                  background: 'linear-gradient(90deg, #8B6914 0%, #D4A853 30%, #FFF2CC 50%, #D4A853 70%, #8B6914 100%)',
                  boxShadow: 'inset -10px 0 20px rgba(0,0,0,0.8), 10px 0 20px rgba(0,0,0,0.5)',
                  transform: 'scaleX(0.5)'
                }}>
             {/* Gear Teeth on left rim */}
             <div className="absolute inset-y-[-20px] left-[-30px] w-[30px] overflow-hidden">
               <div className="w-[60px] h-full" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 15px, #8B6914 15px, #D4A853 30px)' }} />
             </div>
           </div>

           {/* Right Golden Rim */}
           <div className="absolute right-[3%] top-[-5%] bottom-[-5%] w-[100px] z-10 rounded-[100%] border-[4px] border-[#ffe699]"
                style={{ 
                  background: 'linear-gradient(270deg, #8B6914 0%, #D4A853 30%, #FFF2CC 50%, #D4A853 70%, #8B6914 100%)',
                  boxShadow: 'inset 10px 0 20px rgba(0,0,0,0.8), -10px 0 20px rgba(0,0,0,0.5)',
                  transform: 'scaleX(0.5)'
                }}>
             {/* Gear Teeth on right rim */}
             <div className="absolute inset-y-[-20px] right-[-30px] w-[30px] overflow-hidden">
               <div className="absolute right-0 w-[60px] h-full" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 15px, #8B6914 15px, #D4A853 30px)' }} />
             </div>
           </div>

           {/* ─── The Pull Lever (Right Side) ─── */}
           <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-0">
             <div className="relative h-[250px] w-[60px]">
               {/* Base mechanism */}
               <div className="absolute bottom-[30%] left-0 w-[40px] h-[80px] rounded-lg"
                    style={{ background: 'linear-gradient(90deg, #4a3810, #8B6914, #4a3810)', boxShadow: '5px 5px 15px rgba(0,0,0,0.8)' }} />
               {/* Lever Rod (animated when spinning) */}
               <div className="absolute bottom-[50%] left-[10px] w-[20px] h-[140px] origin-bottom transition-transform duration-500"
                    style={{ 
                      background: 'linear-gradient(90deg, #d4af37, #fceabb, #d4af37)',
                      transform: spinning ? 'rotateX(60deg) translateY(40px)' : 'rotateX(10deg)',
                      boxShadow: '2px 0 10px rgba(0,0,0,0.5)'
                    }}>
                 {/* Lever Ball */}
                 <div className="absolute top-[-30px] left-[-15px] w-[50px] h-[50px] rounded-full border-2 border-[#fff2cc]"
                      style={{ 
                        background: 'radial-gradient(circle at 30% 30%, #ffffff, #d4af37, #8b6508)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.8)'
                      }} />
               </div>
             </div>
           </div>

           {/* ─── Inner Display Window ─── */}
           <div className="relative w-[500px] max-w-[90%] h-[320px] z-20 rounded-[2rem] bg-black overflow-hidden border-[8px] border-[#2a1b08]"
                style={{
                  boxShadow: '0 0 50px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,0,0,1)'
                }}>
             {/* ─── 3D Cylinder ─── */}
             <div className="absolute inset-0 flex items-center justify-center">
               <div 
                 ref={containerRef}
                 className="relative w-[90%] h-[90px]"
                 style={{ transformStyle: 'preserve-3d', transform: `translateZ(${-radius}px)` }}
               >
                 {wheelItems.map((item, i) => (
                    <div
                       key={`${item.id}-${i}`}
                       className="absolute left-0 top-0 w-full h-[90px] flex items-center justify-center rounded-xl overflow-hidden"
                       style={{
                          transform: `rotateX(${i * theta}deg) translateZ(${radius}px)`,
                          backfaceVisibility: 'hidden',
                          background: 'linear-gradient(180deg, #e6c27a 0%, #d4af37 20%, #a67c00 50%, #d4af37 80%, #e6c27a 100%)',
                          borderTop: '2px solid #fff2cc',
                          borderBottom: '2px solid #6b4c0a',
                          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
                       }}
                    >
                       <div className="flex flex-col items-center justify-center w-full px-4 text-center">
                          <span className="font-black text-2xl md:text-3xl tracking-widest text-[#1a1100]"
                                style={{ textShadow: '0px 1px 1px rgba(255,255,255,0.4)' }}>
                            {item.queueNumber}
                          </span>
                          <span className="font-bold text-base md:text-lg text-[#2a1b00] uppercase tracking-wide leading-tight mt-1"
                                style={{ textShadow: '0px 1px 1px rgba(255,255,255,0.4)' }}>
                            {item.name}
                          </span>
                          <span className="text-xs md:text-sm font-mono text-[#4a3100] mt-0.5"
                                style={{ textShadow: '0px 1px 1px rgba(255,255,255,0.4)' }}>
                            {item.guestId || item.company || '-'}
                          </span>
                       </div>
                    </div>
                 ))}
               </div>
             </div>

             {/* ─── Inner Highlight Window Frame (The Golden Rectangle in the middle) ─── */}
             <div className="absolute left-[5%] right-[5%] top-1/2 -translate-y-1/2 h-[104px] z-30 rounded-2xl border-[4px] border-[#ffdf70] pointer-events-none"
                  style={{
                    boxShadow: '0 0 30px rgba(255,215,0,0.4), inset 0 0 30px rgba(255,215,0,0.2)',
                    background: 'linear-gradient(90deg, rgba(255,215,0,0.05), transparent, rgba(255,215,0,0.05))'
                  }}>
               
               {/* Pointer Chevrons Attached to Highlight Frame */}
               <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-[30px] h-[50px] flex items-center justify-center z-40"
                    style={{ background: 'linear-gradient(90deg, #8B6914, #D4A853)', clipPath: 'polygon(0 50%, 100% 0, 100% 100%)' }}>
                  <span className="text-[#1a1100] font-black text-lg -ml-1">&gt;&gt;</span>
               </div>
               <div className="absolute -right-[30px] top-1/2 -translate-y-1/2 w-[30px] h-[50px] flex items-center justify-center z-40"
                    style={{ background: 'linear-gradient(270deg, #8B6914, #D4A853)', clipPath: 'polygon(100% 50%, 0 0, 0 100%)' }}>
                  <span className="text-[#1a1100] font-black text-lg -mr-1">&lt;&lt;</span>
               </div>

               {/* Light Bulbs Top */}
               <div className="absolute -top-[14px] left-[5%] right-[5%] flex justify-between">
                 {topDots.map(i => (
                   <div key={`t${i}`} className="w-3 h-3 rounded-full border border-[#8B6914]"
                     style={{
                       background: spinning ? `radial-gradient(circle, #FFF9C4 0%, #FFD700 60%, #B8860B 100%)` : `radial-gradient(circle, #D4A853 0%, #8B6914 100%)`,
                       boxShadow: spinning ? '0 0 8px 3px rgba(255,215,0,0.8)' : '0 0 2px rgba(212,168,83,0.5)',
                       animation: spinning ? `bulb-flicker 0.6s ease-in-out ${i * 0.08}s infinite alternate` : 'none',
                     }} />
                 ))}
               </div>
               {/* Light Bulbs Bottom */}
               <div className="absolute -bottom-[14px] left-[5%] right-[5%] flex justify-between">
                 {bottomDots.map(i => (
                   <div key={`b${i}`} className="w-3 h-3 rounded-full border border-[#8B6914]"
                     style={{
                       background: spinning ? `radial-gradient(circle, #FFF9C4 0%, #FFD700 60%, #B8860B 100%)` : `radial-gradient(circle, #D4A853 0%, #8B6914 100%)`,
                       boxShadow: spinning ? '0 0 8px 3px rgba(255,215,0,0.8)' : '0 0 2px rgba(212,168,83,0.5)',
                       animation: spinning ? `bulb-flicker 0.6s ease-in-out ${i * 0.08 + 0.04}s infinite alternate` : 'none',
                     }} />
                 ))}
               </div>
               {/* Light Bulbs Left */}
               <div className="absolute -left-[14px] top-[15%] bottom-[15%] flex flex-col justify-between">
                 {sideDots.map(i => (
                   <div key={`l${i}`} className="w-3 h-3 rounded-full border border-[#8B6914]"
                     style={{
                       background: spinning ? `radial-gradient(circle, #FFF9C4 0%, #FFD700 60%, #B8860B 100%)` : `radial-gradient(circle, #D4A853 0%, #8B6914 100%)`,
                       boxShadow: spinning ? '0 0 8px 3px rgba(255,215,0,0.8)' : '0 0 2px rgba(212,168,83,0.5)',
                       animation: spinning ? `bulb-flicker 0.6s ease-in-out ${i * 0.12}s infinite alternate` : 'none',
                     }} />
                 ))}
               </div>
               {/* Light Bulbs Right */}
               <div className="absolute -right-[14px] top-[15%] bottom-[15%] flex flex-col justify-between">
                 {sideDots.map(i => (
                   <div key={`r${i}`} className="w-3 h-3 rounded-full border border-[#8B6914]"
                     style={{
                       background: spinning ? `radial-gradient(circle, #FFF9C4 0%, #FFD700 60%, #B8860B 100%)` : `radial-gradient(circle, #D4A853 0%, #8B6914 100%)`,
                       boxShadow: spinning ? '0 0 8px 3px rgba(255,215,0,0.8)' : '0 0 2px rgba(212,168,83,0.5)',
                       animation: spinning ? `bulb-flicker 0.6s ease-in-out ${i * 0.12 + 0.06}s infinite alternate` : 'none',
                     }} />
                 ))}
               </div>
             </div>

             {/* Fade Gradients for cylinder perspective */}
             <div className="absolute inset-x-0 top-0 h-[80px] bg-gradient-to-b from-black via-black/80 to-transparent z-10 pointer-events-none" />
             <div className="absolute inset-x-0 bottom-0 h-[80px] bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none" />
           </div>
         </div>

         {/* ─── Sparkle Effects ─── */}
         {spinning && (
           <>
             <div className="absolute top-[10%] left-[20%] w-2 h-2 rounded-full bg-white z-50" style={{ animation: 'sparkle-float 1.2s ease-in-out infinite', animationDelay: '0s', boxShadow: '0 0 10px 4px rgba(255,215,0,0.8)' }} />
             <div className="absolute top-[20%] right-[15%] w-1.5 h-1.5 rounded-full bg-white z-50" style={{ animation: 'sparkle-float 1.5s ease-in-out infinite', animationDelay: '0.3s', boxShadow: '0 0 8px 3px rgba(255,215,0,0.8)' }} />
             <div className="absolute bottom-[15%] left-[25%] w-2 h-2 rounded-full bg-white z-50" style={{ animation: 'sparkle-float 1.4s ease-in-out infinite', animationDelay: '0.6s', boxShadow: '0 0 10px 4px rgba(255,215,0,0.8)' }} />
             <div className="absolute bottom-[20%] right-[25%] w-1.5 h-1.5 rounded-full bg-white z-50" style={{ animation: 'sparkle-float 1.6s ease-in-out infinite', animationDelay: '0.9s', boxShadow: '0 0 8px 3px rgba(255,215,0,0.8)' }} />
           </>
         )}
       </div>
     </div>
  );
}


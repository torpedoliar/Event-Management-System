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

type WheelPhase = 'idle' | 'spinning' | 'decelerating' | 'fake-stop' | 'snapping' | 'stopped';

export default function LuckyDraw3DWheel({
  candidates,
  winner,
  spinning,
  isGrandPrize,
  stopDelay,
  onStop
}: LuckyDraw3DWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fixed 40-slot cylinder
  const N = 40;
  const H = 110; // 80px card + 30px gap
  const theta = 360 / N; // 9 degrees per slot
  const radius = Math.round((H / 2) / Math.tan(Math.PI / N));
  
  const [wheelItems, setWheelItems] = useState<Guest[]>([]);
  
  // The winner should land in the center of the visible area.
  // The "center" of the viewport corresponds to rotateX(0), so we target
  // index 0 (the first slot) and calculate rotation to bring it to center.
  // Actually, let's use a fixed target index and compute the angle to place it at the top.
  const WINNER_INDEX = 20; // Place winner roughly halfway around

  const onStopRef = useRef(onStop);
  const onStopCalledRef = useRef(false);

  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);
  
  // Build initial wheel items from candidates
  const buildWheelItems = useCallback((candidateList: Guest[], winnerGuest?: Guest | null): Guest[] => {
    if (candidateList.length === 0) return [];
    
    const items: Guest[] = [];
    for (let i = 0; i < N; i++) {
      items.push(candidateList[Math.floor(Math.random() * candidateList.length)]);
    }
    
    // If winner is known, place at target index
    if (winnerGuest) {
      items[WINNER_INDEX] = winnerGuest;
      // Also ensure neighbors are different from winner for visual clarity
      const nonWinnerCandidates = candidateList.filter(c => c.id !== winnerGuest.id);
      if (nonWinnerCandidates.length > 0) {
        if (WINNER_INDEX > 0) items[WINNER_INDEX - 1] = nonWinnerCandidates[Math.floor(Math.random() * nonWinnerCandidates.length)];
        if (WINNER_INDEX < N - 1) items[WINNER_INDEX + 1] = nonWinnerCandidates[Math.floor(Math.random() * nonWinnerCandidates.length)];
      }
    }
    
    return items;
  }, [N, WINNER_INDEX]);

  // Initialize wheel items when candidates first load
  useEffect(() => {
    if (candidates.length > 0 && wheelItems.length === 0) {
      setWheelItems(buildWheelItems(candidates));
    }
  }, [candidates, wheelItems.length, buildWheelItems]);

  // Animation state refs
  const currentAngleRef = useRef(0);
  const velocityRef = useRef(0);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<WheelPhase>('idle');
  const stopDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const targetAngleRef = useRef(0);
  const winnerInsertedRef = useRef(false);

  // When spinning starts — rebuild wheel, start animation
  useEffect(() => {
    if (spinning && candidates.length > 0) {
      // Reset state for new spin
      onStopCalledRef.current = false;
      winnerInsertedRef.current = false;
      
      // Reset CSS transition  
      if (containerRef.current) {
        containerRef.current.style.transition = 'none';
      }
      
      // Build fresh wheel items (winner not known yet during spin)
      setWheelItems(buildWheelItems(candidates));
      
      phaseRef.current = 'spinning';
      velocityRef.current = 12 + Math.random() * 4; // Slight randomness in speed
      
      // Clear any pending timers
      if (stopDelayTimerRef.current) {
        clearTimeout(stopDelayTimerRef.current);
        stopDelayTimerRef.current = null;
      }
      
      let lastTime = performance.now();
      
      const animate = (time: number) => {
        const dt = Math.min(time - lastTime, 50); // Cap to avoid jumps
        lastTime = time;
        const frameFactor = dt / 16.67; // Normalize to 60fps
        
        const phase = phaseRef.current;
        
        if (phase === 'spinning') {
          // Free spin — constant high speed
          currentAngleRef.current -= velocityRef.current * frameFactor;
          
        } else if (phase === 'decelerating') {
          // Smooth deceleration toward target
          const target = targetAngleRef.current;
          const remaining = currentAngleRef.current - target;
          
          if (remaining > 0.3) {
            // Exponential easing
            const speed = Math.max(0.1, remaining * 0.025);
            currentAngleRef.current -= speed * frameFactor;
          } else {
            // Snap to exact target
            currentAngleRef.current = target;
            phaseRef.current = 'stopped';
            if (!onStopCalledRef.current) {
              onStopCalledRef.current = true;
              onStopRef.current();
            }
          }
          
        } else if (phase === 'fake-stop') {
          // Grand Prize: decelerate to one slot before winner, then pause + snap
          const target = targetAngleRef.current;
          const remaining = currentAngleRef.current - target;
          
          if (remaining > 0.3) {
            const speed = Math.max(0.1, remaining * 0.02);
            currentAngleRef.current -= speed * frameFactor;
          } else {
            // Reached the fake stop position
            currentAngleRef.current = target;
            phaseRef.current = 'snapping';
            
            // Dramatic pause, then CSS snap to real winner
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.style.transition = 'transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                const realTarget = target - theta; // One more slot to the actual winner
                currentAngleRef.current = realTarget;
                containerRef.current.style.transform = `translateZ(${-radius}px) rotateX(${realTarget}deg)`;
              }
              
              // After CSS transition completes
              setTimeout(() => {
                phaseRef.current = 'stopped';
                if (!onStopCalledRef.current) {
                  onStopCalledRef.current = true;
                  onStopRef.current();
                }
              }, 1600);
            }, 1500);
          }
        }
        
        // Update DOM
        if (containerRef.current && phase !== 'snapping' && phase !== 'stopped' && phase !== 'idle') {
          containerRef.current.style.transform = `translateZ(${-radius}px) rotateX(${currentAngleRef.current}deg)`;
        }
        
        // Continue loop unless stopped/snapping/idle
        if (phase !== 'stopped' && phase !== 'idle' && phase !== 'snapping') {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      
      rafRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // Only trigger on `spinning` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]);

  // When winner data arrives — insert into wheel and trigger deceleration
  useEffect(() => {
    if (!winner || winnerInsertedRef.current) return;
    if (phaseRef.current !== 'spinning') return; // Only insert if still spinning
    
    winnerInsertedRef.current = true;
    
    // Insert winner at target index in the wheel
    setWheelItems(prev => {
      const next = [...prev];
      next[WINNER_INDEX] = winner;
      
      // Ensure neighbors are distinct from winner
      const nonWinnerCandidates = candidates.filter(c => c.id !== winner.id);
      if (nonWinnerCandidates.length > 0) {
        if (WINNER_INDEX > 0) next[WINNER_INDEX - 1] = nonWinnerCandidates[Math.floor(Math.random() * nonWinnerCandidates.length)];
        if (WINNER_INDEX < N - 1) next[WINNER_INDEX + 1] = nonWinnerCandidates[Math.floor(Math.random() * nonWinnerCandidates.length)];
      }
      return next;
    });
    
    // Schedule deceleration after stopDelay
    stopDelayTimerRef.current = setTimeout(() => {
      const current = currentAngleRef.current;
      
      // Calculate target angle: winner at WINNER_INDEX needs to be at rotateX(0) center
      // Each slot is `theta` degrees apart. Index 0 = 0deg, Index i = i * theta deg.
      // The current angle is negative (rotating downward). 
      // Target: currentAngle = -(WINNER_INDEX * theta) - (fullRotations * 360)
      const winnerAngle = WINNER_INDEX * theta;
      const fullRotations = Math.floor(Math.abs(current) / 360) + 3; // At least 3 more full rotations
      const baseTarget = -(winnerAngle + fullRotations * 360);
      
      // Ensure target is below current (we're decrementing)
      targetAngleRef.current = baseTarget < current ? baseTarget : baseTarget - 360;
      
      if (isGrandPrize) {
        // Fake stop: target one slot BEFORE the winner
        targetAngleRef.current += theta; // One slot above winner
        phaseRef.current = 'fake-stop';
      } else {
        phaseRef.current = 'decelerating';
      }
    }, stopDelay);
    
    return () => {
      if (stopDelayTimerRef.current) {
        clearTimeout(stopDelayTimerRef.current);
      }
    };
  }, [winner, candidates, stopDelay, isGrandPrize, theta, radius, WINNER_INDEX, N]);

  // When spinning goes from true to false WITHOUT a winner (edge case / safety),
  // just stop gracefully
  useEffect(() => {
    if (!spinning && phaseRef.current === 'spinning' && !winner) {
      // Force stop — no winner determined, stop immediately  
      phaseRef.current = 'stopped';
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  }, [spinning, winner]);
  
  if (wheelItems.length === 0) return null;
  
  return (
     <div className="relative w-full max-w-xl mx-auto">
       {/* Decorative Frame */}
       <div className={`relative rounded-2xl p-[2px] transition-all duration-700 ${isGrandPrize 
         ? 'bg-gradient-to-b from-yellow-400 via-yellow-600 to-yellow-400 shadow-[0_0_60px_rgba(255,215,0,0.35)]' 
         : 'bg-gradient-to-b from-brand-primary/60 via-brand-primary/20 to-brand-primary/60'}`}>
         
         {/* Corner ornaments */}
         <div className={`absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full z-30 ${isGrandPrize ? 'bg-yellow-400 shadow-[0_0_12px_rgba(255,215,0,0.8)]' : 'bg-brand-primary shadow-[0_0_8px_rgba(212,168,83,0.6)]'}`} />
         <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full z-30 ${isGrandPrize ? 'bg-yellow-400 shadow-[0_0_12px_rgba(255,215,0,0.8)]' : 'bg-brand-primary shadow-[0_0_8px_rgba(212,168,83,0.6)]'}`} />
         <div className={`absolute -bottom-1.5 -left-1.5 w-4 h-4 rounded-full z-30 ${isGrandPrize ? 'bg-yellow-400 shadow-[0_0_12px_rgba(255,215,0,0.8)]' : 'bg-brand-primary shadow-[0_0_8px_rgba(212,168,83,0.6)]'}`} />
         <div className={`absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full z-30 ${isGrandPrize ? 'bg-yellow-400 shadow-[0_0_12px_rgba(255,215,0,0.8)]' : 'bg-brand-primary shadow-[0_0_8px_rgba(212,168,83,0.6)]'}`} />

         {/* Inner container */}
         <div 
           className={`relative h-[320px] flex items-center justify-center overflow-hidden rounded-2xl bg-black/80 transition-all duration-1000 ${isGrandPrize ? 'scale-[1.02]' : ''}`} 
           style={{ 
               perspective: '1200px',
               WebkitMaskImage: 'linear-gradient(to bottom, transparent 2%, black 15%, black 85%, transparent 98%)',
               maskImage: 'linear-gradient(to bottom, transparent 2%, black 15%, black 85%, transparent 98%)'
           }}
         >
           {/* Highlight Bar — center selection indicator */}
           <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[90px] border-y-[3px] z-20 transition-all duration-500 ${isGrandPrize 
             ? 'border-yellow-400/80 bg-yellow-400/10 shadow-[0_0_30px_rgba(255,215,0,0.3)]' 
             : 'border-brand-primary/50 bg-brand-primary/5 shadow-[0_0_15px_rgba(212,168,83,0.15)]'}`} />
           
           {/* Pointer arrows */}
           <div className={`absolute left-3 top-1/2 -translate-y-1/2 font-black z-30 text-2xl md:text-3xl tracking-tighter transition-all duration-300 ${isGrandPrize ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.9)] animate-pulse' : 'text-brand-primary drop-shadow-[0_0_6px_rgba(212,168,83,0.7)]'}`}>
             &gt;&gt;
           </div>
           <div className={`absolute right-3 top-1/2 -translate-y-1/2 font-black z-30 text-2xl md:text-3xl tracking-tighter transition-all duration-300 ${isGrandPrize ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.9)] animate-pulse' : 'text-brand-primary drop-shadow-[0_0_6px_rgba(212,168,83,0.7)]'}`}>
             &lt;&lt;
           </div>

           {/* 3D Cylinder */}
           <div 
             ref={containerRef}
             className="relative w-[80%] h-[80px]"
             style={{ transformStyle: 'preserve-3d', transform: `translateZ(${-radius}px)` }}
           >
             {wheelItems.map((item, i) => (
                <div
                   key={`${item.id}-${i}`}
                   className={`absolute left-0 top-0 w-full h-[80px] flex items-center justify-center rounded-xl overflow-hidden transition-colors duration-300 ${isGrandPrize 
                     ? 'bg-gradient-to-r from-black/80 via-black/60 to-black/80 border border-yellow-500/40' 
                     : 'bg-gradient-to-r from-black/70 via-black/50 to-black/70 border border-white/10'}`}
                   style={{
                      transform: `rotateX(${i * theta}deg) translateZ(${radius}px)`,
                      backfaceVisibility: 'hidden'
                   }}
                >
                   <div className="flex items-center justify-between w-full px-5 relative z-10">
                      <span className={`font-black text-3xl md:text-4xl tracking-wider ${isGrandPrize ? 'text-yellow-400 drop-shadow-[0_2px_8px_rgba(255,215,0,0.5)]' : 'text-brand-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'}`}>{item.queueNumber}</span>
                      <div className="flex flex-col items-end flex-1 ml-5 min-w-0">
                         <span className={`font-bold text-lg md:text-xl truncate w-full text-right ${isGrandPrize ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]' : 'text-brand-primarySoft'}`}>{item.name}</span>
                         <span className="text-xs md:text-sm text-white/40 font-mono truncate w-full text-right mt-0.5">{item.guestId || item.company || '-'}</span>
                      </div>
                   </div>
                </div>
             ))}
           </div>
         </div>
       </div>
     </div>
  );
}

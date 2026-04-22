'use client';
import React, { useEffect, useRef, useState } from 'react';

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
  const theta = 360 / N;
  const radius = Math.round((H / 2) / Math.tan(Math.PI / N));
  
  const [wheelItems, setWheelItems] = useState<Guest[]>([]);
  const winnerTargetIndex = 35;
  
  const initializedRef = useRef(false);
  const onStopRef = useRef(onStop);

  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);
  
  // Initialize wheel once
  useEffect(() => {
    if (candidates.length === 0 || initializedRef.current) return;
    initializedRef.current = true;
    
    const newItems: Guest[] = [];
    for (let i = 0; i < N; i++) {
        newItems.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
    setWheelItems(newItems);
  }, [candidates]);

  // Reshuffle on spin
  useEffect(() => {
      if (spinning && candidates.length > 0) {
          const newItems: Guest[] = [];
          for (let i = 0; i < N; i++) {
              newItems.push(candidates[Math.floor(Math.random() * candidates.length)]);
          }
          setWheelItems(newItems);
      }
  }, [spinning]);
  
  // Silent swap when winner arrives
  useEffect(() => {
      if (winner && wheelItems.length === N) {
          setWheelItems(prev => {
              const next = [...prev];
              next[winnerTargetIndex] = winner;
              
              if (candidates.length > 1) {
                  let fake = candidates[Math.floor(Math.random() * candidates.length)];
                  while (fake.id === winner.id) {
                      fake = candidates[Math.floor(Math.random() * candidates.length)];
                  }
                  next[winnerTargetIndex - 1] = fake;
              }
              
              return next;
          });
      }
  }, [winner, candidates, wheelItems.length]);

  const currentAngleRef = useRef(0);
  const velocityRef = useRef(0);
  const rafRef = useRef<number>(0);
  
  const phaseRef = useRef<'idle' | 'spinning' | 'spinning-delay' | 'decelerating' | 'fake-stop' | 'stopped'>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetAngleRef = useRef(0);
  
  useEffect(() => {
    if (spinning) {
      if (containerRef.current) {
         containerRef.current.style.transition = 'none';
      }
      phaseRef.current = 'spinning';
      velocityRef.current = 15;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      let lastTime = performance.now();
      
      const animate = (time: number) => {
        const dt = time - lastTime;
        lastTime = time;
        const frameDt = Math.min(dt, 32) / 16.66;
        
        if (phaseRef.current === 'spinning' || phaseRef.current === 'spinning-delay') {
           currentAngleRef.current -= velocityRef.current * frameDt;
        } else if (phaseRef.current === 'decelerating') {
           const current = currentAngleRef.current;
           const target = targetAngleRef.current;
           const dist = current - target;
           
           if (dist > 0) {
              velocityRef.current = Math.max(0.15, dist * 0.02);
              currentAngleRef.current -= velocityRef.current * frameDt;
              if (dist < 0.5) {
                 currentAngleRef.current = target;
                 phaseRef.current = 'stopped';
                 onStopRef.current();
              }
           } else {
              currentAngleRef.current = target;
              phaseRef.current = 'stopped';
              onStopRef.current();
           }
        } else if (phaseRef.current === 'fake-stop') {
           const current = currentAngleRef.current;
           const target = targetAngleRef.current;
           const dist = current - target;
           
           if (dist > 0) {
              velocityRef.current = Math.max(0.15, dist * 0.02);
              currentAngleRef.current -= velocityRef.current * frameDt;
              if (dist < 0.2) {
                 currentAngleRef.current = target;
                 phaseRef.current = 'idle'; 
                 
                 setTimeout(() => {
                     if (containerRef.current) {
                        containerRef.current.style.transition = 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
                        const realTarget = target - theta;
                        currentAngleRef.current = realTarget;
                        containerRef.current.style.transform = `translateZ(${-radius}px) rotateX(${realTarget}deg)`;
                     }
                     setTimeout(() => {
                        phaseRef.current = 'stopped';
                        onStopRef.current();
                     }, 1200);
                 }, 1500); 
              }
           } else {
              currentAngleRef.current = target;
              phaseRef.current = 'idle';
              setTimeout(() => {
                 if (containerRef.current) {
                    containerRef.current.style.transition = 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    const realTarget = target - theta;
                    currentAngleRef.current = realTarget;
                    containerRef.current.style.transform = `translateZ(${-radius}px) rotateX(${realTarget}deg)`;
                 }
                 setTimeout(() => {
                    phaseRef.current = 'stopped';
                    onStopRef.current();
                 }, 1200);
             }, 1500);
           }
        }
        
        if (containerRef.current && phaseRef.current !== 'idle' && phaseRef.current !== 'stopped') {
           containerRef.current.style.transform = `translateZ(${-radius}px) rotateX(${currentAngleRef.current}deg)`;
        }
        
        if (phaseRef.current !== 'stopped' && phaseRef.current !== 'idle') {
           rafRef.current = requestAnimationFrame(animate);
        }
      };
      
      rafRef.current = requestAnimationFrame(animate);
      
    } else {
      if (phaseRef.current === 'spinning') {
        phaseRef.current = 'spinning-delay';
        timeoutRef.current = setTimeout(() => {
           const current = currentAngleRef.current;
           const fullRotations = Math.floor(Math.abs(current) / 360) + 2; 
           const baseWinnerAngle = -(winnerTargetIndex * theta);
           
           if (isGrandPrize) {
              const fakeBaseAngle = -((winnerTargetIndex - 1) * theta);
              targetAngleRef.current = fakeBaseAngle - (fullRotations * 360);
              phaseRef.current = 'fake-stop';
           } else {
              targetAngleRef.current = baseWinnerAngle - (fullRotations * 360);
              phaseRef.current = 'decelerating';
           }
           
        }, stopDelay);
      }
    }
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [spinning, stopDelay, theta, isGrandPrize, radius]);
  
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
           {/* Highlight Bar — full width, minimal shadow */}
           <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[84px] border-y-[2px] z-20 transition-all duration-500 ${isGrandPrize 
             ? 'border-yellow-400/80 bg-yellow-400/10 shadow-[0_0_20px_rgba(255,215,0,0.25)]' 
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
             className="relative w-[80%] h-[80px] wheel-container"
             style={{ transformStyle: 'preserve-3d', transform: `translateZ(${-radius}px)` }}
           >
             {wheelItems.map((item, i) => (
                <div
                   key={`${item.id}-${i}`}
                   className={`absolute left-0 top-0 w-full h-[80px] wheel-item flex items-center justify-center rounded-xl overflow-hidden transition-colors duration-300 ${isGrandPrize 
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

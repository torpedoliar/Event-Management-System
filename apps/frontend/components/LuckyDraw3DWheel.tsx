import React, { useEffect, useRef, useState, useMemo } from 'react';

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
  
  const items = useMemo(() => {
    let arr = [...candidates];
    if (arr.length === 0) return arr;
    while (arr.length < 20) {
      arr = [...arr, ...candidates];
    }
    return arr;
  }, [candidates]);
  
  const N = items.length;
  const H = 80;
  const theta = N > 0 ? 360 / N : 0;
  const radius = N > 0 ? Math.round((H / 2) / Math.tan(Math.PI / N)) : 0;
  
  const currentAngleRef = useRef(0);
  const velocityRef = useRef(0);
  const rafRef = useRef<number>(0);
  
  const phaseRef = useRef<'idle' | 'spinning' | 'spinning-delay' | 'decelerating' | 'fake-stop' | 'snapping' | 'stopped'>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const winnerIndex = useMemo(() => {
    if (!winner || items.length === 0) return 0;
    const idx = items.findIndex(g => g.id === winner.id);
    return idx === -1 ? 0 : idx;
  }, [items, winner]);
  
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
              velocityRef.current = Math.max(0.2, dist * 0.03);
              currentAngleRef.current -= velocityRef.current * frameDt;
              if (dist < 0.5) {
                 currentAngleRef.current = target;
                 phaseRef.current = 'stopped';
                 onStop();
              }
           } else {
              currentAngleRef.current = target;
              phaseRef.current = 'stopped';
              onStop();
           }
        } else if (phaseRef.current === 'fake-stop') {
           const current = currentAngleRef.current;
           const target = targetAngleRef.current;
           const dist = current - target;
           
           if (dist > 0) {
              velocityRef.current = Math.max(0.2, dist * 0.03);
              currentAngleRef.current -= velocityRef.current * frameDt;
              if (dist < 0.5) {
                 currentAngleRef.current = target;
                 phaseRef.current = 'idle';
                 
                 setTimeout(() => {
                     if (containerRef.current) {
                        containerRef.current.style.transition = 'transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                        const realTarget = target - theta;
                        currentAngleRef.current = realTarget;
                        containerRef.current.style.transform = `translateZ(${-radius}px) rotateX(${realTarget}deg)`;
                     }
                     setTimeout(() => {
                        phaseRef.current = 'stopped';
                        onStop();
                     }, 1000);
                 }, 1500); 
              }
           } else {
              currentAngleRef.current = target;
              phaseRef.current = 'idle';
              setTimeout(() => {
                 if (containerRef.current) {
                    containerRef.current.style.transition = 'transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    const realTarget = target - theta;
                    currentAngleRef.current = realTarget;
                    containerRef.current.style.transform = `translateZ(${-radius}px) rotateX(${realTarget}deg)`;
                 }
                 setTimeout(() => {
                    phaseRef.current = 'stopped';
                    onStop();
                 }, 1000);
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
           const baseWinnerAngle = -(winnerIndex * theta);
           const fullRotations = Math.floor(Math.abs(current) / 360) + 2; 
           
           if (isGrandPrize) {
              const fakeBaseAngle = baseWinnerAngle + theta;
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
  }, [spinning, stopDelay, winnerIndex, theta, isGrandPrize, onStop, radius]);
  
  if (items.length === 0) return null;
  
  return (
     <div className="relative w-full max-w-sm mx-auto h-[240px] flex items-center justify-center overflow-hidden" style={{ perspective: '1000px' }}>
       <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none z-10" />
       
       <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[80px] border-y-2 border-brand-primary/50 shadow-[0_0_20px_rgba(212,168,83,0.5)] bg-brand-primary/10 z-0" />
       
       <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary font-bold z-20 text-xl drop-shadow-[0_0_5px_rgba(212,168,83,0.8)]">
         &gt;&gt;&gt;
       </div>
       <div className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-primary font-bold z-20 text-xl drop-shadow-[0_0_5px_rgba(212,168,83,0.8)]">
         &lt;&lt;&lt;
       </div>

       <div 
         ref={containerRef}
         className="relative w-[80%] h-[80px] wheel-container"
         style={{ transformStyle: 'preserve-3d', transform: `translateZ(${-radius}px)` }}
       >
         {items.map((item, i) => (
            <div
               key={`${item.id}-${i}`}
               className="absolute left-0 top-0 w-full h-[80px] wheel-item flex items-center justify-center bg-black/40 backdrop-blur-md border border-brand-primary/50 text-white rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden"
               style={{
                  transform: `rotateX(${i * theta}deg) translateZ(${radius}px)`,
                  backfaceVisibility: 'hidden'
               }}
            >
               <div className="flex items-center justify-between w-full px-4">
                  <span className="font-bold text-brand-primary text-2xl">{item.queueNumber}</span>
                  <div className="flex flex-col items-end flex-1 ml-4 min-w-0">
                     <span className="font-bold truncate w-full text-right">{item.name}</span>
                     <span className="text-xs text-white/50 font-mono truncate w-full text-right">{item.guestId || item.company || '-'}</span>
                  </div>
               </div>
            </div>
         ))}
       </div>
     </div>
  );
}

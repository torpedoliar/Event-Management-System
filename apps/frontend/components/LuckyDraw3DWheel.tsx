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
  
  // Create a fixed wheel of 40 items.
  const N = 40;
  const H = 110; // Geometry height per item (80px visible + 30px gap for more breathing room)
  const theta = 360 / N;
  const radius = Math.round((H / 2) / Math.tan(Math.PI / N));
  
  // Stable array of 40 items for the cylinder
  const [wheelItems, setWheelItems] = useState<Guest[]>([]);
  const winnerTargetIndex = 35; // We always land exactly at index 35
  
  const initializedRef = useRef(false);
  const onStopRef = useRef(onStop);

  // Keep onStop ref updated without triggering re-renders
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

  // Reshuffle wheel when spinning starts to keep it fresh
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
              
              // Ensure index 34 (the fake stop) is not the actual winner
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
      velocityRef.current = 15; // deg per frame
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
           const target = targetAngleRef.current; // Fake target
           const dist = current - target;
           
           if (dist > 0) {
              velocityRef.current = Math.max(0.15, dist * 0.02);
              currentAngleRef.current -= velocityRef.current * frameDt;
              if (dist < 0.2) {
                 currentAngleRef.current = target;
                 phaseRef.current = 'idle'; 
                 
                 // Snap effect
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
    
    // We intentionally omit `onStop` and `candidates` from the dependency array 
    // because `onStopRef` and `initializedRef` handle them safely without restarting the effect.
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [spinning, stopDelay, theta, isGrandPrize, radius]); // ONLY DEPEND ON CRITICAL PARAMS
  
  if (wheelItems.length === 0) return null;
  
  return (
     <div 
        className={`relative w-full max-w-xl mx-auto h-[360px] flex items-center justify-center transition-all duration-1000 ${isGrandPrize ? 'scale-110 drop-shadow-[0_0_50px_rgba(255,215,0,0.4)]' : ''}`} 
        style={{ 
            perspective: '1200px',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
        }}
     >
       {/* Elegant Highlight Bar */}
       <div className={`absolute left-[-2%] right-[-2%] top-1/2 -translate-y-1/2 h-[86px] border-y-[2px] z-0 transition-all duration-500 rounded-2xl ${isGrandPrize ? 'border-yellow-400 bg-yellow-400/10 shadow-[inset_0_0_40px_rgba(255,215,0,0.3)]' : 'border-brand-primary/60 bg-brand-primary/5 shadow-[inset_0_0_30px_rgba(212,168,83,0.2)]'}`} />
       
       <div className={`absolute left-0 md:left-4 top-1/2 -translate-y-1/2 font-black z-20 text-2xl md:text-3xl tracking-tighter transition-all duration-300 ${isGrandPrize ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,1)] scale-110' : 'text-brand-primary drop-shadow-[0_0_8px_rgba(212,168,83,0.8)]'}`}>
         &gt;&gt;
       </div>
       <div className={`absolute right-0 md:right-4 top-1/2 -translate-y-1/2 font-black z-20 text-2xl md:text-3xl tracking-tighter transition-all duration-300 ${isGrandPrize ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,1)] scale-110' : 'text-brand-primary drop-shadow-[0_0_8px_rgba(212,168,83,0.8)]'}`}>
         &lt;&lt;
       </div>

       <div 
         ref={containerRef}
         className="relative w-[85%] h-[80px] wheel-container"
         style={{ transformStyle: 'preserve-3d', transform: `translateZ(${-radius}px)` }}
       >
         {wheelItems.map((item, i) => (
            <div
               key={`${item.id}-${i}`}
               className={`absolute left-0 top-0 w-full h-[80px] wheel-item flex items-center justify-center backdrop-blur-md rounded-xl overflow-hidden transition-all duration-300 ${isGrandPrize ? 'bg-black/70 border border-yellow-500/70 shadow-[inset_0_0_20px_rgba(255,215,0,0.4)]' : 'bg-black/50 border border-white/10 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]'}`}
               style={{
                  transform: `rotateX(${i * theta}deg) translateZ(${radius}px)`,
                  backfaceVisibility: 'hidden'
               }}
            >
               {isGrandPrize && <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-transparent to-yellow-500/20" />}

               <div className="flex items-center justify-between w-full px-6 relative z-10">
                  <span className={`font-black text-3xl md:text-4xl tracking-wider drop-shadow-lg ${isGrandPrize ? 'text-yellow-400' : 'text-white'}`}>{item.queueNumber}</span>
                  <div className="flex flex-col items-end flex-1 ml-6 min-w-0">
                     <span className={`font-bold text-lg md:text-xl truncate w-full text-right drop-shadow-md ${isGrandPrize ? 'text-white' : 'text-brand-primarySoft'}`}>{item.name}</span>
                     <span className="text-xs md:text-sm text-white/50 font-mono truncate w-full text-right mt-1">{item.guestId || item.company || '-'}</span>
                  </div>
               </div>
            </div>
         ))}
       </div>
     </div>
  );
}

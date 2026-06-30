"use client";

import React, { useState, useEffect } from "react";

interface MatchTimerProps {
  startTime: string | Date;
}

export function MatchTimer({ startTime }: MatchTimerProps) {
  const [elapsed, setElapsed] = useState<string>("00:00");

  useEffect(() => {
    const start = new Date(startTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, now - start);
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="font-mono font-bold">{elapsed}</span>;
}

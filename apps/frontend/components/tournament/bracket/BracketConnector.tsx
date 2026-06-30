"use client";

import React from "react";

interface BracketConnectorProps {
  matchIndex: number;
  matchesInRound: number;
  containerHeight: number;
}

export function BracketConnector({
  matchIndex,
  matchesInRound,
  containerHeight,
}: BracketConnectorProps) {
  const isTopMatch = matchIndex % 2 === 0;
  // containerHeight / (2 * matchesInRound) is exactly half the distance between two matches
  const halfGapHeight = containerHeight / (2 * matchesInRound);

  return (
    <div
      className="absolute border-brand-border pointer-events-none z-0"
      style={{
        width: "16px", // 1rem (half of gap-8 (2rem))
        height: `${halfGapHeight + 2}px`, // +2px for border overlap
        right: "-16px", // extending into the gap
        top: isTopMatch ? "50%" : "auto",
        bottom: !isTopMatch ? "50%" : "auto",
        borderTop: isTopMatch ? "2px solid" : "none",
        borderBottom: !isTopMatch ? "2px solid" : "none",
        borderRight: "2px solid",
      }}
    />
  );
}

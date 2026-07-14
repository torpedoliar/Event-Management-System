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
  const halfGapHeight = containerHeight / (2 * matchesInRound);

  // SVG dimensions
  const svgWidth = 32;
  const svgHeight = halfGapHeight + 4;

  // Path: horizontal line from left, then vertical line to center
  const pathD = isTopMatch
    ? `M 0 ${svgHeight} L 0 0 L ${svgWidth} 0`
    : `M 0 0 L 0 ${svgHeight} L ${svgWidth} ${svgHeight}`;

  return (
    <div
      className="absolute pointer-events-none z-0"
      style={{
        width: `${svgWidth}px`,
        height: `${svgHeight + 2}px`,
        right: `-${svgWidth}px`,
        top: isTopMatch ? "50%" : "auto",
        bottom: !isTopMatch ? "50%" : "auto",
      }}
    >
      <svg
        width={svgWidth}
        height={svgHeight + 2}
        viewBox={`0 0 ${svgWidth} ${svgHeight + 2}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`connector-grad-${matchIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(212,168,83,0.3)" />
          </linearGradient>
        </defs>
        <path
          d={pathD}
          stroke={`url(#connector-grad-${matchIndex})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300"
          style={{
            strokeDasharray: 100,
            strokeDashoffset: 100,
            animation: 'connectorDraw 0.6s ease-out forwards',
          }}
        />
        {/* Subtle glow dot at the junction */}
        <circle
          cx={svgWidth}
          cy={isTopMatch ? 0 : svgHeight}
          r="2"
          fill="rgba(212,168,83,0.4)"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </svg>
    </div>
  );
}

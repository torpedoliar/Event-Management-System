"use client";

import React from 'react';

interface BracketConnectorProps {
  matchIndex: number;
  matchesInRound: number;
  nextMatchesInRound: number;
  isDarkMode?: boolean;
}

export function BracketConnector({
  matchIndex,
  matchesInRound,
  nextMatchesInRound,
  isDarkMode = false,
}: BracketConnectorProps) {
  // Calculate connector positioning based on match position
  // Each pair of matches in current round feeds into one match in next round

  // Match height unit (match box + connector space)
  const matchHeight = 120; // Match box height
  const connectorHeight = 40; // Gap between matches

  // Calculate Y positions
  const currentMatchY = matchIndex * (matchHeight + connectorHeight) + matchHeight / 2;
  const nextMatchIndex = Math.floor(matchIndex / 2);
  const nextMatchY = nextMatchIndex * (matchHeight + connectorHeight) + matchHeight / 2;

  // Connector color
  const strokeColor = isDarkMode ? '#6B7280' : '#D1D5DB';

  // SVG dimensions
  const width = 40;
  const height = matchHeight + connectorHeight;

  // Calculate connector path
  // Horizontal line from current match to connector point
  // Vertical line connecting to next match
  const horizontalLineX = 0;
  const connectorX = width - 10;
  const horizontalLineY = currentMatchY;
  const verticalLineTop = Math.min(currentMatchY, nextMatchY);
  const verticalLineBottom = Math.max(currentMatchY, nextMatchY);
  const verticalLineX = connectorX;
  const horizontalLineEndX = connectorX;

  // If this is the first match in a pair (index % 2 === 0), draw connector going down
  // If this is the second match in a pair (index % 2 === 1), draw connector going up
  const isTopMatch = matchIndex % 2 === 0;

  return (
    <svg
      className="absolute -left-10 pointer-events-none"
      width={width}
      height={height}
      style={{ top: 0 }}
    >
      {/* Horizontal connector from match box */}
      <line
        x1={horizontalLineX}
        y1={horizontalLineY}
        x2={horizontalLineEndX}
        y2={horizontalLineY}
        stroke={strokeColor}
        strokeWidth={2}
      />

      {/* Vertical connector line */}
      {isTopMatch && (
        <line
          x1={verticalLineX}
          y1={horizontalLineY}
          x2={verticalLineX}
          y2={verticalLineBottom}
          stroke={strokeColor}
          strokeWidth={2}
        />
      )}

      {/* Arrow head at the end (connecting to next match) */}
      <circle
        cx={connectorX}
        cy={nextMatchY}
        r={4}
        fill={strokeColor}
      />
    </svg>
  );
}

/**
 * Alternative simplified connector using CSS
 */
export function BracketConnectorCSS({
  matchIndex,
  matchesInRound,
  nextMatchesInRound,
  isDarkMode = false,
}: BracketConnectorProps) {
  const isTopMatch = matchIndex % 2 === 0;

  return (
    <div
      className={`
        absolute -left-8 w-8
        ${isDarkMode ? 'text-gray-500' : 'text-gray-300'}
      `}
      style={{
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      {/* Horizontal line */}
      <div
        className="h-0.5 w-6"
        style={{
          backgroundColor: isDarkMode ? '#6B7280' : '#D1D5DB',
        }}
      />

      {/* Vertical line (only for top matches in a pair) */}
      {isTopMatch && (
        <div
          className="absolute w-0.5"
          style={{
            height: '80px',
            top: '60px',
            right: '8px',
            backgroundColor: isDarkMode ? '#6B7280' : '#D1D5DB',
          }}
        />
      )}
    </div>
  );
}

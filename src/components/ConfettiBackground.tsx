'use client';
import React from 'react';

const PIECES = [
  { color: '#C9A84C', left: '5%',  delay: '0s',   duration: '8s',  size: 6 },
  { color: '#E74C3C', left: '15%', delay: '1.2s',  duration: '11s', size: 4 },
  { color: '#3498DB', left: '25%', delay: '2.5s',  duration: '9s',  size: 8 },
  { color: '#C9A84C', left: '35%', delay: '0.8s',  duration: '7s',  size: 5 },
  { color: '#2ECC71', left: '45%', delay: '3.1s',  duration: '12s', size: 6 },
  { color: '#E74C3C', left: '55%', delay: '1.7s',  duration: '10s', size: 4 },
  { color: '#C9A84C', left: '65%', delay: '4.0s',  duration: '8s',  size: 7 },
  { color: '#9B59B6', left: '75%', delay: '2.2s',  duration: '11s', size: 5 },
  { color: '#C9A84C', left: '85%', delay: '0.5s',  duration: '9s',  size: 6 },
  { color: '#3498DB', left: '92%', delay: '3.8s',  duration: '7s',  size: 4 },
];

export default function ConfettiBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {PIECES.map((p, i) => (
        <div
          key={i}
          className="confetti-piece absolute bottom-0"
          style={{
            backgroundColor: p.color,
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

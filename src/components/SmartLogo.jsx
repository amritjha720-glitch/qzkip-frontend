import React from 'react';

const SmartLogo = ({ size = 28, color = "#ffffff" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* MASK: This punches a perfect circular hole in the center */}
        <mask id="q-hole">
          <rect width="100" height="100" fill="white" />
          <circle cx="50" cy="50" r="19" fill="black" />
        </mask>
      </defs>

      {/* MAIN SHAPE: A perfect combination of the circle and the tail */}
      <g mask="url(#q-hole)">
        {/* Main Thick Round Body */}
        <circle cx="50" cy="50" r="38" fill={color} />
        
        {/* Flat Bottom & Sharp Diagonal Tail (Wedge) */}
        <polygon points="50,88 88,88 50,50" fill={color} />
      </g>
    </svg>
  );
};

export default SmartLogo;
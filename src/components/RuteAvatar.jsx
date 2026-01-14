import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function RuteAvatar({ size = 'md' }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // Placeholder SVG caricature of a pitbull - will be replaced with AI generated
        const svgImage = `
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <!-- Head -->
            <ellipse cx="100" cy="100" rx="70" ry="75" fill="#8B4513" stroke="#654321" stroke-width="2"/>
            
            <!-- Ears -->
            <ellipse cx="65" cy="45" rx="18" ry="30" fill="#654321" stroke="#654321" stroke-width="1"/>
            <ellipse cx="135" cy="45" rx="18" ry="30" fill="#654321" stroke="#654321" stroke-width="1"/>
            <ellipse cx="65" cy="50" rx="10" ry="18" fill="#A0522D"/>
            <ellipse cx="135" cy="50" rx="10" ry="18" fill="#A0522D"/>
            
            <!-- Snout -->
            <ellipse cx="100" cy="120" rx="40" ry="35" fill="#A0522D" stroke="#654321" stroke-width="2"/>
            
            <!-- Nose -->
            <ellipse cx="100" cy="115" rx="12" ry="10" fill="#2C1810" stroke="#000" stroke-width="1"/>
            
            <!-- Mouth -->
            <path d="M 100 125 Q 95 135 85 133" stroke="#000" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M 100 125 Q 105 135 115 133" stroke="#000" stroke-width="2" fill="none" stroke-linecap="round"/>
            
            <!-- Eyes -->
            <circle cx="80" cy="85" r="8" fill="#000"/>
            <circle cx="120" cy="85" r="8" fill="#000"/>
            <circle cx="82" cy="82" r="3" fill="#fff"/>
            <circle cx="122" cy="82" r="3" fill="#fff"/>
            
            <!-- Tongue -->
            <ellipse cx="100" cy="145" rx="8" ry="6" fill="#FF69B4"/>
            
            <!-- Spots/Markings -->
            <circle cx="75" cy="95" r="5" fill="#654321" opacity="0.7"/>
            <circle cx="125" cy="100" r="4" fill="#654321" opacity="0.7"/>
          </svg>
        `;
        
        const blob = new Blob([svgImage], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        setLoading(false);
      } catch (error) {
        console.error('Error loading Rute avatar:', error);
        setLoading(false);
      }
    };

    loadImage();
  }, []);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-20 h-20',
    lg: 'w-16 h-16'
  };

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center`}>
        <Loader2 className="w-1/2 h-1/2 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center`}>
        <span className="text-lg font-bold text-amber-700">R</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center overflow-hidden`}>
      <img 
        src={imageUrl} 
        alt="Rute" 
        className="w-full h-full object-cover"
      />
    </div>
  );
}
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'gold' | 'green' | 'red' | 'blue' | 'purple' | 'gray';
}

export default function Badge({ children, className = '', variant = 'gray' }: BadgeProps) {
  const baseStyles = "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border flex items-center justify-center";

  const variants = {
    gold: "bg-[#C9A84C15] text-[#C9A84C] border-[#C9A84C30]",
    green: "bg-[#2ECC7115] text-[#2ECC71] border-[#2ECC7130]",
    red: "bg-[#E74C3C15] text-[#E74C3C] border-[#E74C3C30]",
    blue: "bg-[#3498DB15] text-[#3498DB] border-[#3498DB30]",
    purple: "bg-[#9B59B615] text-[#9B59B6] border-[#9B59B630]",
    gray: "bg-[#1E2D50] text-[#8A9BB8] border-[#2A3F6B]",
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-xl bg-white shadow-card ${className}`}>
      {children}
    </div>
  );
}
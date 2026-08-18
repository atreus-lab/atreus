import { type ReactNode } from "react";

interface SubheadingProps {
  children: ReactNode;
  className?: string;
}

export default function Subheading({ children, className = "" }: SubheadingProps) {
  return (
    <p className={`text-sm font-normal leading-normal text-grey-700 ${className}`}>
      {children}
    </p>
  );
}
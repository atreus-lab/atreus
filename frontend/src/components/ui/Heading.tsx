import { type ReactNode } from "react";

interface HeadingProps {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "text-lg",
  md: "text-[22px]",
  lg: "text-[28px]",
  xl: "text-[30px] mobile:text-[42px] sm:text-[48px] md:text-[60px]",
};

export default function Heading({ children, size = "lg", className = "" }: HeadingProps) {
  return (
    <h1 className={`font-bold tracking-[-0.02em] text-neutral-primary ${sizes[size]} ${className}`}>
      {children}
    </h1>
  );
}
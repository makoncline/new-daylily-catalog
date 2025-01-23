"use client";

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MainContent({ children, className = "" }: MainContentProps) {
  return <div className={`flex-1 space-y-4 p-8 ${className}`}>{children}</div>;
}

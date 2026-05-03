import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "default" && "border-transparent bg-terracotta text-white shadow-sm",
        variant === "secondary" && "border-transparent bg-linen text-ink",
        variant === "destructive" && "border-transparent bg-red-500 text-white shadow-sm",
        variant === "outline" && "text-ink",
        className
      )}
      {...props}
    />
  );
}

export { Badge };

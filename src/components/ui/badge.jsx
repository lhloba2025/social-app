import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50",
  {
    variants: {
      variant: {
        default:
          "border-purple-500/30 bg-purple-600/20 text-purple-300 shadow-lg shadow-purple-500/10 hover:bg-purple-600/30",
        secondary:
          "border-slate-500/30 bg-slate-600/20 text-slate-300 hover:bg-slate-600/30",
        destructive:
          "border-red-500/30 bg-red-600/20 text-red-300 shadow-lg shadow-red-500/10 hover:bg-red-600/30",
        outline: "text-white border-white/20 hover:bg-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
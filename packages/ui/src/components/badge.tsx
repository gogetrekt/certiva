import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[0.6875rem] font-medium leading-none tracking-wide",
  {
    variants: {
      variant: {
        default: "border-zinc-700 bg-zinc-800 text-zinc-300",
        accent:  "border-zinc-600 bg-zinc-700/60 text-zinc-200",
        muted:   "border-zinc-800 bg-zinc-900 text-zinc-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };

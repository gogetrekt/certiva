import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-medium tracking-[-0.01em] transition-[background-color,border-color,color,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 active:opacity-90 select-none",
  {
    variants: {
      variant: {
        primary:
          "border-zinc-200/10 bg-white text-zinc-950 hover:bg-zinc-100 disabled:bg-zinc-200",
        secondary:
          "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100 disabled:border-zinc-800 disabled:text-zinc-600",
        ghost:
          "border-transparent bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:text-zinc-600",
        danger:
          "border-red-900/50 bg-red-950/30 text-red-400 hover:border-red-800/70 hover:bg-red-950/50 hover:text-red-300 disabled:opacity-40",
      },
      size: {
        sm: "min-h-7 px-2.5 text-xs",
        md: "min-h-8 px-3.5",
        lg: "min-h-10 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };

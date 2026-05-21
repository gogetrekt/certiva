import * as React from "react";

import { cn } from "../lib/utils";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-xs font-medium text-zinc-400 uppercase tracking-[0.08em]", className)}
      {...props}
    />
  ),
);

Label.displayName = "Label";

export { Label };

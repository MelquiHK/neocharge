import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-2 text-base text-slate-800 shadow-inner outline-none backdrop-blur transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus-visible:ring-4 focus-visible:ring-brand-400/25 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

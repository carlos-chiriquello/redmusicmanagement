import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-[#e28b95]/40 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#c72137] focus:ring-[#c72137]/20 focus:outline-none focus:ring-2 transition-shadow disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/modules/academy/components/ui/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-academy-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-academy-primary text-academy-primary-foreground shadow hover:bg-academy-primary/80",
        secondary:
          "border-transparent bg-academy-secondary text-academy-secondary-foreground hover:bg-academy-secondary/80",
        destructive:
          "border-transparent bg-academy-destructive text-academy-destructive-foreground shadow hover:bg-academy-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

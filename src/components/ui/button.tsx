import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/utils/cn"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"

        const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold font-[var(--font-body)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pd-sky/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 cursor-pointer"

        const variantClasses = {
            default: "bg-pd-red text-white hover:bg-pd-red/85",
            destructive: "bg-pd-red text-white hover:bg-pd-red/80",
            outline: "bg-pd-surface-alt text-pd-text hover:bg-pd-surface-alt/80",
            secondary: "bg-pd-green text-white hover:bg-pd-green/85",
            ghost: "text-pd-text-muted hover:bg-pd-surface-alt hover:text-pd-text",
            link: "text-pd-red underline-offset-4 hover:underline",
        }

        const sizeClasses = {
            default: "h-12 px-6 py-2",
            sm: "h-9 rounded-lg px-3",
            lg: "h-14 rounded-2xl px-8 text-base",
            icon: "h-12 w-12",
        }

        return (
            <Comp
                className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }

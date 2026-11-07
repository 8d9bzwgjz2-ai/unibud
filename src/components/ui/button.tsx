import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-opacity duration-150 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:opacity-90",
        bud: "bg-bud text-bud-foreground hover:opacity-90",
        ghost: "bg-transparent text-foreground hover:bg-secondary",
        outline: "border border-border bg-card text-foreground hover:bg-secondary",
        danger: "bg-destructive text-destructive-foreground hover:opacity-90",
        secondary: "bg-secondary text-foreground hover:opacity-90",
      },
      size: {
        sm: "h-9 rounded-full px-3 text-sm",
        md: "h-11 rounded-full px-4 text-sm",
        lg: "h-12 rounded-full px-5 text-base",
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

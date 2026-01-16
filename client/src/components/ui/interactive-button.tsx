import { ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useMicroInteractions, WithMicroInteractions } from "@/hooks/use-micro-interactions";

const interactiveButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
        nvidia: "bg-[rgb(118,185,0)] text-white hover:bg-[rgb(118,185,0)]/90",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface InteractiveButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof interactiveButtonVariants>,
    WithMicroInteractions {}

/**
 * Enhanced button component with integrated micro-interactions
 */
const InteractiveButton = forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ className, variant, size, microInteractions, onClick, onMouseMove, ...props }, ref) => {
    // Set default micro-interactions based on variant
    const defaultInteractions = {
      onRipple: true,
      ...(variant === 'nvidia' ? {
        onHoverGlow: true,
        glowColor: 'rgba(118, 185, 0, 0.6)',
        glowIntensity: 4,
      } : {}),
      ...(variant === 'ghost' ? {
        onHoverSlide: true,
        slideDirection: 'left' as const,
        slideBgColor: 'rgba(144, 144, 144, 0.1)',
      } : {}),
      ...(variant === 'outline' ? {
        onHoverShimmer: true,
        shimmerColor: 'rgba(144, 144, 144, 0.2)',
      } : {}),
      ...(variant === 'link' ? {
        onHoverTextEffect: true,
        textHoverColor: 'rgb(118, 185, 0)',
      } : {}),
      ...microInteractions
    };
    
    // Initialize micro-interactions
    const {
      ref: microRef,
      handleClick,
      handleMouseMove,
    } = useMicroInteractions(defaultInteractions);
    
    // Combine event handlers
    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      handleClick(e);
      if (onClick) onClick(e);
    };
    
    const handleButtonMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      handleMouseMove(e);
      if (onMouseMove) onMouseMove(e);
    };
    
    return (
      <button
        ref={(el) => {
          // Handle both the forwarded ref and the micro-interactions ref
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
          microRef.current = el;
        }}
        className={cn(interactiveButtonVariants({ variant, size, className }))}
        onClick={handleButtonClick}
        onMouseMove={handleButtonMouseMove}
        {...props}
      />
    );
  }
);

InteractiveButton.displayName = "InteractiveButton";

export { InteractiveButton, interactiveButtonVariants };
import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useMicroInteractions, WithMicroInteractions } from '@/hooks/use-micro-interactions';

const interactiveCardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-border',
        nvidia: 'border-[rgb(118,185,0)] border-2',
        highlight: 'border-primary border-2',
        ghost: 'border-transparent shadow-none',
        raised: 'shadow-md hover:shadow-lg',
        interactive: 'cursor-pointer hover:shadow-md transition-shadow'
      },
      padding: {
        default: 'p-6',
        sm: 'p-4',
        lg: 'p-8',
        none: 'p-0'
      }
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default'
    }
  }
);

export interface InteractiveCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof interactiveCardVariants>,
    WithMicroInteractions {}

/**
 * Enhanced card component with integrated micro-interactions
 */
const InteractiveCard = forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ className, variant, padding, microInteractions, onClick, onMouseMove, ...props }, ref) => {
    // Set default micro-interactions based on variant
    const defaultInteractions = {
      ...(variant === 'nvidia' ? {
        onHoverGlow: true,
        glowColor: 'rgba(118, 185, 0, 0.4)',
        glowIntensity: 3,
      } : {}),
      ...(variant === 'highlight' ? {
        onHoverGlow: true,
        glowColor: 'rgba(var(--primary), 0.4)',
        glowIntensity: 3,
      } : {}),
      ...(variant === 'ghost' ? {
        onHoverSlide: true,
        slideDirection: 'bottom' as const,
        slideBgColor: 'rgba(144, 144, 144, 0.05)',
      } : {}),
      ...(variant === 'raised' ? {
        onHoverGlow: true,
        glowColor: 'rgba(118, 185, 0, 0.3)',
        glowIntensity: 3,
      } : {}),
      ...(variant === 'interactive' ? {
        onRipple: true,
        onHoverShimmer: true,
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
    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      handleClick(e);
      if (onClick) onClick(e);
    };
    
    const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      handleMouseMove(e);
      if (onMouseMove) onMouseMove(e);
    };
    
    return (
      <div
        ref={(el) => {
          // Handle both the forwarded ref and the micro-interactions ref
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
          microRef.current = el;
        }}
        className={cn(interactiveCardVariants({ variant, padding, className }))}
        onClick={handleCardClick}
        onMouseMove={handleCardMouseMove}
        {...props}
      />
    );
  }
);

InteractiveCard.displayName = 'InteractiveCard';

export { InteractiveCard, interactiveCardVariants };
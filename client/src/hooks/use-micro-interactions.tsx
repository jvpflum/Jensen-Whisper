import { useEffect, useRef } from 'react';
import {
  MicroInteractionProps,
  applyGlowHoverEffect,
  applyShimmerEffect,
  applySlideBackgroundEffect,
  applyTextHoverEffect,
  createRippleEffect,
  pulseElement,
  tiltEffect
} from '@/lib/micro-interactions';

/**
 * Hook to apply micro-interactions to a React component
 * @param options - Configuration options for micro-interactions
 * @returns - An object with refs and event handlers
 */
export function useMicroInteractions(options: MicroInteractionProps = {}) {
  const elementRef = useRef<HTMLElement | null>(null);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);
  
  // Clean up any existing micro-interactions before applying new ones
  const cleanupPreviousEffects = () => {
    cleanupFunctionsRef.current.forEach(cleanup => cleanup());
    cleanupFunctionsRef.current = [];
  };
  
  useEffect(() => {
    // Get the element from the ref
    const element = elementRef.current;
    if (!element) return;
    
    // Clean up previous effects
    cleanupPreviousEffects();
    
    // Apply hover glow effect if enabled
    if (options.onHoverGlow) {
      const cleanup = applyGlowHoverEffect(
        element, 
        options.glowColor, 
        options.glowIntensity
      );
      cleanupFunctionsRef.current.push(cleanup);
    }
    
    // Apply slide background effect if enabled
    if (options.onHoverSlide) {
      const cleanup = applySlideBackgroundEffect(
        element, 
        options.slideBgColor, 
        options.slideDirection
      );
      cleanupFunctionsRef.current.push(cleanup);
    }
    
    // Apply shimmer effect if enabled
    if (options.onHoverShimmer) {
      const cleanup = applyShimmerEffect(
        element, 
        options.shimmerColor
      );
      cleanupFunctionsRef.current.push(cleanup);
    }
    
    // Apply text hover effect if enabled
    if (options.onHoverTextEffect) {
      const cleanup = applyTextHoverEffect(
        element, 
        undefined, 
        options.textHoverColor
      );
      cleanupFunctionsRef.current.push(cleanup);
    }
    
    // Cleanup on unmount
    return () => {
      cleanupPreviousEffects();
    };
  }, [
    options.onHoverGlow, 
    options.onHoverSlide, 
    options.onHoverShimmer, 
    options.onHoverTextEffect,
    options.glowColor, 
    options.glowIntensity, 
    options.slideBgColor, 
    options.slideDirection,
    options.shimmerColor,
    options.textHoverColor
  ]);
  
  // Handle ripple effect on click
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (options.onRipple) {
      createRippleEffect(event, options.rippleColor);
    }
  };
  
  // Handle tilt effect on mouse move
  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    if (options.onHoverTilt) {
      tiltEffect(event, options.tiltIntensity);
    }
  };
  
  // Method to trigger pulse effect
  const pulse = () => {
    if (elementRef.current && options.onPulse) {
      pulseElement(elementRef.current, options.pulseColor);
    }
  };
  
  return {
    ref: elementRef,
    handleClick,
    handleMouseMove,
    pulse
  };
}

// Type for component that uses micro-interactions
export type WithMicroInteractions = {
  microInteractions?: MicroInteractionProps;
};
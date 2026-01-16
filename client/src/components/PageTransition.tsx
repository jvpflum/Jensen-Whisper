import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * A component that wraps page content and provides smooth transitions
 */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1.0] // Cubic bezier easing
      }}
      className={`w-full ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * A component that wraps sections/cards and provides a fade-in animation
 */
export function FadeInSection({ 
  children, 
  className = "",
  delay = 0,
  direction = "up"
}: PageTransitionProps & { delay?: number, direction?: "up" | "down" | "left" | "right" }) {
  // Set initial y or x value based on direction
  const getInitialOffset = () => {
    switch(direction) {
      case "up": return { y: 40, x: 0 };
      case "down": return { y: -40, x: 0 };
      case "left": return { y: 0, x: 40 };
      case "right": return { y: 0, x: -40 };
      default: return { y: 40, x: 0 };
    }
  };

  const initialOffset = getInitialOffset();

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: initialOffset.y,
        x: initialOffset.x
      }}
      animate={{ 
        opacity: 1, 
        y: 0,
        x: 0
      }}
      transition={{ 
        duration: 0.6,
        delay: delay,
        ease: [0.25, 0.1, 0.25, 1.0] // Cubic bezier easing
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * A component that provides a staggered animation for lists of items
 */
export function StaggeredList({ 
  children, 
  className = "",
  staggerDelay = 0.1
}: {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.4,
            delay: index * staggerDelay,
            ease: [0.25, 0.1, 0.25, 1.0]
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

export default PageTransition;
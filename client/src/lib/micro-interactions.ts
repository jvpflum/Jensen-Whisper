/**
 * Micro-interaction Design System
 * 
 * This library provides reusable micro-interactions for the UI.
 * These can be used to enhance user experience with subtle
 * animations, transitions, and feedback.
 */

/**
 * Creates a ripple effect on an element when clicked
 * @param event - The mouse event
 * @param color - The color of the ripple (default: NVIDIA green)
 */
export function createRippleEffect(event: React.MouseEvent<HTMLElement>, color = 'rgba(118, 185, 0, 0.4)') {
  const button = event.currentTarget;
  
  // Get the bounds of the element
  const rect = button.getBoundingClientRect();
  
  // Calculate the position relative to the element
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // Create the ripple element
  const ripple = document.createElement('span');
  ripple.style.position = 'absolute';
  ripple.style.top = `${y}px`;
  ripple.style.left = `${x}px`;
  ripple.style.width = '0';
  ripple.style.height = '0';
  ripple.style.borderRadius = '50%';
  ripple.style.backgroundColor = color;
  ripple.style.transform = 'translate(-50%, -50%)';
  ripple.style.animation = 'ripple-effect 0.6s linear';
  ripple.style.opacity = '0.4';
  ripple.style.pointerEvents = 'none';
  
  // Add the ripple to the element
  button.style.position = 'relative';
  button.style.overflow = 'hidden';
  button.appendChild(ripple);
  
  // Remove the ripple after animation completes
  setTimeout(() => {
    button.removeChild(ripple);
  }, 700);
}

/**
 * Show a microinteraction when a copy operation is performed
 * @param element - The DOM element to apply the effect to
 * @param message - Optional message to show
 */
export function showCopyFeedback(element: HTMLElement, message?: string) {
  // Store original classes to restore later
  const originalClasses = element.className;
  
  // Add the copy feedback class
  element.className += ' copy-feedback';
  
  // If a message is provided, show it as a tooltip
  if (message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'micro-tooltip';
    tooltip.textContent = message;
    tooltip.style.position = 'absolute';
    tooltip.style.top = '-30px';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.style.backgroundColor = '#333';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.3s ease';
    
    // Ensure the element has position relative for absolute positioning
    const originalPosition = element.style.position;
    if (element.style.position !== 'relative' && element.style.position !== 'absolute') {
      element.style.position = 'relative';
    }
    
    element.appendChild(tooltip);
    
    // Show the tooltip with a slight delay
    setTimeout(() => {
      tooltip.style.opacity = '1';
    }, 10);
    
    // Remove the tooltip after 2 seconds
    setTimeout(() => {
      tooltip.style.opacity = '0';
      setTimeout(() => {
        element.removeChild(tooltip);
        element.style.position = originalPosition;
      }, 300);
    }, 2000);
  }
  
  // Reset after animation completes
  setTimeout(() => {
    element.className = originalClasses;
  }, 700);
}

/**
 * Pulse effect to highlight an element
 * @param element - The DOM element to pulse
 * @param color - The color of the pulse (default: NVIDIA green)
 */
export function pulseElement(element: HTMLElement, color = 'rgba(118, 185, 0, 0.3)') {
  // Store original styles
  const originalBoxShadow = element.style.boxShadow;
  const originalTransition = element.style.transition;
  
  // Apply pulse effect
  element.style.transition = 'box-shadow 0.3s ease-in-out';
  element.style.boxShadow = `0 0 0 6px ${color}`;
  
  // Reset after animation
  setTimeout(() => {
    element.style.boxShadow = originalBoxShadow;
    
    // Restore original transition after effect completes
    setTimeout(() => {
      element.style.transition = originalTransition;
    }, 300);
  }, 700);
}

/**
 * Create a hover tilt effect for cards and buttons
 * @param event - Mouse event
 * @param intensity - The intensity of the tilt effect (1-10)
 */
export function tiltEffect(event: React.MouseEvent<HTMLElement>, intensity = 3) {
  const element = event.currentTarget;
  const rect = element.getBoundingClientRect();
  
  // Calculate position relative to center of element
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2;
  
  // Scale the tilt based on element size
  const tiltX = (y / rect.height) * intensity;
  const tiltY = -(x / rect.width) * intensity;
  
  // Apply the tilt effect
  element.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  
  // Reset function
  const resetTilt = () => {
    element.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    element.removeEventListener('mouseleave', resetTilt);
  };
  
  // Reset when mouse leaves
  element.addEventListener('mouseleave', resetTilt);
}

/**
 * Create a floating animation for elements
 * @param element - The DOM element to animate
 * @param amplitude - The amplitude of the floating effect in pixels
 */
export function startFloatingAnimation(element: HTMLElement, amplitude = 5) {
  // Store original transform to combine with floating
  const originalTransform = element.style.transform === '' ? '' : element.style.transform + ' ';
  
  // Generate a unique animation name for this instance
  const animationName = `float-${Math.random().toString(36).substring(2, 9)}`;
  
  // Create keyframes for floating animation
  const keyframes = `
    @keyframes ${animationName} {
      0% { transform: ${originalTransform}translateY(0); }
      50% { transform: ${originalTransform}translateY(-${amplitude}px); }
      100% { transform: ${originalTransform}translateY(0); }
    }
  `;
  
  // Add the keyframes to the document
  const styleElement = document.createElement('style');
  styleElement.appendChild(document.createTextNode(keyframes));
  document.head.appendChild(styleElement);
  
  // Apply the animation
  element.style.animation = `${animationName} 3s ease-in-out infinite`;
  
  // Return a function to stop the animation
  return () => {
    element.style.animation = '';
    document.head.removeChild(styleElement);
  };
}

/**
 * Apply a glow hover effect to an element
 * @param element - The DOM element to apply the effect to
 * @param color - The color of the glow (default: NVIDIA green)
 * @param intensity - The intensity of the glow (1-10)
 * @returns - Function to remove the effect
 */
export function applyGlowHoverEffect(element: HTMLElement, color = 'rgba(118, 185, 0, 0.7)', intensity = 5): () => void {
  // Store original styles
  const originalBoxShadow = element.style.boxShadow;
  const originalTransition = element.style.transition;
  
  // Set up the transition
  element.style.transition = 'box-shadow 0.3s ease, transform 0.2s ease';
  
  // Handler for mouseenter
  const handleMouseEnter = () => {
    element.style.boxShadow = `0 0 ${intensity * 2}px ${intensity / 2}px ${color}`;
    element.style.transform = 'scale(1.02)';
  };
  
  // Handler for mouseleave
  const handleMouseLeave = () => {
    element.style.boxShadow = originalBoxShadow;
    element.style.transform = '';
  };
  
  // Add event listeners
  element.addEventListener('mouseenter', handleMouseEnter);
  element.addEventListener('mouseleave', handleMouseLeave);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter);
    element.removeEventListener('mouseleave', handleMouseLeave);
    element.style.boxShadow = originalBoxShadow;
    element.style.transition = originalTransition;
    element.style.transform = '';
  };
}

/**
 * Apply a slide-in background effect on hover
 * @param element - The DOM element to apply the effect to
 * @param bgColor - The background color to slide in
 * @param direction - The direction from which the background slides in
 * @returns - Function to remove the effect
 */
export function applySlideBackgroundEffect(
  element: HTMLElement, 
  bgColor = 'rgba(118, 185, 0, 0.15)', 
  direction: 'left' | 'right' | 'top' | 'bottom' = 'left'
): () => void {
  // Store original styles
  const originalPosition = element.style.position;
  const originalOverflow = element.style.overflow;
  
  // Set up required CSS for the effect
  element.style.position = originalPosition === '' ? 'relative' : originalPosition;
  element.style.overflow = 'hidden';
  
  // Create the slide-in background element
  const bg = document.createElement('span');
  bg.style.position = 'absolute';
  bg.style.backgroundColor = bgColor;
  bg.style.transition = 'transform 0.3s ease';
  bg.style.zIndex = '-1';
  
  // Set initial position based on direction
  switch(direction) {
    case 'left':
      bg.style.top = '0';
      bg.style.left = '0';
      bg.style.width = '100%';
      bg.style.height = '100%';
      bg.style.transform = 'translateX(-100%)';
      break;
    case 'right':
      bg.style.top = '0';
      bg.style.right = '0';
      bg.style.width = '100%';
      bg.style.height = '100%';
      bg.style.transform = 'translateX(100%)';
      break;
    case 'top':
      bg.style.top = '0';
      bg.style.left = '0';
      bg.style.width = '100%';
      bg.style.height = '100%';
      bg.style.transform = 'translateY(-100%)';
      break;
    case 'bottom':
      bg.style.bottom = '0';
      bg.style.left = '0';
      bg.style.width = '100%';
      bg.style.height = '100%';
      bg.style.transform = 'translateY(100%)';
      break;
  }
  
  // Add the background element
  element.appendChild(bg);
  
  // Handler for mouseenter
  const handleMouseEnter = () => {
    bg.style.transform = 'translate(0)';
  };
  
  // Handler for mouseleave
  const handleMouseLeave = () => {
    switch(direction) {
      case 'left':
        bg.style.transform = 'translateX(-100%)';
        break;
      case 'right':
        bg.style.transform = 'translateX(100%)';
        break;
      case 'top':
        bg.style.transform = 'translateY(-100%)';
        break;
      case 'bottom':
        bg.style.transform = 'translateY(100%)';
        break;
    }
  };
  
  // Add event listeners
  element.addEventListener('mouseenter', handleMouseEnter);
  element.addEventListener('mouseleave', handleMouseLeave);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter);
    element.removeEventListener('mouseleave', handleMouseLeave);
    if (element.contains(bg)) {
      element.removeChild(bg);
    }
    element.style.position = originalPosition;
    element.style.overflow = originalOverflow;
  };
}

/**
 * Apply a shimmer hover effect to an element
 * @param element - The DOM element to apply the effect to
 * @param color - The color of the shimmer (default: NVIDIA green)
 * @returns - Function to remove the effect
 */
export function applyShimmerEffect(element: HTMLElement, color = 'rgba(118, 185, 0, 0.3)'): () => void {
  // Store original styles
  const originalPosition = element.style.position;
  const originalOverflow = element.style.overflow;
  
  // Create a unique animation name for this instance
  const animationName = `shimmer-${Math.random().toString(36).substring(2, 9)}`;
  
  // Create shimmer overlay
  const shimmer = document.createElement('div');
  shimmer.style.position = 'absolute';
  shimmer.style.top = '0';
  shimmer.style.left = '0';
  shimmer.style.width = '100%';
  shimmer.style.height = '100%';
  shimmer.style.background = `linear-gradient(90deg, transparent, ${color}, transparent)`;
  shimmer.style.opacity = '0';
  shimmer.style.transition = 'opacity 0.3s ease';
  shimmer.style.zIndex = '1';
  shimmer.style.pointerEvents = 'none';
  
  // Set up keyframes for shimmer effect
  const keyframes = `
    @keyframes ${animationName} {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `;
  
  // Add the keyframes to the document
  const styleElement = document.createElement('style');
  styleElement.appendChild(document.createTextNode(keyframes));
  document.head.appendChild(styleElement);
  
  // Set up required CSS for the element
  element.style.position = originalPosition === '' ? 'relative' : originalPosition;
  element.style.overflow = 'hidden';
  
  // Add the shimmer element
  element.appendChild(shimmer);
  
  // Handler for mouseenter
  const handleMouseEnter = () => {
    shimmer.style.opacity = '1';
    shimmer.style.animation = `${animationName} 1.5s linear infinite`;
  };
  
  // Handler for mouseleave
  const handleMouseLeave = () => {
    shimmer.style.opacity = '0';
    setTimeout(() => {
      shimmer.style.animation = 'none';
    }, 300);
  };
  
  // Add event listeners
  element.addEventListener('mouseenter', handleMouseEnter);
  element.addEventListener('mouseleave', handleMouseLeave);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter);
    element.removeEventListener('mouseleave', handleMouseLeave);
    if (element.contains(shimmer)) {
      element.removeChild(shimmer);
    }
    document.head.removeChild(styleElement);
    element.style.position = originalPosition;
    element.style.overflow = originalOverflow;
  };
}

/**
 * Apply a text hover effect that changes color gradually
 * @param element - The DOM element to apply the effect to
 * @param fromColor - The starting color (default: current text color)
 * @param toColor - The hover color (default: NVIDIA green)
 * @returns - Function to remove the effect
 */
export function applyTextHoverEffect(
  element: HTMLElement, 
  fromColor = '', 
  toColor = 'rgb(118, 185, 0)'
): () => void {
  // Store original styles
  const originalColor = element.style.color;
  const originalTransition = element.style.transition;
  
  // If no fromColor specified, use the computed color
  if (!fromColor) {
    fromColor = window.getComputedStyle(element).color;
  }
  
  // Set up the transition
  element.style.transition = originalTransition ? 
    `${originalTransition}, color 0.3s ease` : 
    'color 0.3s ease';
  
  // Handler for mouseenter
  const handleMouseEnter = () => {
    element.style.color = toColor;
  };
  
  // Handler for mouseleave
  const handleMouseLeave = () => {
    element.style.color = fromColor;
  };
  
  // Add event listeners
  element.addEventListener('mouseenter', handleMouseEnter);
  element.addEventListener('mouseleave', handleMouseLeave);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter);
    element.removeEventListener('mouseleave', handleMouseLeave);
    element.style.color = originalColor;
    element.style.transition = originalTransition;
  };
}

/**
 * Create animated particles background effect
 * @param container - The DOM element to add particles to
 * @param options - Customization options for the particles
 * @returns - Function to remove the effect
 */
export function createParticleBackground(
  container: HTMLElement,
  options: {
    particleColor?: string,
    particleCount?: number,
    minSize?: number,
    maxSize?: number,
    speed?: number,
    opacity?: number
  } = {}
): () => void {
  // Default options
  const {
    particleColor = 'rgba(118, 185, 0, 0.6)',
    particleCount = 50,
    minSize = 2,
    maxSize = 6,
    speed = 1,
    opacity = 0.7
  } = options;
  
  // Make sure container has position relative for absolute positioning of particles
  const originalPosition = container.style.position;
  if (container.style.position !== 'relative' && container.style.position !== 'absolute') {
    container.style.position = 'relative';
  }
  
  // Add overflow hidden if needed
  const originalOverflow = container.style.overflow;
  container.style.overflow = 'hidden';
  
  // Container for all particles
  const particlesContainer = document.createElement('div');
  particlesContainer.style.position = 'absolute';
  particlesContainer.style.top = '0';
  particlesContainer.style.left = '0';
  particlesContainer.style.width = '100%';
  particlesContainer.style.height = '100%';
  particlesContainer.style.zIndex = '0';
  particlesContainer.style.pointerEvents = 'none';
  
  container.appendChild(particlesContainer);
  
  // Generate particles
  const particles: HTMLElement[] = [];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    
    // Random size between min and max
    const size = Math.random() * (maxSize - minSize) + minSize;
    
    // Position randomly within the container
    const posX = Math.random() * 100; // percentage
    const posY = Math.random() * 100; // percentage
    
    // Random movement speed and direction
    const speedX = (Math.random() - 0.5) * speed;
    const speedY = (Math.random() - 0.5) * speed;
    
    // Random opacity
    const particleOpacity = (Math.random() * 0.5 + 0.5) * opacity;
    
    // Style the particle
    particle.style.position = 'absolute';
    particle.style.left = `${posX}%`;
    particle.style.top = `${posY}%`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = particleColor;
    particle.style.opacity = particleOpacity.toString();
    particle.style.transition = 'transform 0.1s ease';
    
    // Store movement data with the element
    particle.dataset.speedX = speedX.toString();
    particle.dataset.speedY = speedY.toString();
    particle.dataset.posX = posX.toString();
    particle.dataset.posY = posY.toString();
    
    particlesContainer.appendChild(particle);
    particles.push(particle);
  }
  
  // Animation function
  let animationId: number;
  
  const moveParticles = () => {
    particles.forEach(particle => {
      // Get current position
      const speedX = parseFloat(particle.dataset.speedX || '0');
      const speedY = parseFloat(particle.dataset.speedY || '0');
      let posX = parseFloat(particle.dataset.posX || '0');
      let posY = parseFloat(particle.dataset.posY || '0');
      
      // Move position
      posX += speedX;
      posY += speedY;
      
      // Loop around boundaries
      if (posX > 100) posX = 0;
      if (posX < 0) posX = 100;
      if (posY > 100) posY = 0;
      if (posY < 0) posY = 100;
      
      // Save updated position
      particle.dataset.posX = posX.toString();
      particle.dataset.posY = posY.toString();
      
      // Apply position
      particle.style.left = `${posX}%`;
      particle.style.top = `${posY}%`;
    });
    
    animationId = requestAnimationFrame(moveParticles);
  };
  
  // Start animation
  animationId = requestAnimationFrame(moveParticles);
  
  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationId);
    if (container.contains(particlesContainer)) {
      container.removeChild(particlesContainer);
    }
    container.style.position = originalPosition;
    container.style.overflow = originalOverflow;
  };
}

/**
 * Create a typing animation effect for text
 * @param element - The DOM element to animate text in
 * @param text - The text to type
 * @param options - Customization options
 * @returns - Promise that resolves when animation completes
 */
export function animateTypingText(
  element: HTMLElement,
  text: string,
  options: {
    speed?: number,
    startDelay?: number,
    cursorChar?: string,
    showCursor?: boolean
  } = {}
): Promise<void> {
  // Default options
  const {
    speed = 30, // milliseconds per character
    startDelay = 0,
    cursorChar = '|',
    showCursor = true
  } = options;
  
  return new Promise((resolve) => {
    let cursorElement: HTMLElement | null = null;
    
    // If showing cursor, create and append it
    if (showCursor) {
      cursorElement = document.createElement('span');
      cursorElement.className = 'typing-cursor';
      cursorElement.textContent = cursorChar;
      cursorElement.style.animation = 'blink 1s step-end infinite';
      element.appendChild(cursorElement);
      
      // Add animation to stylesheet if not already there
      if (!document.getElementById('typing-animation-style')) {
        const style = document.createElement('style');
        style.id = 'typing-animation-style';
        style.textContent = `
          @keyframes blink {
            from, to { opacity: 1; }
            50% { opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    // Clear existing content except cursor
    if (cursorElement) {
      element.innerHTML = '';
      element.appendChild(cursorElement);
    } else {
      element.textContent = '';
    }
    
    let charIndex = 0;
    
    // Start typing after delay
    setTimeout(() => {
      const typeNextChar = () => {
        if (charIndex < text.length) {
          // Create text node for next character
          const char = text.charAt(charIndex);
          const charNode = document.createTextNode(char);
          
          if (cursorElement) {
            element.insertBefore(charNode, cursorElement);
          } else {
            element.appendChild(charNode);
          }
          
          charIndex++;
          setTimeout(typeNextChar, speed);
        } else {
          // Typing complete
          resolve();
        }
      };
      
      typeNextChar();
    }, startDelay);
  });
}

/**
 * Animate number counting up/down
 * @param element - The DOM element to display the count in
 * @param startValue - Starting value
 * @param endValue - Target value
 * @param options - Customization options
 * @returns - Function to stop the animation
 */
export function animateCounterValue(
  element: HTMLElement,
  startValue: number,
  endValue: number,
  options: {
    duration?: number,
    formatter?: (value: number) => string,
    easing?: (t: number) => number
  } = {}
): () => void {
  // Default options
  const {
    duration = 1500,
    formatter = (value) => Math.round(value).toString(),
    easing = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // Quadratic easing
  } = options;
  
  // Store original content
  const originalContent = element.textContent;
  
  // Animation variables
  const startTime = performance.now();
  const changeInValue = endValue - startValue;
  let animationId: number;
  
  // Animation function
  const updateCounter = (currentTime: number) => {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    const easedProgress = easing(progress);
    
    const currentValue = startValue + changeInValue * easedProgress;
    element.textContent = formatter(currentValue);
    
    if (progress < 1) {
      animationId = requestAnimationFrame(updateCounter);
    }
  };
  
  // Start animation
  animationId = requestAnimationFrame(updateCounter);
  
  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationId);
    element.textContent = originalContent;
  };
}

// Export additional utility types
export type MicroInteractionProps = {
  onRipple?: boolean;
  onHoverTilt?: boolean;
  onPulse?: boolean;
  onHoverGlow?: boolean;
  onHoverSlide?: boolean;
  onHoverShimmer?: boolean;
  onHoverTextEffect?: boolean;
  onParticleBackground?: boolean;
  slideDirection?: 'left' | 'right' | 'top' | 'bottom';
  tiltIntensity?: number;
  glowIntensity?: number;
  pulseColor?: string;
  glowColor?: string;
  shimmerColor?: string;
  textHoverColor?: string;
  rippleColor?: string;
  slideBgColor?: string;
  particleOptions?: {
    particleColor?: string;
    particleCount?: number;
    minSize?: number;
    maxSize?: number;
    speed?: number;
    opacity?: number;
  };
};
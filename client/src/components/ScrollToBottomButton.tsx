import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScrollToBottomButtonProps {
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  threshold?: number; // Distance from bottom to show the button (in pixels)
}

const ScrollToBottomButton = ({ 
  scrollAreaRef, 
  threshold = 300 
}: ScrollToBottomButtonProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Show button if we're not at the bottom
      setIsVisible(distanceFromBottom > threshold);
    };

    // Initial check
    handleScroll();

    // Add scroll event listener
    scrollArea.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => {
      scrollArea.removeEventListener('scroll', handleScroll);
    };
  }, [scrollAreaRef, threshold]);

  const scrollToBottom = () => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.scrollTo({
        top: scrollArea.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          className="absolute right-4 bottom-4 z-10"
        >
          <Button
            onClick={scrollToBottom}
            size="sm"
            className="rounded-full h-10 w-10 bg-nvidia-green hover:bg-opacity-80 text-black shadow-lg"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScrollToBottomButton;
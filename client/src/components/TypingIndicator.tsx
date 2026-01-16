import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CpuIcon } from 'lucide-react';

interface TypingIndicatorProps {
  visible: boolean;
}

const TypingIndicator = ({ visible }: TypingIndicatorProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="flex items-start mb-4"
        >
          <div className="w-8 h-8 rounded-full bg-nvidia-dark flex items-center justify-center mr-3 border border-nvidia-green">
            <CpuIcon className="h-4 w-4 text-nvidia-green" />
          </div>
          <div className="bg-[#232323] rounded-lg p-4 inline-flex items-center shadow-md">
            <div className="flex space-x-2">
              <motion.div 
                className="w-2 h-2 bg-nvidia-green rounded-full"
                animate={{ y: [0, -8, 0] }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 1.2,
                  delay: 0 
                }}
              />
              <motion.div 
                className="w-2 h-2 bg-nvidia-green rounded-full"
                animate={{ y: [0, -8, 0] }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 1.2,
                  delay: 0.2 
                }}
              />
              <motion.div 
                className="w-2 h-2 bg-nvidia-green rounded-full"
                animate={{ y: [0, -8, 0] }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 1.2,
                  delay: 0.4 
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TypingIndicator;
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ChevronDown, ChevronUp, Lightbulb, Sparkles, Brain, GraduationCap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

interface LearningModeExplainerProps {
  messageId: number;
  messageContent: string;
  enabled?: boolean;
}

// AI-generated educational content based on the message
const LearningModeExplainer: React.FC<LearningModeExplainerProps> = ({ 
  messageId,
  messageContent,
  enabled = false
}) => {
  const [expanded, setExpanded] = useState(true);

  // If learning mode is disabled, don't render anything
  if (!enabled) {
    return null;
  }

  // Extract key concepts from the message content
  const extractConcepts = (content: string): string[] => {
    // Simple implementation - in real use, this would use NLP or be processed server-side
    // Split by common separators and filter for terms that might be concepts
    const words = content.split(/[\s,.;:!?()[\]{}'"<>\/\\-]+/);
    const candidateTerms = words.filter(word => 
      word.length > 4 && 
      word[0] === word[0].toUpperCase() && 
      !['The', 'This', 'That', 'These', 'Those', 'There', 'Their', 'They', 'When', 'Where', 'What', 'Which'].includes(word)
    );
    
    // Remove duplicates and take up to 3 concepts
    return Array.from(new Set(candidateTerms)).slice(0, 3);
  };

  const keyConcepts = extractConcepts(messageContent);

  // Generate explanations for key concepts
  const generateExplanation = (concept: string): string => {
    // This would be AI-generated in production. For now, we use templates
    return `${concept} is a key concept in this context. In educational settings, understanding ${concept.toLowerCase()} helps build a foundation for deeper learning and practical application.`;
  };

  const conceptItems = keyConcepts.map(concept => ({
    concept,
    explanation: generateExplanation(concept)
  }));

  const educationalCards = [
    {
      title: "Key Concepts",
      icon: <Brain className="h-5 w-5 text-pink-500" />,
      content: conceptItems.length > 0 ? (
        <div className="space-y-2">
          {conceptItems.map((item, index) => (
            <div key={index} className="bg-[#2A2A2A] border border-[#3A3A3A] p-3 rounded-md">
              <h4 className="font-medium text-pink-400">{item.concept}</h4>
              <p className="text-sm text-gray-300">{item.explanation}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No key concepts identified in this message.</p>
      )
    },
    {
      title: "Learning Objectives",
      icon: <GraduationCap className="h-5 w-5 text-blue-500" />,
      content: (
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
          <li>Understand the fundamental principles discussed in this response</li>
          <li>Apply these concepts to related problems or scenarios</li>
          <li>Connect this knowledge to your existing understanding</li>
        </ul>
      )
    },
    {
      title: "Further Exploration",
      icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      content: (
        <div className="space-y-2 text-sm text-gray-300">
          <p>To deepen your understanding:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Ask follow-up questions about specific terms or concepts</li>
            <li>Request examples that apply these ideas to real-world scenarios</li>
            <li>Consider how these concepts connect to other areas you're familiar with</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="w-full mt-3 pt-3 border-t border-[#3A3A3A]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-nvidia-green" />
          <span className="text-sm font-medium text-nvidia-light">Learning Mode</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-7 px-2 text-xs text-gray-400"
        >
          {expanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
          {expanded ? 'Hide' : 'Show'}
        </Button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pb-2">
              {educationalCards.map((card, index) => (
                <Card key={index} className="p-3 bg-[#1A1A1A] border border-[#333] shadow-md hover:shadow-[0_0_8px_rgba(118,185,0,0.15)] transition-all duration-300">
                  <div className="flex items-center mb-2">
                    {card.icon}
                    <h3 className="ml-2 font-medium text-white">{card.title}</h3>
                  </div>
                  <div className="text-gray-300">{card.content}</div>
                </Card>
              ))}
              
              <div className="text-center">
                <div className="inline-block bg-[rgba(118,185,0,0.1)] text-[10px] text-nvidia-green border border-[rgba(118,185,0,0.2)] rounded px-2 py-1">
                  <span className="flex items-center"><BookOpen className="h-3 w-3 mr-1" /> Learning Mode explains concepts to enhance understanding</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LearningModeExplainer;
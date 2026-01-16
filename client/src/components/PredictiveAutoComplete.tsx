import React, { useState, useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PredictiveAutoCompleteProps {
  inputValue: string;
  onSelectSuggestion: (suggestion: string) => void;
  conversationId: string | null;
  messages: Array<{
    id: number;
    role: string;
    content: string;
  }>;
  isActive: boolean;
}

const PredictiveAutoComplete: React.FC<PredictiveAutoCompleteProps> = ({ 
  inputValue, 
  onSelectSuggestion,
  conversationId,
  messages,
  isActive
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Helper function to get context from previous messages
  const getContextFromMessages = () => {
    return messages
      .slice(-5) // Only use the last 5 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  };

  // Generate context-aware suggestions based on input and conversation history
  useEffect(() => {
    if (!isActive || !inputValue.trim()) {
      setSuggestions([]);
      return;
    }

    // Generate suggestions based on input pattern and conversation context
    const generateSuggestions = async () => {
      setLoading(true);
      
      try {
        // In a real implementation, this would be an API call to get suggestions
        // For demo purposes, we'll generate some mock suggestions based on input
        const context = getContextFromMessages();
        
        // Simple rule-based suggestion generator (this would be replaced by ML/API in production)
        let predictedSuggestions: string[] = [];
        
        // If asking about NVIDIA
        if (inputValue.toLowerCase().includes('nvidia')) {
          predictedSuggestions = [
            `${inputValue} and their latest GPU architecture?`,
            `${inputValue}'s involvement in AI development?`,
            `${inputValue}'s history and founding by Jensen Huang?`
          ];
        } 
        // If asking about GPUs or graphics
        else if (inputValue.toLowerCase().includes('gpu') || 
                 inputValue.toLowerCase().includes('graphics')) {
          predictedSuggestions = [
            `${inputValue} architecture and how it compares to CPUs?`,
            `${inputValue} performance in deep learning applications?`,
            `${inputValue} manufacturing process and challenges?`
          ];
        }
        // If asking about AI or machine learning
        else if (inputValue.toLowerCase().includes('ai') || 
                 inputValue.toLowerCase().includes('machine learning') ||
                 inputValue.toLowerCase().includes('deep learning')) {
          predictedSuggestions = [
            `${inputValue} impact on modern computing?`,
            `${inputValue} hardware requirements and optimization?`,
            `${inputValue} future developments and challenges?`
          ];
        }
        // Default suggestions for any other input
        else {
          // Base suggestion on length of input
          if (inputValue.length > 5) {
            predictedSuggestions = [
              `${inputValue} in the context of AI development?`,
              `${inputValue} and how it relates to GPU acceleration?`,
              `Can you elaborate more on ${inputValue}?`
            ];
          }
        }
        
        // If we have a question that ends with a question mark, add a follow-up option
        if (inputValue.trim().endsWith('?') && messages.length > 0) {
          predictedSuggestions.push('Can you provide more details about that?');
          predictedSuggestions.push('What are the practical applications of this?');
        }
        
        // If the input seems to be asking for code
        if (inputValue.toLowerCase().includes('code') || 
            inputValue.toLowerCase().includes('example') ||
            inputValue.toLowerCase().includes('implementation')) {
          predictedSuggestions.push('Could you show a Python implementation?');
          predictedSuggestions.push('What would the CUDA code look like for this?');
        }
        
        // Always offer a dynamic instruction option
        predictedSuggestions.push(`Please explain ${inputValue.trim()} in detail with examples`);
        
        // Filter out any empty suggestions and remove duplicates
        predictedSuggestions = Array.from(new Set(predictedSuggestions.filter(s => s.trim() !== '')));
        
        // Limit to 3 suggestions maximum
        setSuggestions(predictedSuggestions.slice(0, 3));
      } catch (error) {
        console.error('Error generating suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the suggestion generation to avoid too many updates
    const timerId = setTimeout(() => {
      generateSuggestions();
    }, 300);

    return () => clearTimeout(timerId);
  }, [inputValue, isActive, messages]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!suggestions.length) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        onSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    }
  };

  // Add and remove keyboard event listener
  useEffect(() => {
    if (suggestions.length > 0) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [suggestions, selectedIndex]);

  // If no suggestions or not active, don't render anything
  if (!isActive || suggestions.length === 0) {
    return null;
  }

  return (
    <Card ref={suggestionsRef} className="bg-[#1E1E1E] border border-[#444] p-1 rounded-md shadow-lg overflow-hidden">
      {loading ? (
        <div className="p-3 text-gray-400 text-sm flex items-center justify-center">
          <div className="animate-pulse mr-2 w-4 h-4 bg-nvidia-green rounded-full"></div>
          Generating suggestions...
        </div>
      ) : (
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              className={`w-full text-left justify-start p-2 rounded h-auto ${
                selectedIndex === index ? 'bg-[#2A2A2A] text-nvidia-green' : 'hover:bg-[#2A2A2A] text-gray-300'
              }`}
              onClick={() => onSelectSuggestion(suggestion)}
            >
              <Zap className={`h-4 w-4 mr-2 ${selectedIndex === index ? 'text-nvidia-green' : 'text-gray-400'}`} />
              <span className="text-sm whitespace-normal line-clamp-2">{suggestion}</span>
            </Button>
          ))}
          <div className="px-2 py-1 text-[10px] text-gray-500 flex items-center justify-between">
            <span>Context-aware suggestions</span>
            <div className="flex items-center space-x-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              <span>to navigate</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PredictiveAutoComplete;
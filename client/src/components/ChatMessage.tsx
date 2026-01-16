import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { CpuIcon, Copy, CheckCheck, BookmarkPlus, GitBranch, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import MarkdownRenderer from './MarkdownRenderer';
import ReasoningSteps from './ReasoningSteps';
import LearningModeExplainer from './LearningModeExplainer';

interface ChatMessageProps {
  id: number;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp?: Date; // Optional timestamp for the message
  onCopyMessage: (content: string, id: number) => void;
  onCreateBookmark?: (messageId: number) => void;
  onCreateBranch?: (messageId: number) => void;
  onSaveToNote?: (messageId: number, content: string, role: string) => void;
  copiedMessageId: number | null;
  savedNoteId: number | null;
  learningModeEnabled?: boolean; // Whether learning mode is enabled for this conversation
}

const ChatMessage = ({ 
  id, 
  role, 
  content, 
  timestamp = new Date(),
  onCopyMessage,
  onCreateBookmark,
  onCreateBranch,
  onSaveToNote,
  copiedMessageId,
  savedNoteId,
  learningModeEnabled = false
}: ChatMessageProps) => {
  const messageVariants = {
    initial: { 
      opacity: 0,
      y: 20
    },
    animate: { 
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    },
    exit: { 
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  const isUser = role === "user";
  const isAssistant = role === "assistant";
  
  return (
    <motion.div 
      key={id}
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`flex items-start mb-6 ${isUser ? "justify-end" : ""}`}
    >
      {/* AI avatar - show only for assistant messages */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-nvidia-dark flex items-center justify-center mr-3 border border-nvidia-green">
          <CpuIcon className="h-4 w-4 text-nvidia-green" />
        </div>
      )}
      
      {/* Message content */}
      <div 
        className={`rounded-lg p-4 max-w-[80%] ${
          isUser 
            ? "bg-[#2A3036]" 
            : "bg-[#232323] relative group"
        } shadow-md hover:shadow-lg hover:shadow-[rgba(118,185,0,0.1)] transition-all duration-200`}
      >
        {/* For assistant messages, use markdown renderer */}
        {isAssistant ? (
          <>
            <MarkdownRenderer content={content} />
            
            {/* Learning Mode - show educational content when learning mode is enabled */}
            {learningModeEnabled && (
              <LearningModeExplainer 
                messageId={id} 
                messageContent={content}
                enabled={learningModeEnabled} 
              />
            )}
            
            {/* Message timestamp */}
            <div className="text-[10px] text-gray-500 mt-2 opacity-60">
              {format(timestamp, 'h:mm a')}
            </div>
            
            {/* Message actions for assistant messages */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
              {/* Copy button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopyMessage(content, id)}
                className="bg-[#2A2A2A] hover:bg-[#333] p-1.5 h-8 w-8"
                aria-label="Copy message"
              >
                {copiedMessageId === id ? 
                  <CheckCheck className="h-4 w-4 text-nvidia-green" /> : 
                  <Copy className="h-4 w-4 text-gray-400" />
                }
              </Button>
              
              {/* Save to notes button */}
              {onSaveToNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSaveToNote(id, content, role)}
                  className={`bg-[#2A2A2A] hover:bg-[#333] p-1.5 h-8 w-8 ${savedNoteId === id ? 'ring-1 ring-nvidia-green' : ''}`}
                  aria-label="Save to notes"
                >
                  <BookmarkPlus className={`h-4 w-4 ${savedNoteId === id ? 'text-nvidia-green' : 'text-gray-400'}`} />
                </Button>
              )}
              
              {/* Branch button */}
              {onCreateBranch && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCreateBranch(id)}
                  className="bg-[#2A2A2A] hover:bg-[#333] p-1.5 h-8 w-8"
                  aria-label="Create branch from message"
                >
                  <GitBranch className="h-4 w-4 text-gray-400" />
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="text-white">{content}</div>
            
            {/* User message timestamp */}
            <div className="text-[10px] text-gray-500 mt-2 text-right opacity-60">
              {format(timestamp, 'h:mm a')}
            </div>
          </>
        )}
      </div>
      
      {/* User avatar - show only for user messages */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-[#2A3036] flex items-center justify-center ml-3 border border-gray-600">
          <div className="h-4 w-4 text-gray-300">You</div>
        </div>
      )}
    </motion.div>
  );
};

export default ChatMessage;
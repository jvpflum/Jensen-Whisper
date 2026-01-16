import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { 
  CpuIcon, 
  SendIcon, 
  Paperclip, 
  Trash2, 
  Settings,
  LightbulbIcon,
  Bookmark,
  BookmarkPlus,
  Sparkles,
  KeyboardIcon,
  Copy,
  CheckCheck,
  GitBranch,
  GitMerge,
  TreeDeciduous,
  BookOpen,
  Hammer,
  Zap,
  ArrowDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ToolsPanel from "@/components/ToolsPanel";
import WhisperVoiceControls from "@/components/WhisperVoiceControls";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ConversationTree from "@/components/ConversationTree";
import BookmarkDialog from "@/components/BookmarkDialog";
import BranchDialog from "@/components/BranchDialog";
import ChatMessage from "@/components/ChatMessage";
import ScrollToBottomButton from "@/components/ScrollToBottomButton";
import TypingIndicator from "@/components/TypingIndicator";
import PredictiveAutoComplete from "@/components/PredictiveAutoComplete";
import { Button } from "@/components/ui/button";
import { InteractiveButton } from "@/components/ui/interactive-button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createRippleEffect, pulseElement } from "@/lib/micro-interactions";

// Helper function to clean message content
const cleanMarkdown = (content: string): string => {
  return content
    // Remove any HTML tags
    .replace(/<[^>]*>/g, '')
    // Fix bullet points
    .replace(/^\* /gm, '• ')
    .replace(/^- /gm, '• ')
    // Fix dashes and hyphens
    .replace(/---+/g, '—')
    .replace(/\s-\s/g, ' — ')
    // Remove markdown formatting characters
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/_/g, '');
};

type Message = {
  id: number;
  role: "system" | "user" | "assistant";
  content: string;
};

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  reasoningMode: boolean;
  setReasoningMode: (value: boolean) => void;
  onToggleSidebar?: () => void;
  isListening?: boolean;
  setIsListening?: (value: boolean) => void;
  isSpeaking?: boolean;
  setIsSpeaking?: (value: boolean) => void;
  onSpeechRecognized?: (text: string) => void;
  lastAssistantMessage?: string | null;
  learningModeEnabled?: boolean;
  setLearningModeEnabled?: (value: boolean) => void;
  onClearConversation?: () => void;
  onSummarizeResponse?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onGenerateNvidiaPrompt?: () => void;
}

const ChatInterface = ({ 
  messages, 
  isLoading, 
  onSendMessage,
  reasoningMode,
  setReasoningMode,
  onToggleSidebar,
  isListening,
  setIsListening,
  isSpeaking,
  setIsSpeaking,
  onSpeechRecognized,
  lastAssistantMessage,
  onClearConversation,
  onSummarizeResponse,
  onOpenKeyboardShortcuts,
  onGenerateNvidiaPrompt,
  learningModeEnabled = false,
  setLearningModeEnabled
}: ChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState<number | null>(null);
  const [predictiveMode, setPredictiveMode] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Custom event for saving notes from the chat interface
  const handleSaveToNote = (message: Message) => {
    // Only allow saving assistant messages
    if (message.role !== 'assistant') return;
    
    // Create a custom event to be caught by ProductivitySidebar
    const saveNoteEvent = new CustomEvent('saveAsNote', {
      detail: {
        messageId: message.id,
        content: message.content,
        role: message.role
      }
    });
    
    // Dispatch the event to be caught by components that are listening for it
    window.dispatchEvent(saveNoteEvent);
    
    // Show visual feedback
    setSavedNoteId(message.id);
    setTimeout(() => setSavedNoteId(null), 2000);
    
    // Show toast notification
    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'fixed bottom-4 right-4 bg-nvidia-green text-black px-4 py-2 rounded-md shadow-lg z-50';
    feedbackEl.textContent = 'Message saved as note!';
    document.body.appendChild(feedbackEl);
    
    setTimeout(() => {
      feedbackEl.style.opacity = '0';
      feedbackEl.style.transition = 'opacity 0.5s';
      setTimeout(() => document.body.removeChild(feedbackEl), 500);
    }, 2000);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "44px";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Enter for form submission (only if not shift + enter for newline)
    if (e.key === "Enter" && !e.shiftKey) {
      // If predictive mode is on, the Enter key is handled by the PredictiveAutoComplete component
      // Only submit the form if predictions aren't showing or if explicitly ignoring them
      if (!predictiveMode || inputValue.trim().length === 0) {
        e.preventDefault();
        handleSubmit();
      }
    }
    
    // All other keys like Tab, Arrow Up/Down for predictions are handled by the PredictiveAutoComplete component
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "0";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle copying message content
  const copyToClipboard = (text: string, messageId: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(messageId);
      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    });
  };
  
  // Handle selection from predictive autocomplete
  const handleSelectSuggestion = (suggestion: string) => {
    setInputValue(suggestion);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleToolResult = (result: any) => {
    // We're not sending the tool result as a user message anymore
    if (result) {
      // Add tool result message directly as an artificial assistant message
      const resultObj = result.success ? result.result : { error: result.error || "An error occurred" };
      
      // Construct a human-readable message based on the tool and result
      let readableMessage = "";
      
      if (result.toolId === "calculator") {
        if (result.success) {
          const expression = result.result.expression || "the expression";
          const answer = result.result.result;
          readableMessage = `The result of ${expression} is **${answer}**.`;
        } else {
          readableMessage = `I couldn't calculate that. ${result.error}`;
        }
      } else if (result.toolId === "weather") {
        if (result.success) {
          const location = result.result.location;
          const temp = result.result.temperature;
          const condition = result.result.condition;
          const units = result.result.units === "imperial" ? "°F" : "°C";
          readableMessage = `The current weather in ${location} is ${temp}${units} and ${condition}.`;
        } else {
          readableMessage = `I couldn't get the weather information. ${result.error}`;
        }
      } else if (result.toolId === "web-search") {
        if (result.success) {
          readableMessage = `Here are some search results for "${result.result.query}":\n\n`;
          result.result.searchResults.forEach((item: any, index: number) => {
            readableMessage += `${index + 1}. **${item.title}**\n${item.snippet}\n${item.url}\n\n`;
          });
        } else {
          readableMessage = `I couldn't perform that web search. ${result.error}`;
        }
      } else {
        // Generic formatting for other tools
        readableMessage = result.success 
          ? `Here's the result from the ${result.toolId} tool:\n\n\`\`\`json\n${JSON.stringify(resultObj, null, 2)}\n\`\`\``
          : `The ${result.toolId} tool returned an error: ${result.error}`;
      }
      
      // Add JSON data for full transparency
      readableMessage += `\n\n<details>\n<summary>Tool Response Details</summary>\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n</details>`;
      
      // Notify parent that we have a tool result to display
      if (onSendMessage) {
        // Add a user message first that shows what tool was used
        onSendMessage(`Can you calculate ${result.result?.expression || "this"} for me?`);
        
        // We can't add messages directly to the list since it's managed by the parent
        // So we're sending a special message format to the parent component
        // This approach means the parent component will need to handle this special message
        setTimeout(() => {
          // Instead of trying to modify messages directly, we'll send another special message
          // directly using a special tool prefix that the Chat component can recognize
          onSendMessage(`__TOOL_RESULT__:${JSON.stringify({
            id: Math.floor(Math.random() * 1000000),
            role: "assistant",
            content: readableMessage
          })}`);
        }, 500);
      }
      
      // Close the tools panel
      setToolsPanelOpen(false);
    }
  };

  return (
    <div className="container mx-auto px-4 w-full max-w-4xl">
      {/* Tools Panel */}
      {toolsPanelOpen && (
        <div className="absolute top-0 left-0 w-full h-full z-10 bg-black/50 flex items-center justify-center">
          <div className="w-[90%] max-w-2xl max-h-[80vh]">
            <ToolsPanel 
              onToolResult={handleToolResult}
              onClose={() => setToolsPanelOpen(false)}
            />
          </div>
        </div>
      )}
      
      <Card className="bg-nvidia-dark rounded-lg shadow-xl border border-nvidia-dark overflow-hidden flex flex-col h-[70vh] nvidia-glow">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-nvidia-dark flex justify-between items-center bg-gradient-to-r from-nvidia-dark to-[#232323]">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-nvidia-green animate-pulse mr-2"></div>
            <h2 className="font-semibold text-lg nvidia-gradient-text">JensenGPT</h2>
            <div className="ml-2 px-1.5 py-0.5 bg-[rgba(118,185,0,0.1)] rounded text-[10px] text-nvidia-green border border-[rgba(118,185,0,0.2)]">NVIDIA AI</div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-[#2A2A2A] rounded-md transition-colors duration-200" 
              aria-label="Clear conversation"
              onClick={onClearConversation}
              disabled={!onClearConversation || messages.length === 0}
            >
              <Trash2 className="h-5 w-5 text-gray-400 hover:text-nvidia-green" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-[#2A2A2A] rounded-md transition-colors duration-200" 
              aria-label="AI Tools"
              onClick={() => setToolsPanelOpen(!toolsPanelOpen)}
            >
              <Hammer className={`h-5 w-5 ${toolsPanelOpen ? 'text-nvidia-green' : 'text-gray-400 hover:text-nvidia-green'}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-[#2A2A2A] rounded-md transition-colors duration-200" 
              aria-label="Settings"
            >
              <Settings className="h-5 w-5 text-gray-400 hover:text-nvidia-green" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-[#2A2A2A] rounded-md transition-colors duration-200" 
              aria-label="Productivity Tools"
              onClick={onToggleSidebar}
            >
              <BookmarkPlus className="h-5 w-5 text-gray-400 hover:text-nvidia-green" />
            </Button>
          </div>
        </div>
        
        {/* Chat Messages */}
        <ScrollArea 
          id="chat-messages" 
          className="flex-grow p-4 space-y-6 relative" 
          ref={scrollAreaRef}
        >
          <AnimatePresence>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                role={message.role}
                content={message.content}
                timestamp={new Date()} // We should get this from the server in a real implementation
                onCopyMessage={copyToClipboard}
                onSaveToNote={(id, content, role) => handleSaveToNote({ id, content, role } as Message)}
                copiedMessageId={copiedMessageId}
                savedNoteId={savedNoteId}
                learningModeEnabled={learningModeEnabled}
              />
            ))}
            
            {/* Typing indicator - shows when a response is being generated */}
            <TypingIndicator visible={isLoading} />
          </AnimatePresence>
          
          {/* Scroll to bottom button */}
          <ScrollToBottomButton scrollAreaRef={scrollAreaRef} />
        </ScrollArea>
        
        {/* Chat Input */}
        <div className="p-4 border-t border-[#333] bg-[#1E1E1E]">
          <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message JensenGPT..."
                className="min-h-[44px] max-h-[150px] pr-20 bg-[#232323] border-[#444] text-white resize-none focus:ring-nvidia-green focus:border-nvidia-green"
              />
              
              {/* Predictive Auto-Complete */}
              {predictiveMode && inputValue.trim().length > 0 && !isLoading && (
                <div className="absolute left-0 right-20 top-full mt-1 z-10">
                  <PredictiveAutoComplete
                    inputValue={inputValue}
                    onSelectSuggestion={handleSelectSuggestion}
                    conversationId={null}
                    messages={messages}
                    isActive={predictiveMode}
                  />
                </div>
              )}
              <div className="absolute bottom-2 right-2 flex space-x-1">
                {/* Voice Input Button */}
                {onSpeechRecognized && setIsListening && setIsSpeaking && (
                  <div className="mr-2 group relative">
                    <WhisperVoiceControls
                      onSpeechRecognized={onSpeechRecognized}
                      isListening={isListening || false}
                      setIsListening={setIsListening}
                      isSpeaking={isSpeaking || false}
                      setIsSpeaking={setIsSpeaking}
                      lastAssistantMessage={lastAssistantMessage}
                    />
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 bg-[#333] text-white text-xs rounded p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <p className="mb-1 font-semibold text-nvidia-green">Voice Controls:</p>
                      <p className="mb-1">• Left button: Click to speak your message</p>
                      <p className="mb-1">• Right button: Hear the AI's response</p>
                      <p className="text-gray-300 text-[10px]">For best results, use Chrome/Edge browsers</p>
                    </div>
                  </div>
                )}
                
                {/* Generate NVIDIA Prompt Button */}
                {onGenerateNvidiaPrompt && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-full bg-[#232323] border-[#444] hover:bg-[#333] hover:border-nvidia-green"
                          onClick={onGenerateNvidiaPrompt}
                        >
                          <Sparkles className="h-4 w-4 text-nvidia-green" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Generate NVIDIA prompt</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Send Button */}
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-nvidia-green hover:bg-opacity-90 text-black"
                  disabled={!inputValue.trim() || isLoading}
                  onClick={(e) => {
                    createRippleEffect(e as React.MouseEvent<HTMLElement>);
                    handleSubmit();
                  }}
                >
                  <SendIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Reasoning and Learning Mode Toggles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="reasoning-mode"
                    checked={reasoningMode}
                    onCheckedChange={setReasoningMode}
                    className="data-[state=checked]:bg-nvidia-green"
                  />
                  <Label htmlFor="reasoning-mode" className="text-sm text-gray-300 flex items-center">
                    <LightbulbIcon className="w-4 h-4 mr-1 text-nvidia-green" />
                    Reasoning Mode
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="learning-mode"
                    checked={learningModeEnabled}
                    onCheckedChange={(checked) => {
                      console.log("Learning mode switch clicked, new state:", checked);
                      
                      // First update our local state directly
                      if (typeof setLearningModeEnabled === 'function') {
                        setLearningModeEnabled(checked);
                      }
                      
                      // Create a custom event to communicate with parent component
                      const event = new CustomEvent('toggleLearningMode', { 
                        detail: { enabled: checked } 
                      });
                      console.log("Dispatching toggleLearningMode event with data:", event.detail);
                      window.dispatchEvent(event);
                    }}
                    className="data-[state=checked]:bg-nvidia-green"
                  />
                  <Label htmlFor="learning-mode" className="text-sm text-gray-300 flex items-center">
                    <BookOpen className="w-4 h-4 mr-1 text-nvidia-green" />
                    Learning Mode
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="predictive-mode"
                    checked={predictiveMode}
                    onCheckedChange={setPredictiveMode}
                    className="data-[state=checked]:bg-nvidia-green"
                  />
                  <Label htmlFor="predictive-mode" className="text-sm text-gray-300 flex items-center">
                    <Sparkles className="w-4 h-4 mr-1 text-nvidia-green" />
                    Auto-Complete
                  </Label>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {onOpenKeyboardShortcuts && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-md px-2 text-gray-400 hover:text-nvidia-green"
                          onClick={onOpenKeyboardShortcuts}
                        >
                          <KeyboardIcon className="h-4 w-4 mr-1" />
                          <span className="text-xs">Shortcuts</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Keyboard shortcuts</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {onSummarizeResponse && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-md px-2 text-gray-400 hover:text-nvidia-green"
                          onClick={onSummarizeResponse}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          <span className="text-xs">Summarize</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Summarize the last response</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default ChatInterface;
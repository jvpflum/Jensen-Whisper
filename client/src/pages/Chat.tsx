import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChatRequest, ChatResponse } from "@shared/schema";
import ChatInterface from "@/components/ChatInterface";
import { Switch } from "@/components/ui/switch"; 
import { Label } from "@/components/ui/label";
import { KeyboardIcon, Sparkles, BrainCircuit, Share2, Clock, TreeDeciduous, GitBranch, Zap, Settings, Cpu, BookOpen } from "lucide-react";
import ProductivitySidebar from "@/components/ProductivitySidebar";
import KeyboardShortcutsModal, { ShortcutDescription } from "@/components/KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Button } from "@/components/ui/button";
import WhisperVoiceControls from "@/components/WhisperVoiceControls";
import ThoughtTreeExplorer from "@/components/ThoughtTreeExplorer";
import EnhancedReasoningTimeline from "@/components/EnhancedReasoningTimeline";
import CustomReasoningTemplates, { REASONING_TEMPLATES } from "@/components/CustomReasoningTemplates";
import ConversationTree from "@/components/ConversationTree";
import BranchDialog from "@/components/BranchDialog";
import BookmarkDialog from "@/components/BookmarkDialog";
import { ModelSelector } from "@/components/ModelSelector";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import LearningModeToggle from "@/components/LearningModeToggle";
import ReasoningSteps from "@/components/ReasoningSteps";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// NVIDIA-related prompts for the random prompt generator
const NVIDIA_PROMPTS = [
  "Can you explain NVIDIA's CUDA technology and why it revolutionized AI development?",
  "What makes NVIDIA's current GPU architecture different from its competitors?",
  "What is NVIDIA's role in the development of self-driving car technology?",
  "How has Jensen Huang's leadership shaped NVIDIA's business strategy over the years?",
  "What are the key features of NVIDIA's latest graphics cards for gaming?",
  "Can you explain how NVIDIA's RTX technology works and what makes it special?",
  "How is NVIDIA contributing to the advancement of generative AI?",
  "What's the significance of NVIDIA's Blackwell architecture in AI computing?",
  "How does NVIDIA's DLSS technology improve gaming performance?",
  "What role does NVIDIA play in modern data centers and cloud computing?",
  "Explain NVIDIA's approach to ray tracing technology in graphics rendering",
  "How is NVIDIA helping to advance healthcare and medical research?",
  "What are NVIDIA's Omniverse applications and why are they important?",
  "How does NVIDIA's hardware accelerate machine learning workloads?",
  "What were the key milestones in NVIDIA's history that led to its current success?",
  "Can you explain NVIDIA's position in the AI chip market compared to competitors?",
  "How does NVIDIA collaborate with game developers to optimize game performance?",
  "What are the capabilities of NVIDIA's Tensor Cores and how do they differ from regular GPU cores?",
  "How has NVIDIA's acquisition strategy contributed to its technological advancement?",
  "What's the significance of NVIDIA's move into making its own CPUs with Grace architecture?"
];

type Message = {
  id: number;
  role: "system" | "user" | "assistant";
  content: string;
};

// Helper function to generate safe message IDs (compatible with PostgreSQL integer limits)
const generateSafeId = () => {
  // PostgreSQL integer max is 2147483647, so we'll use a value well below that
  // Generate a random number between 1 and 1 million to avoid collisions
  return Math.floor(Math.random() * 1000000) + 1;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateSafeId(),
      role: "system",
      content: "Hello! I'm JensenGPT, powered by NVIDIA's Llama Nemotron. How can I assist you today?"
    }
  ]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  
  // Fetch messages from the server based on conversation and active branch
  const messagesQuery = useQuery({
    queryKey: activeBranchId 
      ? ['/api/conversations', conversationId, 'branches', activeBranchId, 'messages'] 
      : ['/api/conversations', conversationId, 'messages'],
    // Use the built-in query function from queryClient
    // This helps avoid duplicate API calls and uses the shared cache
    enabled: !!conversationId,
    staleTime: 30000, // 30 seconds before considering data stale
    refetchOnWindowFocus: false,
    // Handle errors by falling back to conversation messages when branch messages fail
    retry: (failureCount, error) => {
      if (failureCount === 1 && activeBranchId) {
        console.log("Branch messages fetch failed, will fall back to conversation messages");
        // Switch query to fall back to regular conversation messages
        queryClient.setQueryData(
          ['/api/conversations', conversationId, 'branches', activeBranchId, 'messages'], 
          null
        );
        return false; // Don't retry with the branch messages
      }
      return false; // Don't retry after the first attempt
    },
  });
  const [reasoningMode, setReasoningMode] = useState<boolean>(false);
  const [reasoningTemplate, setReasoningTemplate] = useState<string>("standard");
  const [showThoughtTree, setShowThoughtTree] = useState<boolean>(false);
  const [showReasoningTimeline, setShowReasoningTimeline] = useState<boolean>(false);
  const [visualizationType, setVisualizationType] = useState<"tree" | "timeline">("tree");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showConversationTree, setShowConversationTree] = useState<boolean>(false);
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState<boolean>(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState<boolean>(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [modelSettingsOpen, setModelSettingsOpen] = useState<boolean>(false);
  const [learningModeEnabled, setLearningModeEnabled] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Mutation for toggling learning mode
  const toggleLearningModeMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return apiRequest('PATCH', `/api/conversations/${id}/learning-mode`, { enabled });
    },
    onSuccess: () => {
      if (conversationId) {
        // Invalidate the conversation query to refetch updated data
        queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to toggle learning mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });
  
  // Function to handle clearing the conversation
  const handleClearConversation = () => {
    setMessages([
      {
        id: generateSafeId(),
        role: "system",
        content: "Hello! I'm JensenGPT, powered by NVIDIA's Llama Nemotron. How can I assist you today?"
      }
    ]);
    
    toast({
      title: "Conversation cleared",
      description: "Started a new conversation.",
      variant: "default",
    });
  };

  const sendMessageMutation = useMutation<
    void,
    Error,
    ChatRequest
  >({
    mutationFn: async (data) => {
      console.log("Starting chat request with data:", JSON.stringify({
        message: data.message,
        conversationId: data.conversationId, 
        reasoningMode: data.reasoningMode
      }));
      
      // Create a temporary ID for the assistant's response that will be added once we have content
      const tempId = generateSafeId();
      console.log("Created temp message ID:", tempId);
      
      // We no longer add a placeholder message immediately
      // Instead, we'll add the assistant message when we receive the first chunk of content
      
      try {
        console.log("Sending POST request to /api/chat");
        // Send request to streaming endpoint
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(data),
          mode: 'cors', // Explicitly set CORS mode
          credentials: 'same-origin'
        });
        
        // Check if response is ok before proceeding
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        // Set up a reader for the streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to get reader from response");
        
        let accumulatedContent = '';
        let newConversationId = data.conversationId;
        
        // Keep track of message for updating
        let messageId = tempId;
        
        // Process the stream
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          // Convert the chunk to text
          const chunk = new TextDecoder().decode(value);
          console.log("Received chunk:", chunk.substring(0, 50) + (chunk.length > 50 ? "..." : ""));
          
          // Split by newlines and process each line
          const lines = chunk.split('\n').filter(line => line.trim());
          console.log("Processing lines:", lines.length);
          
          for (const line of lines) {
            try {
              // Only process non-empty lines
              if (line.trim()) {
                const jsonResponse = JSON.parse(line);
                console.log("Parsed JSON:", JSON.stringify(jsonResponse).substring(0, 100));
                
                // Save conversation ID as soon as we get it (this needs to happen before processing content)
                if (jsonResponse.conversationId) {
                  newConversationId = jsonResponse.conversationId;
                  console.log("Received conversationId from API:", newConversationId);
                  
                  if (!conversationId) {
                    console.log("No existing conversationId, setting to:", newConversationId);
                    if (typeof newConversationId === 'string') {
                      setConversationId(newConversationId);
                      
                      // Force refresh queries that depend on the conversationId
                      setTimeout(() => {
                        console.log("Invalidating queries for new conversationId:", newConversationId);
                        queryClient.invalidateQueries({ queryKey: ['/api/conversations', newConversationId, 'messages'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/conversations', newConversationId, 'branches'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/conversations', newConversationId, 'branches', 'active'] });
                      }, 500);
                    }
                  }
                }
                
                if (jsonResponse.content) {
                  // Update accumulated content with the new chunk
                  accumulatedContent += jsonResponse.content;
                  
                  // Only proceed if we have meaningful content - avoid empty bubbles
                  if (accumulatedContent.trim().length > 0) {
                    // Log for debugging (truncated to prevent console spam)
                    const contentPreview = accumulatedContent.length > 40 
                      ? `${accumulatedContent.substring(0, 40)}...` 
                      : accumulatedContent;
                    console.log("Updating message content:", messageId, contentPreview);
                    
                    // Use a functional update to ensure we're working with the latest state
                    setMessages(prevMessages => {
                      const foundMessageIndex = prevMessages.findIndex(m => m.id === messageId);
                      
                      // If message not found, add it
                      if (foundMessageIndex === -1) {
                        console.log("Message not found, adding new assistant message");
                        return [
                          ...prevMessages,
                          {
                            id: messageId,
                            role: "assistant", 
                            content: accumulatedContent
                          }
                        ];
                      }
                      
                      // Create a new array to ensure React detects the change
                      const updatedMessages = [...prevMessages];
                      // Update the message with the full accumulated content
                      updatedMessages[foundMessageIndex] = {
                        ...updatedMessages[foundMessageIndex],
                        content: accumulatedContent
                      };
                      
                      return updatedMessages;
                    });
                  }
                }
                
                // Check if stream is complete
                if (jsonResponse.isComplete) {
                  console.log("Stream complete, final message received");
                  
                  // If this is the final message, make sure we have the complete content
                  if (jsonResponse.message && jsonResponse.message.trim().length > 0) {
                    console.log("Final message content received, length:", jsonResponse.message.length);
                    
                    // Log a preview of the final content
                    const messagePreview = jsonResponse.message.length > 40 
                      ? `${jsonResponse.message.substring(0, 40)}...` 
                      : jsonResponse.message;
                    console.log("Final message preview:", messagePreview);
                    
                    // Update the final message to ensure it's complete
                    setMessages(prevMessages => {
                      const foundMessageIndex = prevMessages.findIndex(m => m.id === messageId);
                      
                      // If message not found, add it (only if we have meaningful content)
                      if (foundMessageIndex === -1) {
                        console.log("Final message not found, adding complete message");
                        return [
                          ...prevMessages,
                          {
                            id: messageId,
                            role: "assistant",
                            content: jsonResponse.message
                          }
                        ];
                      }
                      
                      // Create a new array to ensure React detects the change
                      const updatedMessages = [...prevMessages];
                      // Update the message with the complete content
                      updatedMessages[foundMessageIndex] = {
                        ...updatedMessages[foundMessageIndex],
                        content: jsonResponse.message
                      };
                      
                      return updatedMessages;
                    });
                  }
                  break;
                }
              }
            } catch (e) {
              if (line.trim()) {
                console.error('Error parsing JSON from stream:', e, 'Line:', line);
              }
              // Continue processing other lines even if one fails
            }
          }
        }
        
      } catch (error) {
        // Remove the placeholder message on error
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.id !== tempId)
        );
        throw error;
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;

    // Check if this is a special tool result message
    if (message.startsWith('__TOOL_RESULT__:')) {
      try {
        // Parse the JSON content after the prefix
        const toolResultData = JSON.parse(message.substring('__TOOL_RESULT__:'.length));
        
        // Add the assistant message with the tool result directly
        setMessages((prev) => [
          ...prev,
          {
            id: toolResultData.id || generateSafeId(),
            role: "assistant",
            content: toolResultData.content
          },
        ]);
        
        // Don't send this to the API
        return;
      } catch (e) {
        console.error("Failed to parse tool result message:", e);
        // Continue with normal message handling if parsing fails
      }
    }

    // Add the user message to the messages
    const newId = generateSafeId();
    setMessages((prev) => [
      ...prev,
      {
        id: newId,
        role: "user",
        content: message,
      },
    ]);
    
    // Enable visualizations for responses in reasoning mode
    if (reasoningMode) {
      if (visualizationType === "tree") {
        setShowThoughtTree(true);
        setShowReasoningTimeline(false);
      } else {
        setShowThoughtTree(false);
        setShowReasoningTimeline(true);
      }
    }

    // Get the selected reasoning template system prompt
    const selectedTemplate = REASONING_TEMPLATES.find(t => t.id === reasoningTemplate) || REASONING_TEMPLATES[0];
    
    // Send the message to the API with the system prompt from the template and selected model
    sendMessageMutation.mutate({
      message,
      conversationId: conversationId || null,
      reasoningMode,
      systemPrompt: reasoningMode ? selectedTemplate.systemPrompt : undefined,
      branchId: activeBranchId || undefined,
      parentMessageId: selectedMessageId || undefined,
      modelId: selectedModelId
    });
    
    // Reset the selected message ID after sending
    if (selectedMessageId) {
      setSelectedMessageId(null);
    }
  };

  // Function to handle summarizing the last assistant message
  const handleSummarizeResponse = async () => {
    console.log("Summarize function called");
    // Get the last assistant message using our helper
    const lastAssistantMessageContent = getLastAssistantMessage();
    
    console.log("Last assistant message:", lastAssistantMessageContent);
    
    if (!lastAssistantMessageContent) {
      toast({
        title: "Nothing to summarize",
        description: "No assistant messages found to summarize.",
        variant: "default",
      });
      return;
    }
    
    // Create a prompt asking to summarize the content
    const summaryPrompt = `Please provide a concise summary of the following information (about 3-4 bullet points): \n\n${lastAssistantMessageContent}`;
    
    // Add the system message to request a summary
    const newId = generateSafeId();
    setMessages((prev) => [
      ...prev,
      {
        id: newId,
        role: "user",
        content: "Please summarize your last response.",
      },
    ]);
    
    // Send the summary request to the API
    sendMessageMutation.mutate({
      message: summaryPrompt,
      conversationId: conversationId || null,
      reasoningMode: false, // Disable reasoning mode for summaries
      modelId: selectedModelId
    });
  };

  // Handle using a saved prompt
  const handleUsePrompt = (
    promptContent: string, 
    reasoningSettings?: { 
      enabled: boolean, 
      templateId: string 
    }
  ) => {
    if (!promptContent.trim()) return;
    
    // Apply reasoning settings if provided
    if (reasoningSettings) {
      setReasoningMode(reasoningSettings.enabled);
      if (reasoningSettings.enabled && reasoningSettings.templateId) {
        setReasoningTemplate(reasoningSettings.templateId);
      }
    }
    
    // Add the prompt as a user message
    const newId = generateSafeId();
    setMessages((prev) => [
      ...prev,
      {
        id: newId,
        role: "user",
        content: promptContent,
      },
    ]);
    
    // Enable visualizations for responses in reasoning mode
    if (reasoningMode || (reasoningSettings?.enabled)) {
      if (visualizationType === "tree") {
        setShowThoughtTree(true);
        setShowReasoningTimeline(false);
      } else {
        setShowThoughtTree(false);
        setShowReasoningTimeline(true);
      }
    }
    
    // Get the selected reasoning template
    const selectedTemplate = REASONING_TEMPLATES.find(t => t.id === reasoningTemplate) || REASONING_TEMPLATES[0];
    
    // Send the prompt to the API
    sendMessageMutation.mutate({
      message: promptContent,
      conversationId: conversationId || null,
      reasoningMode,
      systemPrompt: reasoningMode ? selectedTemplate.systemPrompt : undefined,
      branchId: activeBranchId || undefined,
      parentMessageId: selectedMessageId || undefined,
      modelId: selectedModelId
    });
    
    // Reset the selected message ID after sending
    if (selectedMessageId) {
      setSelectedMessageId(null);
    }
  };

  // Toggle sidebar using keyboard shortcuts
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Toggle reasoning mode using keyboard shortcuts
  const toggleReasoningMode = () => {
    const newMode = !reasoningMode;
    setReasoningMode(newMode);
    toast({
      title: newMode ? "Reasoning Mode Enabled" : "Reasoning Mode Disabled",
      description: newMode
        ? "AI will explain its reasoning process."
        : "AI responses will be more concise.",
    });
  };

  // Register keyboard shortcuts
  const { getShortcutDescriptions } = useKeyboardShortcuts({
    "navigation.toggleSidebar": {
      combo: { key: "p", ctrlKey: true },
      handler: toggleSidebar,
      description: "Toggle productivity sidebar"
    },
    "chat.toggleReasoningMode": {
      combo: { key: "r", ctrlKey: true },
      handler: toggleReasoningMode,
      description: "Toggle reasoning mode"
    },
    "chat.summarize": {
      combo: { key: "s", ctrlKey: true },
      handler: handleSummarizeResponse,
      description: "Summarize last response"
    },
    "help.shortcuts": {
      combo: { key: "/", ctrlKey: true },
      handler: () => setShortcutsModalOpen(true),
      description: "Show keyboard shortcuts"
    }
  });

  // Get the last assistant message content
  const getLastAssistantMessage = (): string | null => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === "assistant");
    
    return lastAssistantMessage?.content || null;
  };
  
  // Function to generate a random NVIDIA prompt
  const generateRandomNvidiaPrompt = () => {
    const randomIndex = Math.floor(Math.random() * NVIDIA_PROMPTS.length);
    const randomPrompt = NVIDIA_PROMPTS[randomIndex];
    
    // Send the random prompt to the chat
    handleSendMessage(randomPrompt);
    
    toast({
      title: "Random NVIDIA Prompt",
      description: "Generated a random NVIDIA-related question",
      variant: "default",
    });
  };

  // Handle speech recognition
  const handleSpeechRecognized = (text: string) => {
    if (text.trim()) {
      handleSendMessage(text);
    }
  };
  
  // Handle branch creation
  const handleCreateBranch = (parentMessageId: number) => {
    setSelectedMessageId(parentMessageId);
    setBranchDialogOpen(true);
  };
  
  // Handle branch creation completion
  const handleBranchCreated = (branchId: string) => {
    setActiveBranchId(branchId);
    
    // Force show the conversation tree after creating a branch
    setShowConversationTree(true);
    
    // Automatically refresh the queries to show the new branch
    queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'branches'] });
    queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'branches', 'active'] });
    
    // Set this branch as active via API
    if (conversationId) {
      (async () => {
        try {
          await apiRequest('POST', `/api/branches/${branchId}/active`);
          
          // Now fetch the messages for this branch
          queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
          
          toast({
            title: "Branch Created",
            description: "New conversation branch has been created and activated. You can now continue the conversation from this point.",
            variant: "default",
          });
        } catch (error) {
          console.error("Error activating branch:", error);
          toast({
            title: "Error",
            description: "Branch created but couldn't be activated. Try selecting it manually.",
            variant: "destructive",
          });
        }
      })();
    }
  };
  
  // Handle branch selection
  const handleBranchSelect = (branchId: string) => {
    console.log(`Selecting branch: ${branchId}`);
    setActiveBranchId(branchId);
    // Set this branch as active
    if (conversationId) {
      (async () => {
        try {
          await apiRequest('POST', `/api/branches/${branchId}/active`);
          
          // Reload the messages for this branch
          queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
          
          // Also update the active branch in the UI
          queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'branches', 'active'] });
          
          toast({
            title: "Branch Activated",
            description: "Switched to the selected conversation branch. Continue the conversation from this point.",
            variant: "default",
          });
        } catch (error) {
          console.error("Error activating branch:", error);
          toast({
            title: "Error",
            description: "Failed to activate the branch. Please try again.",
            variant: "destructive",
          });
        }
      })();
    }
  };
  
  // Handle bookmark creation
  const handleCreateBookmark = (messageId: number) => {
    setSelectedMessageId(messageId);
    setBookmarkDialogOpen(true);
  };
  
  // Handle bookmark creation completion
  const handleBookmarkCreated = () => {
    toast({
      title: "Bookmark Created",
      description: "Message has been bookmarked for easy reference.",
      variant: "default",
    });
  };
  
  // Handle bookmark selection
  const handleBookmarkSelect = (messageId: number) => {
    // Scroll to the bookmarked message or highlight it
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight-message');
      setTimeout(() => {
        messageElement.classList.remove('highlight-message');
      }, 2000);
    }
  };

  // Fetch conversation data to get learning mode status
  const { data: conversationData } = useQuery({
    queryKey: conversationId ? ['/api/conversations', conversationId] : ['empty-key'],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch conversation');
      return response.json();
    },
    enabled: !!conversationId,
  });

  // Effect to update learning mode from conversation data
  useEffect(() => {
    if (conversationData && conversationId) {
      setLearningModeEnabled(!!conversationData.learningModeEnabled);
    }
  }, [conversationData, conversationId]);

  // Update messages from the query when available
  useEffect(() => {
    if (messagesQuery.isSuccess && messagesQuery.data) {
      // Only update if we have at least one message from the server
      if (Array.isArray(messagesQuery.data) && messagesQuery.data.length > 0) {
        setMessages(messagesQuery.data);
        console.log("Updated messages from query:", messagesQuery.data);
      }
    }
  }, [messagesQuery.data, messagesQuery.isSuccess]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    const chatContainer = document.getElementById("chat-messages");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages]);

  // Effect to listen for the learning mode toggle event from ChatInterface
  useEffect(() => {
    const handleLearningModeToggle = (event: CustomEvent<{ enabled: boolean }>) => {
      console.log("Learning mode toggle event received:", event.detail.enabled);
      
      // Update local state
      setLearningModeEnabled(event.detail.enabled);
      
      // If we have a conversation ID, update on the server
      if (conversationId) {
        toggleLearningModeMutation.mutate({
          id: conversationId,
          enabled: event.detail.enabled
        });
      }
    };

    // Add event listener
    window.addEventListener('toggleLearningMode', handleLearningModeToggle as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('toggleLearningMode', handleLearningModeToggle as EventListener);
    };
  }, [conversationId, toggleLearningModeMutation]);

  // Find the selected reasoning template
  const selectedTemplate = REASONING_TEMPLATES.find(t => t.id === reasoningTemplate) || REASONING_TEMPLATES[0];
  
  // Get the last assistant message for thought tree visualization
  const lastAssistantMessageContent = getLastAssistantMessage();
  
  return (
    <div className="relative">
      <div className="flex flex-col">
        <ChatInterface 
          messages={messages} 
          isLoading={sendMessageMutation.isPending} 
          onSendMessage={handleSendMessage}
          reasoningMode={reasoningMode}
          setReasoningMode={setReasoningMode}
          onToggleSidebar={toggleSidebar}
          isListening={isListening}
          setIsListening={setIsListening}
          isSpeaking={isSpeaking}
          setIsSpeaking={setIsSpeaking}
          onSpeechRecognized={handleSpeechRecognized}
          lastAssistantMessage={lastAssistantMessageContent}
          onClearConversation={handleClearConversation}
          onSummarizeResponse={handleSummarizeResponse}
          onOpenKeyboardShortcuts={() => setShortcutsModalOpen(true)}
          onGenerateNvidiaPrompt={generateRandomNvidiaPrompt}
          learningModeEnabled={learningModeEnabled}
          setLearningModeEnabled={setLearningModeEnabled}
        />

        {reasoningMode && (
          <div className="mx-auto w-full max-w-3xl px-4 mb-6">
            <div className="flex items-center justify-between mb-2 mt-4">
              <div className="flex items-center">
                <BrainCircuit className="w-5 h-5 mr-2 text-nvidia-green" />
                <h3 className="text-lg font-medium text-nvidia-light">Reasoning Visualization</h3>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex bg-[#1A1A1A] p-1 rounded-md border border-[#333] mr-2">
                  <Button 
                    variant={visualizationType === "tree" ? "default" : "ghost"}
                    size="sm"
                    className={`text-sm ${visualizationType === "tree" ? "bg-nvidia-green text-black" : "text-gray-400"}`}
                    onClick={() => {
                      setVisualizationType("tree");
                      setShowThoughtTree(true);
                      setShowReasoningTimeline(false);
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Tree
                  </Button>
                  <Button 
                    variant={visualizationType === "timeline" ? "default" : "ghost"}
                    size="sm"
                    className={`text-sm ${visualizationType === "timeline" ? "bg-nvidia-green text-black" : "text-gray-400"}`}
                    onClick={() => {
                      setVisualizationType("timeline");
                      setShowThoughtTree(false);
                      setShowReasoningTimeline(true);
                    }}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Timeline
                  </Button>
                </div>
                <CustomReasoningTemplates 
                  currentTemplate={reasoningTemplate}
                  onTemplateChange={setReasoningTemplate}
                />
              </div>
            </div>
            
            {/* Toggle button to show/hide the visualization */}
            <div className="flex justify-end mb-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-sm text-nvidia-light"
                onClick={() => {
                  if (visualizationType === "tree") {
                    setShowThoughtTree(prev => !prev);
                  } else {
                    setShowReasoningTimeline(prev => !prev);
                  }
                }}
              >
                {(visualizationType === "tree" && showThoughtTree) || 
                 (visualizationType === "timeline" && showReasoningTimeline) 
                  ? "Hide Visualization" 
                  : "Show Visualization"}
              </Button>
            </div>
            
            {/* Thought Tree Visualization */}
            {showThoughtTree && lastAssistantMessageContent && visualizationType === "tree" && (
              <ThoughtTreeExplorer
                content={lastAssistantMessageContent}
                isVisible={showThoughtTree}
                reasoningType={selectedTemplate.name}
                isLoading={sendMessageMutation.isPending}
              />
            )}
            
            {/* Reasoning Timeline Visualization */}
            {showReasoningTimeline && lastAssistantMessageContent && visualizationType === "timeline" && (
              <EnhancedReasoningTimeline
                content={lastAssistantMessageContent}
                isVisible={showReasoningTimeline}
                reasoningType={selectedTemplate.name}
                isLoading={sendMessageMutation.isPending}
              />
            )}
          </div>
        )}
      </div>
      
      {/* Conversation Tree and Model Settings Buttons */}
      <div className="fixed right-6 top-24 z-30 flex flex-col gap-2">
        {/* Model Settings Button - Always visible */}
        <Sheet open={modelSettingsOpen} onOpenChange={setModelSettingsOpen}>
          <SheetTrigger asChild>
            <Button
              variant={modelSettingsOpen ? "default" : "outline"}
              size="sm"
              className={`${modelSettingsOpen ? "bg-nvidia-green text-black" : "bg-[#1A1A1A] border-[#333]"} hover:bg-[#232323] p-2 shadow-lg flex items-center w-full`}
              title="AI Model Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${modelSettingsOpen ? "text-black" : "text-nvidia-green"}`}>
                <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                <rect x="9" y="9" width="6" height="6"></rect>
                <path d="M15 2v2"></path>
                <path d="M15 20v2"></path>
                <path d="M2 15h2"></path>
                <path d="M2 9h2"></path>
                <path d="M20 15h2"></path>
                <path d="M20 9h2"></path>
                <path d="M9 2v2"></path>
                <path d="M9 20v2"></path>
              </svg>
              <span className="ml-2">Models</span>
            </Button>
          </SheetTrigger>
          
          {/* Sheet content */}
          <SheetContent className="w-full md:max-w-md overflow-y-auto bg-[#111] border-l border-[#333]">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-xl font-bold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-nvidia-green">
                  <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                  <rect x="9" y="9" width="6" height="6"></rect>
                  <path d="M15 2v2"></path>
                  <path d="M15 20v2"></path>
                  <path d="M2 15h2"></path>
                  <path d="M2 9h2"></path>
                  <path d="M20 15h2"></path>
                  <path d="M20 9h2"></path>
                  <path d="M9 2v2"></path>
                  <path d="M9 20v2"></path>
                </svg>
                Model Settings
              </SheetTitle>
            </SheetHeader>
            <div className="pb-4">
              <ModelSelector 
                selectedModelId={selectedModelId}
                onModelChange={(modelId) => {
                  setSelectedModelId(modelId);
                  toast({
                    title: "Model Updated",
                    description: "Your next messages will use the selected model.",
                    variant: "default",
                  });
                }}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Conversation Tree related buttons - Only visible when a conversation exists */}
        {conversationId && (
          <>
            <div className="relative">
              {activeBranchId && (
                <div className="absolute -right-2 -top-2 z-10 w-4 h-4 bg-nvidia-green rounded-full border border-black" 
                  title="You are currently on a branch"></div>
              )}
              <Button
                variant={showConversationTree ? "default" : "outline"}
                size="sm"
                className={`${showConversationTree ? "bg-nvidia-green text-black" : "bg-[#1A1A1A] border-[#333]"} hover:bg-[#232323] p-2 shadow-lg flex items-center w-full`}
                onClick={() => setShowConversationTree(prev => !prev)}
                title={showConversationTree ? "Hide Conversation Explorer" : "Show Conversation Explorer"}
              >
                <TreeDeciduous className={`h-5 w-5 ${showConversationTree ? "text-black" : "text-nvidia-green"}`} />
                <span className="ml-2">{showConversationTree ? "Hide" : "Branches"}</span>
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="branch-button new-branch-button bg-[#1A1A1A] border-[#333] hover:bg-[#232323] p-2 shadow-lg flex items-center w-full"
              onClick={() => {
                // Find the latest assistant message for branching
                const lastAssistantMessage = [...messages]
                  .reverse()
                  .find(msg => msg.role === "assistant");
                
                if (lastAssistantMessage) {
                  setSelectedMessageId(lastAssistantMessage.id);
                  setBranchDialogOpen(true);
                } else {
                  // If no assistant message, use system message
                  const systemMessage = messages.find(msg => msg.role === "system");
                  if (systemMessage) {
                    setSelectedMessageId(systemMessage.id);
                    setBranchDialogOpen(true);
                  }
                }
              }}
              title="Create a new branch from the last assistant message"
              data-branch-tip="Create a new conversation branch"
            >
              <GitBranch className="h-5 w-5 text-nvidia-green" />
              <span className="ml-2">New Branch</span>
            </Button>
          </>
        )}
      </div>
      
      {/* Conversation Tree Panel */}
      {conversationId && showConversationTree && (
        <div className="fixed right-6 top-36 z-20 w-72 animate-in fade-in slide-in-from-right duration-300">
          <div className="shadow-[0_0_15px_rgba(118,185,0,0.3)] rounded-md overflow-hidden">
            <ConversationTree
              conversationId={conversationId}
              onMessageSelect={(messageId) => {
                setSelectedMessageId(messageId);
                // Open a dialog to create a branch from this message
                setBranchDialogOpen(true);
              }}
              onBranchSelect={handleBranchSelect}
              onBookmarkSelect={handleBookmarkSelect}
              className="shadow-lg"
            />
          </div>
          <div className="mt-2 bg-[#1A1A1A] border border-[#333] rounded-md p-2 text-xs text-nvidia-light">
            <div className="flex items-center mb-1">
              <GitBranch className="h-3 w-3 mr-1 text-nvidia-green" />
              <span className="text-nvidia-green font-medium">Branch Tip:</span>
            </div>
            Select any message and click "Branch" to create an alternate conversation path.
          </div>
        </div>
      )}
      
      {/* Branch Dialog */}
      <BranchDialog
        open={branchDialogOpen}
        onOpenChange={setBranchDialogOpen}
        conversationId={conversationId || ""}
        parentMessageId={selectedMessageId}
        onBranchCreated={handleBranchCreated}
      />
      
      {/* Bookmark Dialog */}
      <BookmarkDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        messageId={selectedMessageId}
        conversationId={conversationId || ""}
        branchId={activeBranchId}
        onBookmarkCreated={handleBookmarkCreated}
      />
      
      <ProductivitySidebar
        isOpen={sidebarOpen}
        onClose={toggleSidebar}
        onUsePrompt={handleUsePrompt}
        onSummarizeResponse={handleSummarizeResponse}
        conversationId={conversationId || "current"}
      />
      
      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onOpenChange={setShortcutsModalOpen}
        shortcuts={getShortcutDescriptions()}
      />
    </div>
  );
};

export default Chat;

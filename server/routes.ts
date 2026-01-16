import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertMessageSchema, 
  insertConversationSchema,
  insertBranchSchema,
  insertBookmarkSchema,
  insertReasoningExplanationSchema,
  ReasoningStep,
  chatRequestSchema,
  ChatRequest,
  ChatResponse
} from "@shared/schema";

// Define tool call schema
const toolCallSchema = z.object({
  id: z.string(),
  tool_name: z.string(),
  status: z.enum(['started', 'completed', 'failed']).optional(),
  args: z.record(z.any()),
  output: z.any().optional()
});

// Tool call type
type ToolCall = z.infer<typeof toolCallSchema>;
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import OpenAI from "openai";
import axios from "axios";
import { z } from "zod";
import { toolRegistry, initializeToolRegistry } from "./tools";

// NVIDIA AI client for chat completions
const nvidiaAI = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

// Standard OpenAI client for Whisper API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.NVIDIA_API_KEY,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes prefix
  const apiRouter = "/api";

  // Chat completion endpoint
  app.post(`${apiRouter}/chat`, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = chatRequestSchema.parse(req.body);
      const { message, conversationId, reasoningMode, systemPrompt, parentMessageId, branchId, modelId } = validatedData;

      let activeConversationId = conversationId;
      let activeBranchId: string | null = branchId || null;

      // Create a new conversation if conversationId is not provided
      if (!activeConversationId) {
        const newConversation = await storage.createConversation({
          title: message.substring(0, 30) + (message.length > 30 ? '...' : '')
        });
        activeConversationId = String(newConversation.id);
        
        // Create default branch for new conversation
        const defaultBranch = await storage.createBranch({
          name: "Main Branch",
          conversationId: activeConversationId,
          isActive: 1,
          rootMessageId: null
        });
        
        activeBranchId = String(defaultBranch.id);
      } 
      // If we have a conversation but no branch specified, get or create the active branch
      else if (!activeBranchId) {
        const activeBranch = await storage.getActiveBranch(activeConversationId);
        
        if (activeBranch) {
          activeBranchId = String(activeBranch.id);
        } else {
          // Create a new default branch if none exists
          const newBranch = await storage.createBranch({
            name: "Main Branch",
            conversationId: activeConversationId,
            isActive: 1,
            rootMessageId: null
          });
          activeBranchId = String(newBranch.id);
        }
      }
      
      // If parent message ID is provided, we're creating a new branch
      if (parentMessageId && activeBranchId) {
        const parentMessage = await storage.getMessageById(parentMessageId);
        
        if (parentMessage) {
          // Create a new branch if requested to branch from a specific message
          const sourceBranchId = branchId;
          if (!sourceBranchId) {
            // If we're branching but not providing a source branch, create a new one
            const newBranch = await storage.createBranch({
              name: `Branch from "${parentMessage.content.substring(0, 20)}${parentMessage.content.length > 20 ? '...' : ''}"`,
              conversationId: activeConversationId,
              isActive: 1, // Make this the active branch
              rootMessageId: parentMessageId
            });
            
            activeBranchId = String(newBranch.id);
          }
        }
      }

      // Store user message
      const userMessage = await storage.createMessage({
        role: "user",
        content: message,
        conversationId: activeConversationId,
        branchId: activeBranchId,
        // parentId is handled internally in storage
      });

      try {
        // Get messages to include in the context based on branch
        let previousMessages: any[] = [];
        
        if (parentMessageId) {
          // If we're branching, get messages up to the parent message
          const allMessages = await storage.getMessagesByConversationId(activeConversationId);
          
          // Function to build the message chain from parent to root
          const buildMessageChain = (messages: any[], parentId: number | null, chain: any[] = []): any[] => {
            if (!parentId) return chain;
            
            const parentMsg = messages.find(m => m.id === parentId);
            if (!parentMsg) return chain;
            
            return buildMessageChain(messages, parentMsg.parentId, [parentMsg, ...chain]);
          };
          
          // Build the message chain starting from the parent message
          previousMessages = buildMessageChain(allMessages, parentMessageId, []);
        } else if (activeBranchId) {
          // Get messages for the specific branch
          previousMessages = await storage.getMessagesByBranch(activeConversationId, activeBranchId);
        } else {
          // Fallback to all conversation messages
          previousMessages = await storage.getMessagesByConversationId(activeConversationId);
        }
          
        // Create system prompt based on reasoning mode and custom template if provided
        let finalSystemPrompt: string = systemPrompt || (reasoningMode 
          ? "You are JensenGPT, a helpful assistant powered by NVIDIA's Llama 3.1 Nemotron Ultra. Your responses should be accurate, helpful, and occasionally reference NVIDIA technology or Jensen Huang in a tasteful way. IMPORTANT: When generating responses, you must extensively show your thought process, reasoning through multiple angles of the question before reaching a conclusion. Always explain your thinking step by step."
          : "You are JensenGPT, a helpful assistant powered by NVIDIA's Llama 3.1 Nemotron Ultra. Your responses should be accurate, helpful, and occasionally reference NVIDIA technology or Jensen Huang in a tasteful way. Keep your responses concise and direct without showing your detailed reasoning process.");
        
        // Ensure system prompt is never undefined
        if (!finalSystemPrompt) {
          console.warn("System prompt was undefined, using default prompt instead");
          finalSystemPrompt = "You are JensenGPT, a helpful assistant powered by NVIDIA's Llama 3.1 Nemotron Ultra.";
        }
          
        // Create the messages array for the API call
        const apiMessages = [
          { role: "system" as const, content: finalSystemPrompt },
          // Include previous messages (limited to last 10 for context)
          ...previousMessages.slice(-10).map(msg => {
            // Define allowed roles based on OpenAI's requirements
            const role = (msg.role === "system" || msg.role === "user" || msg.role === "assistant") 
              ? msg.role 
              : "assistant"; // Fallback in case of unknown role
            
            return {
              role: role as "system" | "user" | "assistant",
              content: msg.content
            };
          }),
          // Always include the latest message
          { role: "user" as const, content: message }
        ];
        
        // Call NVIDIA's API with the selected model (or default to Llama 3.1 Nemotron Ultra)
        const stream = await nvidiaAI.chat.completions.create({
          model: modelId || "nvidia/llama-3.1-nemotron-ultra-253b-v1",
          messages: apiMessages,
          temperature: 0.6,
          top_p: 0.95,
          max_tokens: 4096,
          frequency_penalty: 0,
          presence_penalty: 0,
          stream: true
        });

        // Set up appropriate headers for streaming
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let fullContent = '';

        // Process the stream
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullContent += content;
          
          if (content) {
            // Send each chunk to the client
            const chunkData = {
              content,
              isComplete: false,
              conversationId: activeConversationId
            };
            
            // Ensure we're writing complete JSON objects with proper line endings
            res.write(JSON.stringify(chunkData) + '\n');
          }
        }

        // Store the complete assistant message
        const assistantMessage = await storage.createMessage({
          role: "assistant",
          content: fullContent,
          conversationId: activeConversationId,
          branchId: activeBranchId,
          // parentId is handled internally in storage
        });

        // Send final message indicating completion
        const completionData = {
          content: '',
          isComplete: true,
          message: fullContent,
          conversationId: activeConversationId,
          messageId: assistantMessage.id,
          branchId: activeBranchId
        };
        
        res.write(JSON.stringify(completionData) + '\n');
        
        // End the response
        res.end();
      } catch (error) {
        console.error("NVIDIA API Error:", error);
        return res.status(500).json({ 
          message: "Error communicating with the NVIDIA API. Please try again.",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      // Handle validation errors
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Chat API Error:", error);
      return res.status(500).json({ 
        message: "An unexpected error occurred. Please try again.",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Simple in-memory cache for messages
  const messagesCache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_TTL = 10000; // 10 seconds in milliseconds
  
  // Get messages by conversation ID
  app.get(`${apiRouter}/conversations/:id/messages`, async (req: Request, res: Response) => {
    const { id } = req.params;
    const cacheKey = `messages-${id}`;
    
    // Check cache first
    const cachedData = messagesCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
      console.log(`[express] Serving cached messages for conversation ${id}`);
      return res.json(cachedData.data);
    }
    
    try {
      const messages = await storage.getMessagesByConversationId(id);
      
      // Store in cache
      messagesCache.set(cacheKey, {
        data: messages,
        timestamp: now
      });
      
      return res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      return res.status(500).json({ 
        message: "An error occurred while fetching messages",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Create a simple in-memory cache with TTL
const cache = {
  data: new Map<string, any>(),
  timestamps: new Map<string, number>(),
  ttl: 30000, // 30 seconds TTL
  
  get(key: string): any | null {
    if (!this.data.has(key)) return null;
    
    const timestamp = this.timestamps.get(key) || 0;
    const now = Date.now();
    
    // Check if cache entry has expired
    if (now - timestamp > this.ttl) {
      this.data.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    
    return this.data.get(key);
  },
  
  set(key: string, value: any): void {
    this.data.set(key, value);
    this.timestamps.set(key, Date.now());
  },
  
  invalidate(keyPrefix: string): void {
    // Delete all keys that start with the prefix
    // Convert iterators to arrays to avoid TypeScript issues
    const keys = Array.from(this.data.keys());
    keys.forEach(key => {
      if (key.startsWith(keyPrefix)) {
        this.data.delete(key);
        this.timestamps.delete(key);
      }
    });
  }
};

// Get all conversations
  app.get(`${apiRouter}/conversations`, async (_req: Request, res: Response) => {
    try {
      // Check if we have a cached response
      const cacheKey = 'conversations';
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        console.log('Returning cached conversations data');
        return res.json(cachedData);
      }
      
      // Fetch fresh data if not cached
      const conversations = await storage.getConversations();
      
      // Cache the result
      cache.set(cacheKey, conversations);
      
      return res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return res.status(500).json({ 
        message: "An error occurred while fetching conversations",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Create a new conversation
  app.post(`${apiRouter}/conversations`, async (req: Request, res: Response) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      
      // Invalidate conversations cache when a new conversation is created
      cache.invalidate('conversations');
      
      return res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error creating conversation:", error);
      return res.status(500).json({ 
        message: "An error occurred while creating the conversation",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Delete a conversation
  app.delete(`${apiRouter}/conversations/:id`, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const success = await storage.deleteConversation(id);
      if (success) {
        // Invalidate conversations cache when a conversation is deleted
        cache.invalidate('conversations');
        return res.status(204).send();
      } else {
        return res.status(404).json({ message: "Conversation not found" });
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return res.status(500).json({ 
        message: "An error occurred while deleting the conversation",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Text-to-speech with ElevenLabs API
  const textToSpeechSchema = z.object({
    text: z.string().min(1).max(5000),
    voiceId: z.string().optional()
  });
  
  app.post(`${apiRouter}/text-to-speech`, async (req: Request, res: Response) => {
    try {
      // Check if API key is configured
      if (!process.env.ELEVENLABS_API_KEY) {
        console.error("ELEVENLABS_API_KEY is not configured");
        return res.status(500).json({
          message: "Text-to-speech service is not configured. Please add an ELEVENLABS_API_KEY.",
          error: "Missing API key",
        });
      }
      
      // Validate request
      const validatedData = textToSpeechSchema.parse(req.body);
      const { text, voiceId = "gysei8F9BLZlXMpnqKrO" } = validatedData; // Use default voice ID if not provided
      
      // Limit text length to prevent ElevenLabs errors (they have token limits)
      const maxLength = 4000;
      let processedText = text;
      if (text.length > maxLength) {
        console.warn(`Text exceeds ${maxLength} characters, truncating`);
        processedText = text.substring(0, maxLength) + "...";
      }
      
      // Clean the text for better speech output (comprehensive markdown cleaning)
      const cleanedText = processedText
        // Remove code blocks completely
        .replace(/```[\s\S]*?```/g, "Code block omitted. ")
        // Remove incomplete code blocks
        .replace(/```.*$/gm, "Code block omitted. ")
        // Remove inline code
        .replace(/`([^`]+)`/g, "$1")
        // Remove images and keep the alt text
        .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
        // Replace links with just their text
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        // Remove heading markers
        .replace(/#{1,6}\s+/g, "")
        // Remove bold and italic formatting
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/_(.*?)_/g, "$1")
        // Remove horizontal rules
        .replace(/---+/g, "")
        // Handle lists - converting them to simple text with bullets
        .replace(/^\s*[-*+]\s+/gm, "• ")
        .replace(/^\s*\d+\.\s+/gm, "• ")
        // Replace multiple newlines with periods and space
        .replace(/\n\n+/g, ". ")
        // Replace single newlines with spaces
        .replace(/\n/g, " ")
        // Replace multiple spaces with single spaces
        .replace(/\s+/g, " ")
        // Clean up multiple periods
        .replace(/\.+/g, ".")
        .replace(/\.\s+\./g, ".")
        .replace(/\,\s+\./g, ".")
        // Ensure proper spacing after punctuation
        .replace(/\.(?=[A-Za-z])/g, ". ")
        .replace(/\,(?=[A-Za-z])/g, ", ")
        .trim();
      
      // Set up headers for ElevenLabs API
      const headers = {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      };
      
      // Request options - adjusted for optimal quality
      const requestData = {
        text: cleanedText,
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability: 0.6, // Slightly increased for more consistent output
          similarity_boost: 0.8, // Increased for better voice match
          style: 0.1, // Slight style boost
          use_speaker_boost: true
        }
      };
      
      console.log("Sending text-to-speech request to ElevenLabs");
      
      // Make request to ElevenLabs API with timeout
      const elevenLabsResponse = await axios({
        method: 'post',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        data: requestData,
        headers: headers,
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      });
      
      // Check if we got a valid audio response
      if (!elevenLabsResponse.data || elevenLabsResponse.data.byteLength === 0) {
        throw new Error("Received empty audio data from ElevenLabs");
      }
      
      console.log(`Successfully received audio response (${elevenLabsResponse.data.byteLength} bytes)`);
      
      // Set response headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="speech.mp3"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      // Send the audio data
      res.send(elevenLabsResponse.data);
      
    } catch (error: any) {
      // Handle validation errors
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.error("Text-to-speech validation error:", validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Handle axios errors more specifically
      if (axios.isAxiosError(error)) {
        console.error(`ElevenLabs API error: ${error.code} ${error.message}`);
        
        // Check for specific error conditions
        if (error.response) {
          // Server responded with error status
          const statusCode = error.response.status;
          let errorMessage = `ElevenLabs API returned status ${statusCode}`;
          
          if (statusCode === 401 || statusCode === 403) {
            errorMessage = "Invalid or missing ElevenLabs API key. Please check your credentials.";
          } else if (statusCode === 429) {
            errorMessage = "ElevenLabs API rate limit exceeded. Please try again later.";
          } else if (statusCode >= 500) {
            errorMessage = "ElevenLabs service is currently unavailable. Please try again later.";
          }
          
          return res.status(502).json({ message: errorMessage });
        } else if (error.request) {
          // Request was made but no response received
          return res.status(504).json({ 
            message: "No response received from ElevenLabs API. Please try again later.",
          });
        }
      }
      
      // Generic error handler
      console.error("Text-to-speech API Error:", error);
      return res.status(500).json({ 
        message: "An error occurred with the text-to-speech service. Please try again.",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Speech recognition with OpenAI Whisper API
  const speechToTextSchema = z.object({
    audioData: z.string().min(1) // Base64 encoded audio data
  });
  
  app.post(`${apiRouter}/speech-to-text`, async (req: Request, res: Response) => {
    try {
      // Check if API key is configured
      if (!process.env.OPENAI_API_KEY && !process.env.NVIDIA_API_KEY) {
        console.error("OPENAI_API_KEY is not configured");
        return res.status(500).json({
          message: "Speech-to-text service is not configured. Please add an OPENAI_API_KEY.",
          error: "Missing API key",
        });
      }
      
      // Validate request
      const validatedData = speechToTextSchema.parse(req.body);
      const { audioData } = validatedData;
      
      try {
        // Decode the base64 string to a Buffer
        const audioBuffer = Buffer.from(audioData.split(',')[1], 'base64');
        
        // Create a blob object from the buffer
        const blob = new Blob([audioBuffer], { type: 'audio/webm' });
        
        // Create a file for OpenAI transcription API
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        
        console.log("Sending audio to OpenAI Whisper API");
        
        // Use the OpenAI client to transcribe the audio
        const transcription = await openai.audio.transcriptions.create({
          file,
          model: "whisper-1",
          language: "en",
        });
        
        console.log("Received transcription:", transcription.text);
        
        // Return the transcription
        return res.json({
          text: transcription.text,
          success: true
        });
      } catch (error) {
        console.error("Speech recognition error:", error);
        return res.status(500).json({
          message: "Error transcribing audio. Please try again.",
          error: error instanceof Error ? error.message : String(error),
          success: false
        });
      }
    } catch (error) {
      // Handle validation errors
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: validationError.message,
          success: false
        });
      }
      
      console.error("Speech-to-text API Error:", error);
      return res.status(500).json({ 
        message: "An error occurred with the speech-to-text service. Please try again.",
        error: error instanceof Error ? error.message : String(error),
        success: false
      });
    }
  });

  // BRANCH MANAGEMENT ROUTES
  
  // Get branches by conversation ID
  app.get(`${apiRouter}/conversations/:id/branches`, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const branches = await storage.getBranchesByConversationId(id);
      console.log("GET /conversations/:id/branches returning:", JSON.stringify(branches));
      return res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      return res.status(500).json({ 
        message: "An error occurred while fetching branches",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get active branch for a conversation
  app.get(`${apiRouter}/conversations/:id/branches/active`, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const branch = await storage.getActiveBranch(id);
      if (!branch) {
        return res.status(404).json({ message: "No active branch found for this conversation" });
      }
      return res.json(branch);
    } catch (error) {
      console.error("Error fetching active branch:", error);
      return res.status(500).json({ 
        message: "An error occurred while fetching the active branch",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Create a new branch
  app.post(`${apiRouter}/branches`, async (req: Request, res: Response) => {
    try {
      const validatedData = insertBranchSchema.parse(req.body);
      const branch = await storage.createBranch(validatedData);
      return res.status(201).json(branch);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error creating branch:", error);
      return res.status(500).json({ 
        message: "An error occurred while creating the branch",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Update branch name
  app.patch(`${apiRouter}/branches/:id/name`, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: "Name is required" });
    }
    
    try {
      const branch = await storage.updateBranchName(id, name);
      return res.json(branch);
    } catch (error) {
      console.error("Error updating branch name:", error);
      return res.status(500).json({ 
        message: "An error occurred while updating the branch name",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Set active branch
  app.post(`${apiRouter}/branches/:id/active`, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const branch = await storage.setActiveBranch(id);
      return res.json(branch);
    } catch (error) {
      console.error("Error setting active branch:", error);
      return res.status(500).json({ 
        message: "An error occurred while setting the active branch",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Delete a branch
  app.delete(`${apiRouter}/branches/:id`, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const success = await storage.deleteBranch(id);
      if (success) {
        return res.status(204).send();
      } else {
        return res.status(404).json({ message: "Branch not found" });
      }
    } catch (error) {
      console.error("Error deleting branch:", error);
      return res.status(500).json({ 
        message: "An error occurred while deleting the branch",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // BOOKMARK MANAGEMENT ROUTES
  
  // Get bookmarks by conversation ID
  app.get(`${apiRouter}/conversations/:id/bookmarks`, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const bookmarks = await storage.getBookmarksByConversationId(id);
      return res.json(bookmarks);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      return res.status(500).json({ 
        message: "An error occurred while fetching bookmarks",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Create a new bookmark
  // Learning Mode toggle endpoint
  app.patch(`${apiRouter}/conversations/:id/learning-mode`, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { enabled } = req.body;
    
    try {
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: "The 'enabled' field must be a boolean value" });
      }
      
      const updatedConversation = await storage.toggleLearningMode(id, enabled);
      
      // Invalidate conversations cache
      cache.invalidate(`conversations`);
      cache.invalidate(`conversation-${id}`);
      
      return res.json(updatedConversation);
    } catch (error) {
      console.error("Error toggling learning mode:", error);
      return res.status(500).json({ 
        message: "An error occurred while toggling learning mode",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get an individual message with reasoning steps
  app.get(`${apiRouter}/messages/:id`, async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
      const message = await storage.getMessageById(parseInt(id));
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      return res.json(message);
    } catch (error) {
      console.error("Error fetching message:", error);
      return res.status(500).json({ 
        message: "An error occurred while fetching the message",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Add reasoning steps to a message
  app.post(`${apiRouter}/messages/:id/reasoning-steps`, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { steps } = req.body;
    
    try {
      if (!Array.isArray(steps)) {
        return res.status(400).json({ message: "The 'steps' field must be an array" });
      }
      
      const updatedMessage = await storage.updateMessageReasoningSteps(parseInt(id), steps);
      
      // Invalidate message cache
      cache.invalidate(`message-${id}`);
      
      return res.json(updatedMessage);
    } catch (error) {
      console.error("Error updating reasoning steps:", error);
      return res.status(500).json({ 
        message: "An error occurred while updating reasoning steps",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Add an explanation to a reasoning step
  app.post(`${apiRouter}/messages/:messageId/reasoning-steps/:stepIndex/explain`, async (req: Request, res: Response) => {
    const { messageId, stepIndex } = req.params;
    const { question } = req.body;
    
    try {
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "The 'question' field must be a non-empty string" });
      }
      
      // Get the message
      const message = await storage.getMessageById(parseInt(messageId));
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Generate an explanation using the NVIDIA API
      const apiResponse = await nvidiaAI.chat.completions.create({
        model: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
        messages: [
          { 
            role: "system",
            content: "You are an AI learning assistant. Your task is to explain reasoning steps in detail to help the user understand AI thinking processes."
          },
          { 
            role: "user",
            content: `Here is a reasoning step from an AI response: "${message.reasoningSteps?.[parseInt(stepIndex)]?.content || 'Unknown step'}". The user asks: "${question}". Please provide a clear, detailed explanation.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1024
      });
      
      const explanation = apiResponse.choices[0]?.message.content || "I'm unable to generate an explanation at this time.";
      
      // Save the explanation
      const newExplanation = await storage.createReasoningExplanation({
        messageId: parseInt(messageId),
        stepIndex: parseInt(stepIndex),
        question,
        content: explanation
      });
      
      return res.json(newExplanation);
    } catch (error) {
      console.error("Error creating explanation:", error);
      return res.status(500).json({ 
        message: "An error occurred while creating the explanation",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get explanations for a reasoning step
  app.get(`${apiRouter}/messages/:messageId/reasoning-steps/:stepIndex/explanations`, async (req: Request, res: Response) => {
    const { messageId } = req.params;
    
    try {
      const explanations = await storage.getReasoningExplanationsByMessageId(parseInt(messageId));
      
      // Filter explanations by stepIndex if provided
      const filteredExplanations = (req.params.stepIndex) 
        ? explanations.filter(exp => exp.stepIndex === parseInt(req.params.stepIndex))
        : explanations;
      
      return res.json(filteredExplanations);
    } catch (error) {
      console.error("Error fetching explanations:", error);
      return res.status(500).json({ 
        message: "An error occurred while fetching explanations",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Get conversation details
  app.get(`${apiRouter}/conversations/:id`, async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
      const cacheKey = `conversation-${id}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Cache the result
      cache.set(cacheKey, conversation);
      
      return res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ 
        message: "An error occurred while fetching the conversation",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post(`${apiRouter}/bookmarks`, async (req: Request, res: Response) => {
    try {
      const validatedData = insertBookmarkSchema.parse(req.body);
      const bookmark = await storage.createBookmark(validatedData);
      return res.status(201).json(bookmark);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error creating bookmark:", error);
      return res.status(500).json({ 
        message: "An error occurred while creating the bookmark",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Update bookmark name
  app.patch(`${apiRouter}/bookmarks/:id/name`, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: "Name is required" });
    }
    
    try {
      const bookmark = await storage.updateBookmarkName(id, name);
      return res.json(bookmark);
    } catch (error) {
      console.error("Error updating bookmark name:", error);
      return res.status(500).json({ 
        message: "An error occurred while updating the bookmark name",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Delete a bookmark
  app.delete(`${apiRouter}/bookmarks/:id`, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const success = await storage.deleteBookmark(id);
      if (success) {
        return res.status(204).send();
      } else {
        return res.status(404).json({ message: "Bookmark not found" });
      }
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      return res.status(500).json({ 
        message: "An error occurred while deleting the bookmark",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get messages by branch
  app.get(`${apiRouter}/conversations/:conversationId/branches/:branchId/messages`, async (req: Request, res: Response) => {
    const { conversationId, branchId } = req.params;
    const cacheKey = `branch-messages-${conversationId}-${branchId}`;
    
    // Check cache first
    const cachedData = messagesCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
      console.log(`[express] Serving cached branch messages for conversation ${conversationId}, branch ${branchId}`);
      return res.json(cachedData.data);
    }
    
    try {
      const messages = await storage.getMessagesByBranch(conversationId, branchId);
      
      // Store in cache
      messagesCache.set(cacheKey, {
        data: messages,
        timestamp: now
      });
      
      return res.json(messages);
    } catch (error) {
      console.error("Error fetching branch messages:", error);
      return res.status(500).json({ 
        message: "An error occurred while fetching branch messages",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==================== TOOL INTEGRATION ENDPOINTS ====================
  
  // Initialize the tool registry
  initializeToolRegistry();
  
  // Get all available tools
  app.get(`${apiRouter}/tools`, async (_req: Request, res: Response) => {
    try {
      const tools = toolRegistry.getAllTools();
      return res.json(tools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      return res.status(500).json({ 
        message: "An error occurred while fetching available tools",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get tools by category
  app.get(`${apiRouter}/tools/category/:categoryId`, async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    try {
      const tools = toolRegistry.getToolsByCategory(categoryId);
      return res.json(tools);
    } catch (error) {
      console.error(`Error fetching tools for category ${categoryId}:`, error);
      return res.status(500).json({ 
        message: `An error occurred while fetching tools for category ${categoryId}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get a specific tool by ID
  app.get(`${apiRouter}/tools/:id`, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const tool = toolRegistry.getTool(id);
      if (!tool) {
        return res.status(404).json({ message: `Tool with ID ${id} not found` });
      }
      return res.json(tool);
    } catch (error) {
      console.error(`Error fetching tool ${id}:`, error);
      return res.status(500).json({ 
        message: `An error occurred while fetching tool ${id}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Execute a tool
  app.post(`${apiRouter}/tools/execute`, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const toolCall = toolCallSchema.parse(req.body);
      
      // Execute the tool
      const result = await toolRegistry.executeTool(toolCall);
      
      // Return the result
      return res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error executing tool:", error);
      return res.status(500).json({ 
        message: "An error occurred while executing the tool",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Execute multiple tools in batch
  app.post(`${apiRouter}/tools/execute-batch`, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const toolCalls = z.array(toolCallSchema).parse(req.body);
      
      // Execute all tool calls
      const results = await toolRegistry.executeToolCalls(toolCalls);
      
      // Return the results
      return res.json(results);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error executing tool batch:", error);
      return res.status(500).json({ 
        message: "An error occurred while executing the tool batch",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==================== COGNITIVE AUGMENTATION ENDPOINTS ====================
  
  // ---- Thought Extension Framework API Routes ----
  
  // Get all thoughts for a user
  app.get(`${apiRouter}/thoughts`, async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || 'default-user';
      
      const thoughts = await storage.getThoughtsByUserId(userId);
      return res.json(thoughts);
    } catch (error) {
      console.error("Error fetching thoughts:", error);
      return res.status(500).json({
        message: "An error occurred while fetching thoughts",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Get thoughts by conversation ID
  app.get(`${apiRouter}/conversations/:conversationId/thoughts`, async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      
      const thoughts = await storage.getThoughtsByConversationId(conversationId);
      return res.json(thoughts);
    } catch (error) {
      console.error("Error fetching thoughts for conversation:", error);
      return res.status(500).json({
        message: "An error occurred while fetching thoughts for the conversation",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Get a specific thought by ID
  app.get(`${apiRouter}/thoughts/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid thought ID" });
      }
      
      const thought = await storage.getThoughtById(id);
      if (!thought) {
        return res.status(404).json({ message: "Thought not found" });
      }
      
      return res.json(thought);
    } catch (error) {
      console.error("Error fetching thought:", error);
      return res.status(500).json({
        message: "An error occurred while fetching the thought",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Get related thoughts
  app.get(`${apiRouter}/thoughts/:id/related`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid thought ID" });
      }
      
      const relatedThoughts = await storage.getRelatedThoughts(id);
      return res.json(relatedThoughts);
    } catch (error) {
      console.error("Error fetching related thoughts:", error);
      return res.status(500).json({
        message: "An error occurred while fetching related thoughts",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Create a new thought
  app.post(`${apiRouter}/thoughts`, async (req: Request, res: Response) => {
    try {
      // Set a default user ID if not provided
      if (!req.body.userId) {
        req.body.userId = 'default-user';
      }
      
      // Validate and create the thought
      const validatedData = z.object({
        userId: z.string(),
        content: z.string(),
        type: z.enum(["concept", "question", "insight", "observation", "hypothesis", "connection"]),
        tags: z.array(z.string()),
        source: z.string().optional(),
        parentId: z.number().optional(),
        conversationId: z.string().optional(),
        extensions: z.record(z.any()).optional(),
        connections: z.record(z.any()).optional(),
        metadata: z.record(z.any()).optional()
      }).parse(req.body);
      
      const thought = await storage.createThought(validatedData);
      return res.status(201).json(thought);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error creating thought:", error);
      return res.status(500).json({
        message: "An error occurred while creating the thought",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Update a thought
  app.patch(`${apiRouter}/thoughts/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid thought ID" });
      }
      
      // Validate update data
      const validatedData = z.object({
        content: z.string().optional(),
        type: z.enum(["concept", "question", "insight", "observation", "hypothesis", "connection"]).optional(),
        tags: z.array(z.string()).optional(),
        extensions: z.record(z.any()).optional(),
        connections: z.record(z.any()).optional(),
        metadata: z.record(z.any()).optional()
      }).parse(req.body);
      
      const updatedThought = await storage.updateThought(id, validatedData);
      return res.json(updatedThought);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error updating thought:", error);
      return res.status(500).json({
        message: "An error occurred while updating the thought",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Delete a thought
  app.delete(`${apiRouter}/thoughts/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid thought ID" });
      }
      
      const success = await storage.deleteThought(id);
      if (success) {
        return res.status(204).send();
      } else {
        return res.status(404).json({ message: "Thought not found" });
      }
    } catch (error) {
      console.error("Error deleting thought:", error);
      return res.status(500).json({
        message: "An error occurred while deleting the thought",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // ---- Idea Evolution Laboratory API Routes ----
  
  // Get all ideas for a user
  app.get(`${apiRouter}/ideas`, async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || 'default-user';
      
      const ideas = await storage.getIdeasByUserId(userId);
      return res.json(ideas);
    } catch (error) {
      console.error("Error fetching ideas:", error);
      return res.status(500).json({
        message: "An error occurred while fetching ideas",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Get a specific idea by ID
  app.get(`${apiRouter}/ideas/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      const idea = await storage.getIdeaById(id);
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }
      
      return res.json(idea);
    } catch (error) {
      console.error("Error fetching idea:", error);
      return res.status(500).json({
        message: "An error occurred while fetching the idea",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Get all versions of an idea (idea evolution history)
  app.get(`${apiRouter}/ideas/:id/versions`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      const versionedIdeas = await storage.getIdeaVersions(id);
      return res.json(versionedIdeas);
    } catch (error) {
      console.error("Error fetching idea versions:", error);
      return res.status(500).json({
        message: "An error occurred while fetching idea versions",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Create a new idea
  app.post(`${apiRouter}/ideas`, async (req: Request, res: Response) => {
    try {
      // Set a default user ID if not provided
      if (!req.body.userId) {
        req.body.userId = 'default-user';
      }
      
      // Validate and create the idea
      const validatedData = z.object({
        userId: z.string(),
        title: z.string(),
        description: z.string(),
        status: z.enum(["draft", "developing", "refined", "finalized", "archived"]).optional(),
        tags: z.array(z.string()),
        version: z.number().optional(),
        parentIdeaId: z.number().optional(),
        rootIdeaId: z.number().optional(),
        evolutionPath: z.array(z.any()).optional(),
        metrics: z.record(z.any()).optional(),
        feedback: z.array(z.any()).optional(),
        metadata: z.record(z.any()).optional()
      }).parse(req.body);
      
      const idea = await storage.createIdea(validatedData);
      return res.status(201).json(idea);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error creating idea:", error);
      return res.status(500).json({
        message: "An error occurred while creating the idea",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Update an idea
  app.patch(`${apiRouter}/ideas/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      // Validate update data
      const validatedData = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "developing", "refined", "finalized", "archived"]).optional(),
        tags: z.array(z.string()).optional(),
        evolutionPath: z.array(z.any()).optional(),
        metrics: z.record(z.any()).optional(),
        feedback: z.array(z.any()).optional(),
        metadata: z.record(z.any()).optional()
      }).parse(req.body);
      
      const updatedIdea = await storage.updateIdea(id, validatedData);
      return res.json(updatedIdea);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error updating idea:", error);
      return res.status(500).json({
        message: "An error occurred while updating the idea",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Delete an idea
  app.delete(`${apiRouter}/ideas/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      const success = await storage.deleteIdea(id);
      if (success) {
        return res.status(204).send();
      } else {
        return res.status(404).json({ message: "Idea not found" });
      }
    } catch (error) {
      console.error("Error deleting idea:", error);
      return res.status(500).json({
        message: "An error occurred while deleting the idea",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // ---- Thought-Idea Relation API Routes ----
  
  // Get thoughts related to an idea
  app.get(`${apiRouter}/ideas/:id/thoughts`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid idea ID" });
      }
      
      const thoughts = await storage.getThoughtsByIdeaId(id);
      return res.json(thoughts);
    } catch (error) {
      console.error("Error fetching thoughts for idea:", error);
      return res.status(500).json({
        message: "An error occurred while fetching thoughts for the idea",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Get ideas related to a thought
  app.get(`${apiRouter}/thoughts/:id/ideas`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid thought ID" });
      }
      
      const ideas = await storage.getIdeasByThoughtId(id);
      return res.json(ideas);
    } catch (error) {
      console.error("Error fetching ideas for thought:", error);
      return res.status(500).json({
        message: "An error occurred while fetching ideas for the thought",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Create a relation between a thought and an idea
  app.post(`${apiRouter}/thoughts/:thoughtId/ideas/:ideaId`, async (req: Request, res: Response) => {
    try {
      const thoughtId = parseInt(req.params.thoughtId);
      const ideaId = parseInt(req.params.ideaId);
      
      if (isNaN(thoughtId) || isNaN(ideaId)) {
        return res.status(400).json({ message: "Invalid thought or idea ID" });
      }
      
      // Validate relation type
      const relationType = req.body.relationType || "associated";
      
      const relation = await storage.createThoughtIdeaRelation({
        thoughtId,
        ideaId,
        relationType
      });
      
      return res.status(201).json(relation);
    } catch (error) {
      console.error("Error creating thought-idea relation:", error);
      return res.status(500).json({
        message: "An error occurred while creating the thought-idea relation",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  // Delete a relation between a thought and an idea
  app.delete(`${apiRouter}/thoughts/:thoughtId/ideas/:ideaId`, async (req: Request, res: Response) => {
    try {
      const thoughtId = parseInt(req.params.thoughtId);
      const ideaId = parseInt(req.params.ideaId);
      
      if (isNaN(thoughtId) || isNaN(ideaId)) {
        return res.status(400).json({ message: "Invalid thought or idea ID" });
      }
      
      const success = await storage.deleteThoughtIdeaRelation(thoughtId, ideaId);
      if (success) {
        return res.status(204).send();
      } else {
        return res.status(404).json({ message: "Relation not found" });
      }
    } catch (error) {
      console.error("Error deleting thought-idea relation:", error);
      return res.status(500).json({
        message: "An error occurred while deleting the thought-idea relation",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

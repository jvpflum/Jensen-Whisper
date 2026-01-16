import React, { useState, useEffect } from "react";
import { 
  Bookmark, 
  StickyNote, 
  Check,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Sparkles,
  Globe,
  Search,
  Download,
  Upload,
  Tag,
  Filter,
  Copy,
  Star,
  Link2,
  BookmarkCheck as BookMarked,
  Lightbulb as LightbulbIcon,
  Puzzle as PuzzleIcon,
  BrainCircuit,
  Code,
  Zap,
  Image as ImageIcon,
  MoveVertical,
  Flame,
  Info,
  FileEdit,
  FileText,
  Mail,
  Send,
  Type,
  AlignLeft,
  TextQuote,
  Link,
  Share2,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  X,
  Pen as PenIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveButton } from "@/components/ui/interactive-button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"; 
import { Badge } from "@/components/ui/badge";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import CustomReasoningTemplates, { REASONING_TEMPLATES } from "@/components/CustomReasoningTemplates";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Types
export type PromptCategory = {
  id: string;
  name: string;
  color: string;
};

export type FavoritePrompt = {
  id: string;
  title: string;
  content: string;
  categoryId?: string;
  createdAt: number;
  starred?: boolean;
  isTemplate?: boolean;
  reasoningEnabled?: boolean;
  reasoningTemplateId?: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  tags?: string[];
  conversationId?: string;
  messageId?: number;
  messageRole?: string;
  linkedSnippets?: Array<{
    id: string;
    conversationId: string;
    messageId: number;
    content: string;
    role: string;
  }>;
};

export type KnowledgeSource = {
  id: string;
  name: string;
  type: 'wikipedia' | 'hackernews' | 'github' | 'nasa';
  description: string;
  icon: string;
};

interface ProductivitySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onUsePrompt: (prompt: string, reasoningSettings?: { enabled: boolean, templateId: string }) => void;
  onSummarizeResponse: () => void;
  conversationId?: string;
}

const ProductivitySidebar = ({ 
  isOpen, 
  onClose, 
  onUsePrompt,
  onSummarizeResponse,
  conversationId = "current"
}: ProductivitySidebarProps) => {
  // State for tabs
  const [activeTab, setActiveTab] = useState("prompts");
  
  // State for favorite prompts
  const [favoritePrompts, setFavoritePrompts] = useState<FavoritePrompt[]>([]);
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [newPromptCategory, setNewPromptCategory] = useState<string | undefined>(undefined);
  const [newPromptReasoningEnabled, setNewPromptReasoningEnabled] = useState(false);
  const [newPromptReasoningTemplate, setNewPromptReasoningTemplate] = useState("standard");
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptSearchQuery, setPromptSearchQuery] = useState("");
  const [showDeletePromptDialog, setShowDeletePromptDialog] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null);
  
  // State for prompt categories
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([
    { id: "general", name: "General", color: "#6366F1" },
    { id: "coding", name: "Coding", color: "#22C55E" },
    { id: "writing", name: "Writing", color: "#EF4444" },
    { id: "research", name: "Research", color: "#F59E0B" }
  ]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#22C55E");

  // State for notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteTags, setNewNoteTags] = useState<string[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [showDeleteNoteDialog, setShowDeleteNoteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  
  // State for knowledge sources
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([
    { 
      id: "wikipedia", 
      name: "Wikipedia", 
      type: "wikipedia", 
      description: "Search information from Wikipedia",
      icon: "Wikipedia" 
    },
    { 
      id: "hackernews", 
      name: "Hacker News", 
      type: "hackernews", 
      description: "Get tech news from Hacker News",
      icon: "News" 
    },
    { 
      id: "github", 
      name: "GitHub", 
      type: "github", 
      description: "Search public repositories on GitHub",
      icon: "Github" 
    },
    { 
      id: "nasa", 
      name: "NASA", 
      type: "nasa", 
      description: "Access NASA's open data APIs",
      icon: "Globe" 
    }
  ]);
  const [activeKnowledgeSource, setActiveKnowledgeSource] = useState<string | null>(null);
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState("");
  const [knowledgeResults, setKnowledgeResults] = useState<any[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  
  // State for import/export
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState("");
  
  // State for prompt tabs (My Prompts vs. Templates)
  const [promptTab, setPromptTab] = useState<'mine' | 'templates'>('mine');
  
  // State for content creator
  const [contentType, setContentType] = useState<'email' | 'blog' | 'social'>('email');
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [emailTone, setEmailTone] = useState<'professional' | 'friendly' | 'persuasive' | 'urgent'>('professional');
  
  const [blogTitle, setBlogTitle] = useState("");
  const [blogKeywords, setBlogKeywords] = useState("");
  const [blogSections, setBlogSections] = useState<string[]>([""]);
  const [blogStyle, setBlogStyle] = useState<'informative' | 'tutorial' | 'opinion' | 'review'>('informative');
  
  const [socialPlatform, setSocialPlatform] = useState<'twitter' | 'linkedin' | 'instagram' | 'facebook'>('twitter');
  const [socialTopic, setSocialTopic] = useState("");
  const [socialTone, setSocialTone] = useState<'casual' | 'professional' | 'humorous' | 'inspirational'>('casual');
  const [socialHashtags, setSocialHashtags] = useState("");
  
  // State for template prompts
  const [templatePrompts] = useState<FavoritePrompt[]>([
    {
      id: "template-1",
      title: "AI Model Comparison",
      content: "Compare and contrast the Llama-3.3-Nemotron-Super-49B-v1 model with other large language models like GPT-4, Claude, and other Llama models in terms of performance, inference speed, and specialized capabilities.",
      categoryId: "research",
      createdAt: Date.now() - 86400000, // 1 day ago
      isTemplate: true,
      reasoningEnabled: true,
      reasoningTemplateId: "scientific"
    },
    {
      id: "template-2",
      title: "Code Optimization",
      content: "Review the following code and suggest optimizations for better performance. Focus on algorithmic improvements, potential memory issues, and parallelization opportunities:\n\n```\n// Paste your code here\n```",
      categoryId: "coding",
      createdAt: Date.now() - 172800000, // 2 days ago
      isTemplate: true
    },
    {
      id: "template-3",
      title: "Explain Technical Concept",
      content: "Explain [technical concept] in simple terms. First provide a high-level overview for beginners, then add more technical details for someone with intermediate knowledge. Finally, include some advanced information for experts.",
      categoryId: "writing",
      createdAt: Date.now() - 259200000, // 3 days ago
      isTemplate: true,
      reasoningEnabled: true,
      reasoningTemplateId: "socratic"
    },
    {
      id: "template-4",
      title: "NVIDIA CUDA Optimization",
      content: "I'm working on optimizing a CUDA kernel for [describe purpose]. The current implementation has performance bottlenecks. Can you suggest strategies to improve memory access patterns, reduce thread divergence, and optimize register usage?",
      categoryId: "coding",
      createdAt: Date.now() - 345600000, // 4 days ago
      isTemplate: true
    },
    {
      id: "template-5",
      title: "Research Literature Review",
      content: "I'm researching [topic]. Can you help me understand the key developments in this field over the past 5 years? Please highlight the most influential papers, major breakthroughs, current challenges, and promising future directions.",
      categoryId: "research",
      createdAt: Date.now() - 432000000, // 5 days ago
      isTemplate: true,
      reasoningEnabled: true,
      reasoningTemplateId: "deductive"
    }
  ]);

  // Load saved prompts and notes from localStorage
  useEffect(() => {
    const savedPrompts = localStorage.getItem("favorite-prompts");
    if (savedPrompts) {
      // Update older prompt structures to include createdAt if missing
      const parsedPrompts = JSON.parse(savedPrompts);
      const updatedPrompts = parsedPrompts.map((prompt: any) => {
        if (!prompt.createdAt) {
          return { ...prompt, createdAt: Date.now() };
        }
        return prompt;
      });
      setFavoritePrompts(updatedPrompts);
    }

    const savedNotes = localStorage.getItem("chat-notes");
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  // Save prompts to localStorage when they change
  useEffect(() => {
    localStorage.setItem("favorite-prompts", JSON.stringify(favoritePrompts));
  }, [favoritePrompts]);

  // Save notes to localStorage when they change
  useEffect(() => {
    localStorage.setItem("chat-notes", JSON.stringify(notes));
  }, [notes]);
  
  // Create a note directly from an AI message - defined at the top to avoid the "used before declaration" error
  const createNoteFromMessage = (
    convoId: string, 
    messageId: number, 
    content: string, 
    role: string = 'assistant'
  ) => {
    // Create a title from the first line or first few words
    const firstLine = content.split('\n')[0].trim();
    const title = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
    
    const newNote: Note = {
      id: Date.now().toString(),
      title: title,
      content: content,
      timestamp: Date.now(),
      tags: [],
      conversationId: convoId,
      messageId: messageId,
      messageRole: role,
      linkedSnippets: [{
        id: `snippet-${Date.now()}`,
        conversationId: convoId,
        messageId: messageId,
        content: content,
        role: role
      }]
    };
    
    setNotes([...notes, newNote]);
    
    // Show feedback
    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'fixed bottom-4 right-4 bg-nvidia-green text-black px-4 py-2 rounded-md shadow-lg z-50';
    feedbackEl.textContent = 'Conversation saved as note!';
    document.body.appendChild(feedbackEl);
    
    setTimeout(() => {
      feedbackEl.style.opacity = '0';
      feedbackEl.style.transition = 'opacity 0.5s';
      setTimeout(() => document.body.removeChild(feedbackEl), 500);
    }, 2000);
    
    return newNote.id;
  };
  
  // Listen for saveAsNote custom events from ChatInterface
  useEffect(() => {
    const handleSaveAsNote = (event: any) => {
      const { messageId, content, role } = event.detail;
      
      // Create a note from this message using the current conversation ID from props
      createNoteFromMessage(conversationId, messageId, content, role);
      
      // Ensure the notes tab is visible
      setActiveTab("notes");
    };
    
    // Add event listener
    window.addEventListener('saveAsNote', handleSaveAsNote);
    
    // Clean up
    return () => {
      window.removeEventListener('saveAsNote', handleSaveAsNote);
    };
  }, [setActiveTab, conversationId]);

  // Functions for favorite prompts
  const addPrompt = () => {
    if (newPromptTitle.trim() && newPromptContent.trim()) {
      const newPrompt: FavoritePrompt = {
        id: Date.now().toString(),
        title: newPromptTitle,
        content: newPromptContent,
        categoryId: newPromptCategory === "none" ? undefined : newPromptCategory,
        createdAt: Date.now(),
        reasoningEnabled: newPromptReasoningEnabled,
        reasoningTemplateId: newPromptReasoningEnabled ? newPromptReasoningTemplate : undefined
      };
      setFavoritePrompts([...favoritePrompts, newPrompt]);
      setNewPromptTitle("");
      setNewPromptContent("");
      setNewPromptCategory(undefined);
      setNewPromptReasoningEnabled(false);
      setNewPromptReasoningTemplate("standard");
      setIsAddingPrompt(false);
    }
  };

  const updatePrompt = (id: string) => {
    if (newPromptTitle.trim() && newPromptContent.trim()) {
      setFavoritePrompts(
        favoritePrompts.map(prompt => 
          prompt.id === id 
            ? { 
                ...prompt, 
                title: newPromptTitle, 
                content: newPromptContent, 
                categoryId: newPromptCategory === "none" ? undefined : newPromptCategory,
                reasoningEnabled: newPromptReasoningEnabled,
                reasoningTemplateId: newPromptReasoningEnabled ? newPromptReasoningTemplate : undefined
              } 
            : prompt
        )
      );
      setNewPromptTitle("");
      setNewPromptContent("");
      setNewPromptCategory(undefined);
      setNewPromptReasoningEnabled(false);
      setNewPromptReasoningTemplate("standard");
      setEditingPromptId(null);
    }
  };

  const deletePrompt = (id: string) => {
    setFavoritePrompts(favoritePrompts.filter(prompt => prompt.id !== id));
  };

  const startEditingPrompt = (prompt: FavoritePrompt) => {
    setEditingPromptId(prompt.id);
    setNewPromptTitle(prompt.title);
    setNewPromptContent(prompt.content);
    setNewPromptCategory(prompt.categoryId || "none");
    setNewPromptReasoningEnabled(prompt.reasoningEnabled || false);
    setNewPromptReasoningTemplate(prompt.reasoningTemplateId || "standard");
  };
  
  // Toggle star on a prompt
  const toggleStarPrompt = (id: string) => {
    setFavoritePrompts(
      favoritePrompts.map(prompt => 
        prompt.id === id ? { ...prompt, starred: !prompt.starred } : prompt
      )
    );
  };
  
  // Copy prompt to clipboard
  const copyPromptToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(
      () => {
        // Flash feedback for successful copy
        const feedbackEl = document.createElement('div');
        feedbackEl.className = 'fixed bottom-4 right-4 bg-nvidia-green text-black px-4 py-2 rounded-md shadow-lg z-50';
        feedbackEl.textContent = 'Prompt copied to clipboard!';
        document.body.appendChild(feedbackEl);
        
        setTimeout(() => {
          feedbackEl.style.opacity = '0';
          feedbackEl.style.transition = 'opacity 0.5s';
          setTimeout(() => document.body.removeChild(feedbackEl), 500);
        }, 2000);
      }
    );
  };
  
  // Save template prompt to my prompts
  const saveTemplateToMyPrompts = (template: FavoritePrompt) => {
    const newPrompt: FavoritePrompt = {
      ...template,
      id: Date.now().toString(),
      createdAt: Date.now(),
      isTemplate: false
    };
    setFavoritePrompts([...favoritePrompts, newPrompt]);
    
    // Show feedback
    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'fixed bottom-4 right-4 bg-nvidia-green text-black px-4 py-2 rounded-md shadow-lg z-50';
    feedbackEl.textContent = 'Template saved to My Prompts!';
    document.body.appendChild(feedbackEl);
    
    setTimeout(() => {
      feedbackEl.style.opacity = '0';
      feedbackEl.style.transition = 'opacity 0.5s';
      setTimeout(() => document.body.removeChild(feedbackEl), 500);
    }, 2000);
  };

  // Functions for notes
  const addNote = (options?: {
    conversationId?: string,
    messageId?: number,
    messageRole?: string,
    snippetContent?: string
  }) => {
    if (newNoteTitle.trim() && newNoteContent.trim()) {
      const newNote: Note = {
        id: Date.now().toString(),
        title: newNoteTitle,
        content: newNoteContent,
        timestamp: Date.now(),
        tags: newNoteTags,
        conversationId: options?.conversationId,
        messageId: options?.messageId,
        messageRole: options?.messageRole
      };
      
      // If there's a snippet to add, create the linkedSnippets array
      if (options?.snippetContent && options.conversationId && options.messageId) {
        newNote.linkedSnippets = [{
          id: `snippet-${Date.now()}`,
          conversationId: options.conversationId,
          messageId: options.messageId,
          content: options.snippetContent,
          role: options.messageRole || 'assistant'
        }];
      }
      
      setNotes([...notes, newNote]);
      setNewNoteTitle("");
      setNewNoteContent("");
      setNewNoteTags([]);
      setIsAddingNote(false);
    }
  };
  


  const updateNote = (id: string) => {
    if (newNoteTitle.trim() && newNoteContent.trim()) {
      setNotes(
        notes.map(note => 
          note.id === id 
            ? { 
                ...note, 
                title: newNoteTitle, 
                content: newNoteContent,
                timestamp: Date.now(),
                tags: newNoteTags
              } 
            : note
        )
      );
      setNewNoteTitle("");
      setNewNoteContent("");
      setNewNoteTags([]);
      setEditingNoteId(null);
    }
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const startEditingNote = (note: Note) => {
    setEditingNoteId(note.id);
    setNewNoteTitle(note.title);
    setNewNoteContent(note.content);
    setNewNoteTags(note.tags || []);
  };

  // Format date for notes
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Filter prompts based on search query and category
  const filteredPrompts = favoritePrompts
    .filter(prompt => {
      // Filter by search query
      if (promptSearchQuery) {
        const searchLower = promptSearchQuery.toLowerCase();
        return (
          prompt.title.toLowerCase().includes(searchLower) ||
          prompt.content.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .filter(prompt => {
      // Filter by category
      if (selectedCategoryFilter) {
        return prompt.categoryId === selectedCategoryFilter;
      }
      return true;
    })
    // Sort by most recent first
    .sort((a, b) => b.createdAt - a.createdAt);

  // Filter notes based on search query
  const filteredNotes = notes
    .filter(note => {
      if (noteSearchQuery) {
        const searchLower = noteSearchQuery.toLowerCase();
        return (
          note.title.toLowerCase().includes(searchLower) ||
          note.content.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    // Sort by most recent first
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div 
      className={`fixed top-0 left-0 h-[calc(100vh-36px)] bg-[#1A1A1A] border-r border-[#333] w-[350px] transition-all duration-300 z-10 overflow-y-auto ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Toggle button */}
      <InteractiveButton
        variant="ghost"
        size="icon"
        className="absolute -right-10 top-6 bg-[#1A1A1A] border border-[#333] rounded-r-md border-l-0"
        onClick={onClose}
        onRipple={true}
        onHoverGlow={true}
        glowColor="rgba(118, 185, 0, 0.3)"
        glowIntensity={3}
        tiltIntensity={3}
      >
        {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </InteractiveButton>
      
      {/* Collapse button */}
      <InteractiveButton
        variant="ghost"
        size="icon"
        className="absolute right-2 top-4"
        onClick={onClose}
        onRipple={true}
        rippleColor="rgba(118, 185, 0, 0.3)"
      >
        <X className="h-5 w-5" />
      </InteractiveButton>

      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-[#333] bg-[#232323]">
          <h2 className="text-lg font-semibold flex items-center">
            <Bookmark className="h-5 w-5 mr-2 text-nvidia-green" />
            Productivity Tools
          </h2>
        </div>

        <Tabs defaultValue="prompts" className="flex flex-col flex-1" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mx-4 my-2">
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Knowledge
            </TabsTrigger>
          </TabsList>
          
          {/* Import/Export and Search Controls */}
          <div className="flex items-center gap-2 px-4 py-2">
            {activeTab === "prompts" && (
              <>
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search prompts..."
                    className="h-8 bg-[#232323] border-[#3A3A3A] pl-8"
                    value={promptSearchQuery}
                    onChange={(e) => setPromptSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 hover:bg-[#333]"
                  onClick={() => setShowImportDialog(true)}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 hover:bg-[#333]"
                  onClick={() => {
                    // Export prompts as JSON
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
                      JSON.stringify(favoritePrompts, null, 2)
                    );
                    const downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", dataStr);
                    downloadAnchorNode.setAttribute("download", "prompts.json");
                    document.body.appendChild(downloadAnchorNode);
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {activeTab === "notes" && (
              <>
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search notes..."
                    className="h-8 bg-[#232323] border-[#3A3A3A] pl-8"
                    value={noteSearchQuery}
                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 hover:bg-[#333]"
                  onClick={() => {
                    // Export notes as JSON
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
                      JSON.stringify(notes, null, 2)
                    );
                    const downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", dataStr);
                    downloadAnchorNode.setAttribute("download", "notes.json");
                    document.body.appendChild(downloadAnchorNode);
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {activeTab === "content" && (
              <div className="relative flex-1">
                <FileText className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Select 
                  value={contentType} 
                  onValueChange={(value) => setContentType(value as 'email' | 'blog' | 'social')}
                >
                  <SelectTrigger className="h-8 bg-[#232323] border-[#3A3A3A] pl-8">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Composer</SelectItem>
                    <SelectItem value="blog">Blog Post Generator</SelectItem>
                    <SelectItem value="social">Social Media Content</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {activeTab === "knowledge" && (
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search knowledge..."
                  className="h-8 bg-[#232323] border-[#3A3A3A] pl-8"
                  value={knowledgeSearchQuery}
                  onChange={(e) => setKnowledgeSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Favorite Prompts Tab */}
          <TabsContent value="prompts" className="flex-1 flex flex-col">
            <div className="p-2 flex gap-2">
              <InteractiveButton 
                variant="outline" 
                className="w-full bg-[#2A2A2A] hover:bg-[#333] text-sm"
                onClick={() => setIsAddingPrompt(true)}
                onRipple={true}
                rippleColor="rgba(118, 185, 0, 0.3)"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Prompt
              </InteractiveButton>
              <InteractiveButton 
                variant="outline" 
                className="min-w-fit bg-[#2A2A2A] hover:bg-[#333] text-sm"
                onClick={() => {
                  console.log("Summarize button clicked");
                  onSummarizeResponse();
                }}
                onRipple={true}
                rippleColor="rgba(118, 185, 0, 0.3)"
                onPulse={true}
                pulseColor="rgba(118, 185, 0, 0.2)"
              >
                <Sparkles className="h-4 w-4" />
                Summarize
              </InteractiveButton>
            </div>

            {/* Prompt Type Tabs (My Prompts / Templates) */}
            <div className="px-4 mb-2">
              <div className="bg-[#232323] rounded-md p-1 grid grid-cols-2 gap-1">
                <Button 
                  variant={promptTab === 'mine' ? "default" : "ghost"}
                  size="sm"
                  className={`rounded text-xs h-8 ${promptTab === 'mine' 
                    ? "bg-nvidia-green/90 text-black hover:bg-nvidia-green" 
                    : "hover:bg-[#2A2A2A]"}`}
                  onClick={() => setPromptTab('mine')}
                >
                  <BookMarked className="h-3.5 w-3.5 mr-1" />
                  My Prompts
                </Button>
                <Button 
                  variant={promptTab === 'templates' ? "default" : "ghost"}
                  size="sm"
                  className={`rounded text-xs h-8 ${promptTab === 'templates' 
                    ? "bg-nvidia-green/90 text-black hover:bg-nvidia-green" 
                    : "hover:bg-[#2A2A2A]"}`}  
                  onClick={() => setPromptTab('templates')}
                >
                  <PuzzleIcon className="h-3.5 w-3.5 mr-1" />
                  Templates
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4">
              {/* Add/Edit Prompt Form */}
              {(isAddingPrompt || editingPromptId) && promptTab === 'mine' && (
                <Card className="p-3 mb-3 bg-[#2A2A2A] border-[#333]">
                  <h3 className="text-sm font-medium mb-2">
                    {editingPromptId ? "Edit Prompt" : "New Prompt"}
                  </h3>
                  <Input
                    placeholder="Title"
                    className="mb-2 bg-[#232323] border-[#3A3A3A]"
                    value={newPromptTitle}
                    onChange={(e) => setNewPromptTitle(e.target.value)}
                  />
                  
                  <div className="mb-2">
                    <Select 
                      value={newPromptCategory || "none"} 
                      onValueChange={setNewPromptCategory}
                    >
                      <SelectTrigger className="bg-[#232323] border-[#3A3A3A]">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {promptCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center">
                              <div 
                                className="w-2 h-2 rounded-full mr-2" 
                                style={{ backgroundColor: category.color }}
                              ></div>
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Textarea
                    placeholder="Prompt content..."
                    className="min-h-[100px] mb-2 bg-[#232323] border-[#3A3A3A]"
                    value={newPromptContent}
                    onChange={(e) => setNewPromptContent(e.target.value)}
                  />

                  {/* Reasoning Settings */}
                  <div className="mb-3 p-2 bg-[#232323] rounded-md border border-[#333]">
                    <div className="flex items-center gap-2 mb-2">
                      <BrainCircuit className="h-4 w-4 text-nvidia-green" />
                      <span className="text-sm font-medium">Reasoning Settings</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enableReasoning"
                          className="w-4 h-4 bg-[#232323] border-[#3A3A3A] rounded mr-2 accent-nvidia-green"
                          checked={newPromptReasoningEnabled}
                          onChange={(e) => setNewPromptReasoningEnabled(e.target.checked)}
                        />
                        <label htmlFor="enableReasoning" className="text-xs">
                          Enable reasoning mode
                        </label>
                      </div>
                    </div>
                    
                    {newPromptReasoningEnabled && (
                      <div className="pl-6">
                        <p className="text-xs text-gray-400 mb-2">Select reasoning template:</p>
                        <CustomReasoningTemplates 
                          currentTemplate={newPromptReasoningTemplate}
                          onTemplateChange={setNewPromptReasoningTemplate}
                          className="w-full text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingPrompt(false);
                        setEditingPromptId(null);
                        setNewPromptTitle("");
                        setNewPromptContent("");
                        setNewPromptCategory(undefined);
                        setNewPromptReasoningEnabled(false);
                        setNewPromptReasoningTemplate("standard");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-nvidia-green hover:bg-nvidia-green/90 text-black"
                      onClick={() => editingPromptId ? updatePrompt(editingPromptId) : addPrompt()}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {editingPromptId ? "Update" : "Save"}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Category filters for My Prompts */}
              {!isAddingPrompt && !editingPromptId && promptCategories.length > 0 && promptTab === 'mine' && (
                <div className="flex flex-wrap gap-1 mb-3">
                  <Button
                    variant={selectedCategoryFilter === null ? "default" : "outline"}
                    size="sm"
                    className={`px-2 py-1 h-6 text-xs ${
                      selectedCategoryFilter === null
                        ? "bg-nvidia-green text-black hover:bg-nvidia-green/90"
                        : "bg-[#2A2A2A] hover:bg-[#333]"
                    }`}
                    onClick={() => setSelectedCategoryFilter(null)}
                  >
                    All
                  </Button>
                  
                  {promptCategories.map(category => (
                    <Button
                      key={category.id}
                      variant={selectedCategoryFilter === category.id ? "default" : "outline"}
                      size="sm"
                      className={`px-2 py-1 h-6 text-xs ${
                        selectedCategoryFilter === category.id
                          ? "bg-nvidia-green text-black hover:bg-nvidia-green/90"
                          : "bg-[#2A2A2A] hover:bg-[#333]"
                      }`}
                      onClick={() => setSelectedCategoryFilter(category.id)}
                    >
                      <div 
                        className="w-2 h-2 rounded-full mr-1" 
                        style={{ backgroundColor: category.color }}
                      ></div>
                      {category.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* My Prompts List */}
              {promptTab === 'mine' && (
                <>
                  {filteredPrompts.length === 0 && !isAddingPrompt ? (
                    <div className="text-center text-gray-500 py-6">
                      {promptSearchQuery || selectedCategoryFilter 
                        ? "No matching prompts found" 
                        : "No saved prompts yet. Click \"Add Prompt\" to create one."}
                    </div>
                  ) : (
                    filteredPrompts.map((prompt) => (
                      <Card 
                        key={prompt.id} 
                        className={`p-3 mb-3 bg-[#2A2A2A] border-[#333] hover:border-nvidia-green/50 transition-colors ${
                          prompt.starred ? 'border-nvidia-green/70' : ''
                        }`}
                      >
                        {editingPromptId !== prompt.id ? (
                          <>
                            <div className="flex justify-between items-start mb-1">
                              <h3 className="text-sm font-medium flex items-center">
                                {prompt.starred && (
                                  <Star className="h-3.5 w-3.5 mr-1 text-nvidia-green fill-nvidia-green" />
                                )}
                                {prompt.title}
                                
                                {prompt.reasoningEnabled && (
                                  <div className="ml-2 px-1.5 py-0.5 text-[9px] rounded-full bg-nvidia-green/20 border border-nvidia-green/30 text-nvidia-green flex items-center">
                                    <BrainCircuit className="h-2.5 w-2.5 mr-0.5" />
                                    {prompt.reasoningTemplateId === "standard" ? "Standard" : 
                                     prompt.reasoningTemplateId === "socratic" ? "Socratic" : 
                                     prompt.reasoningTemplateId === "scientific" ? "Scientific" : 
                                     prompt.reasoningTemplateId === "deductive" ? "Deductive" : 
                                     "Reasoning"} 
                                  </div>
                                )}
                              </h3>
                              
                              {prompt.categoryId && (
                                <Badge 
                                  className="ml-2 text-[10px] px-1.5 py-0"
                                  style={{ 
                                    backgroundColor: promptCategories.find(c => c.id === prompt.categoryId)?.color || '#6366F1'
                                  }}
                                >
                                  {promptCategories.find(c => c.id === prompt.categoryId)?.name || 'Category'}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-xs text-gray-500 mb-1">{formatDate(prompt.createdAt)}</p>
                            <p className="text-sm text-gray-400 mb-2 line-clamp-2">{prompt.content}</p>
                            
                            <div className="flex justify-between items-center">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:text-nvidia-green"
                                  onClick={() => toggleStarPrompt(prompt.id)}
                                  title={prompt.starred ? "Unstar" : "Star"}
                                >
                                  <Star className={`h-4 w-4 ${prompt.starred ? 'fill-nvidia-green text-nvidia-green' : ''}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:text-nvidia-green"
                                  onClick={() => copyPromptToClipboard(prompt.content)}
                                  title="Copy to clipboard"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => startEditingPrompt(prompt)}
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost" 
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setPromptToDelete(prompt.id);
                                    setShowDeletePromptDialog(true);
                                  }}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-nvidia-green hover:bg-nvidia-green/90 text-black"
                                  onClick={() => onUsePrompt(prompt.content, {
                                    enabled: prompt.reasoningEnabled || false,
                                    templateId: prompt.reasoningTemplateId || "standard"
                                  })}
                                >
                                  Use
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </Card>
                    ))
                  )}
                </>
              )}
              
              {/* Template Prompts List */}
              {promptTab === 'templates' && (
                <>
                  <Card className="p-3 mb-4 bg-[#232323] border-[#333]">
                    <div className="flex items-center mb-2">
                      <Info className="h-4 w-4 mr-2 text-nvidia-green" />
                      <p className="text-xs text-gray-300">
                        Click "Save to My Prompts" to add a template to your personal collection, or "Use" to try it directly.
                      </p>
                    </div>
                  </Card>
                
                  {templatePrompts
                    .filter(template => {
                      if (promptSearchQuery) {
                        const searchLower = promptSearchQuery.toLowerCase();
                        return (
                          template.title.toLowerCase().includes(searchLower) ||
                          template.content.toLowerCase().includes(searchLower)
                        );
                      }
                      return true;
                    })
                    .filter(template => {
                      if (selectedCategoryFilter) {
                        return template.categoryId === selectedCategoryFilter;
                      }
                      return true;
                    })
                    .map((template) => (
                      <Card 
                        key={template.id} 
                        className="p-3 mb-3 border border-nvidia-green/30 bg-[#232323] hover:border-nvidia-green/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center">
                            <div className="text-nvidia-green mr-2">
                              {template.categoryId === "coding" ? (
                                <Code className="h-4 w-4" />
                              ) : template.categoryId === "research" ? (
                                <BrainCircuit className="h-4 w-4" />
                              ) : template.categoryId === "writing" ? (
                                <PenIcon className="h-4 w-4" />
                              ) : (
                                <LightbulbIcon className="h-4 w-4" />
                              )}
                            </div>
                            <h3 className="text-sm font-medium flex items-center">
                              {template.title}
                              
                              {template.reasoningEnabled && (
                                <div className="ml-2 px-1.5 py-0.5 text-[9px] rounded-full bg-nvidia-green/20 border border-nvidia-green/30 text-nvidia-green flex items-center">
                                  <BrainCircuit className="h-2.5 w-2.5 mr-0.5" />
                                  {template.reasoningTemplateId === "standard" ? "Standard" : 
                                   template.reasoningTemplateId === "socratic" ? "Socratic" : 
                                   template.reasoningTemplateId === "scientific" ? "Scientific" : 
                                   template.reasoningTemplateId === "deductive" ? "Deductive" : 
                                   "Reasoning"} 
                                </div>
                              )}
                            </h3>
                          </div>
                          
                          {template.categoryId && (
                            <Badge 
                              className="ml-2 text-[10px] px-1.5 py-0"
                              style={{ 
                                backgroundColor: promptCategories.find(c => c.id === template.categoryId)?.color || '#6366F1'
                              }}
                            >
                              {promptCategories.find(c => c.id === template.categoryId)?.name || 'Category'}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-3 ml-6">{template.content}</p>
                        
                        {/* Copy button row */}
                        <div className="flex items-center mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 hover:text-nvidia-green"
                            onClick={() => copyPromptToClipboard(template.content)}
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            Copy
                          </Button>
                        </div>
                        
                        {/* Action buttons row */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-nvidia-green/50 text-nvidia-green hover:bg-nvidia-green/10"
                            onClick={() => saveTemplateToMyPrompts(template)}
                          >
                            <BookMarked className="h-3.5 w-3.5 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-nvidia-green hover:bg-nvidia-green/90 text-black"
                            onClick={() => onUsePrompt(template.content, {
                              enabled: template.reasoningEnabled || false, 
                              templateId: template.reasoningTemplateId || "standard"
                            })}
                          >
                            Use
                          </Button>
                        </div>
                      </Card>
                    ))
                  }
                </>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="flex-1 flex flex-col">
            <div className="p-2">
              <InteractiveButton 
                variant="outline" 
                className="w-full bg-[#2A2A2A] hover:bg-[#333] text-sm"
                onClick={() => setIsAddingNote(true)}
                onRipple={true}
                rippleColor="rgba(118, 185, 0, 0.3)"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </InteractiveButton>
            </div>

            <ScrollArea className="flex-1 px-4">
              {/* Add/Edit Note Form */}
              {(isAddingNote || editingNoteId) && (
                <Card className="p-3 mb-3 bg-[#2A2A2A] border-[#333]">
                  <h3 className="text-sm font-medium mb-2">
                    {editingNoteId ? "Edit Note" : "New Note"}
                  </h3>
                  <Input
                    placeholder="Title"
                    className="mb-2 bg-[#232323] border-[#3A3A3A]"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Note content..."
                    className="min-h-[100px] mb-2 bg-[#232323] border-[#3A3A3A]"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingNote(false);
                        setEditingNoteId(null);
                        setNewNoteTitle("");
                        setNewNoteContent("");
                        setNewNoteTags([]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-nvidia-green hover:bg-nvidia-green/90 text-black"
                      onClick={() => editingNoteId ? updateNote(editingNoteId) : addNote()}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {editingNoteId ? "Update" : "Save"}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Notes List */}
              {filteredNotes.length === 0 && !isAddingNote ? (
                <div className="text-center text-gray-500 py-6">
                  {noteSearchQuery 
                    ? "No matching notes found" 
                    : "No notes yet. Click \"Add Note\" to create one."}
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <Card 
                    key={note.id} 
                    className={`p-3 mb-3 bg-[#2A2A2A] border-[#333] hover:border-nvidia-green/50 transition-colors ${
                      note.conversationId ? 'border-l-2 border-l-nvidia-green/70' : ''
                    }`}
                  >
                    {editingNoteId !== note.id ? (
                      <>
                        <h3 className="text-sm font-medium mb-1">{note.title}</h3>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs text-gray-500">{formatDate(note.timestamp)}</p>
                          {note.conversationId && (
                            <Badge variant="outline" className="text-[9px] h-4 bg-[#333] hover:bg-[#444]">
                              <Link2 className="h-2.5 w-2.5 mr-1" /> 
                              Linked conversation
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-2 whitespace-pre-wrap">{note.content}</p>
                        
                        {/* Embedded Conversation Snippets */}
                        {note.linkedSnippets && note.linkedSnippets.length > 0 && (
                          <Accordion type="single" collapsible className="w-full mb-2">
                            <AccordionItem value="linked-snippets" className="border-[#444]">
                              <AccordionTrigger className="text-xs py-1 hover:no-underline">
                                <div className="flex items-center text-nvidia-green/90">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Linked Conversation Snippets
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                {note.linkedSnippets.map(snippet => (
                                  <div 
                                    key={snippet.id} 
                                    className={`p-2 mb-2 rounded-md text-xs ${
                                      snippet.role === 'assistant' 
                                        ? 'bg-[#232323] border-l-2 border-l-nvidia-green' 
                                        : 'bg-[#333] border-l-2 border-l-blue-500'
                                    }`}
                                  >
                                    <div className="flex items-center mb-1 text-[10px] text-gray-400">
                                      <Badge variant="outline" className="text-[9px] h-4 bg-[#3A3A3A]">
                                        {snippet.role === 'assistant' ? 'AI Response' : 'User Message'}
                                      </Badge>
                                    </div>
                                    <div className="line-clamp-4 text-gray-300">
                                      {snippet.content}
                                    </div>
                                  </div>
                                ))}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                        
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {note.tags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditingNote(note)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setNoteToDelete(note.id);
                              setShowDeleteNoteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : null}
                  </Card>
                ))
              )}
            </ScrollArea>
          </TabsContent>
          
          {/* Content Creator Tab */}
          <TabsContent value="content" className="flex-1 flex flex-col">
            <div className="p-4">
              <h3 className="text-sm font-medium text-nvidia-green mb-4 flex items-center">
                <Type className="h-4 w-4 mr-2" />
                AI-Powered Content Generation
              </h3>
              
              {/* Email Composer */}
              {contentType === 'email' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Subject</label>
                    <Input
                      placeholder="Email subject..."
                      className="bg-[#232323] border-[#3A3A3A]"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-gray-400">Tone</label>
                      <Select
                        value={emailTone}
                        onValueChange={(value) => setEmailTone(value as any)}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs bg-[#232323] border-[#3A3A3A]">
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="persuasive">Persuasive</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Textarea
                      placeholder="Email content..."
                      className="min-h-[200px] bg-[#232323] border-[#3A3A3A]"
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      className="bg-[#2A2A2A] hover:bg-[#333]"
                      size="sm"
                      onClick={() => {
                        setEmailSubject("");
                        setEmailContent("");
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      className="bg-nvidia-green hover:bg-nvidia-green/90 text-black"
                      size="sm"
                      onClick={() => {
                        if (!emailSubject.trim()) {
                          // Show error feedback
                          const feedbackEl = document.createElement('div');
                          feedbackEl.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
                          feedbackEl.textContent = 'Please enter an email subject';
                          document.body.appendChild(feedbackEl);
                          
                          setTimeout(() => {
                            feedbackEl.style.opacity = '0';
                            feedbackEl.style.transition = 'opacity 0.5s';
                            setTimeout(() => document.body.removeChild(feedbackEl), 500);
                          }, 2000);
                          return;
                        }
                        
                        // Generate email prompt for the AI
                        const prompt = `Write a ${emailTone} email with the subject "${emailSubject}". ${emailContent ? `Include the following details: ${emailContent}` : ''}`;
                        
                        // Use the prompt
                        onUsePrompt(prompt);
                        onClose();
                        
                        // Show success feedback
                        const feedbackEl = document.createElement('div');
                        feedbackEl.className = 'fixed bottom-4 right-4 bg-nvidia-green text-black px-4 py-2 rounded-md shadow-lg z-50';
                        feedbackEl.textContent = 'Email prompt sent to AI!';
                        document.body.appendChild(feedbackEl);
                        
                        setTimeout(() => {
                          feedbackEl.style.opacity = '0';
                          feedbackEl.style.transition = 'opacity 0.5s';
                          setTimeout(() => document.body.removeChild(feedbackEl), 500);
                        }, 2000);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Generate Email
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Blog Post Generator */}
              {contentType === 'blog' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Blog Title</label>
                    <Input
                      placeholder="Blog title..."
                      className="bg-[#232323] border-[#3A3A3A]"
                      value={blogTitle}
                      onChange={(e) => setBlogTitle(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Keywords (comma separated)</label>
                    <Input
                      placeholder="AI, machine learning, deep learning..."
                      className="bg-[#232323] border-[#3A3A3A]"
                      value={blogKeywords}
                      onChange={(e) => setBlogKeywords(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-gray-400">Style</label>
                      <Select
                        value={blogStyle}
                        onValueChange={(value) => setBlogStyle(value as any)}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs bg-[#232323] border-[#3A3A3A]">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="informative">Informative</SelectItem>
                          <SelectItem value="tutorial">Tutorial</SelectItem>
                          <SelectItem value="opinion">Opinion</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">Outline Sections</label>
                      {blogSections.map((section, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`Section ${index + 1}`}
                            className="bg-[#232323] border-[#3A3A3A]"
                            value={section}
                            onChange={(e) => {
                              const newSections = [...blogSections];
                              newSections[index] = e.target.value;
                              setBlogSections(newSections);
                            }}
                          />
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10"
                              onClick={() => {
                                const newSections = [...blogSections];
                                newSections.splice(index, 1);
                                setBlogSections(newSections);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 bg-[#2A2A2A] hover:bg-[#333]"
                        onClick={() => setBlogSections([...blogSections, ""])}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      className="bg-[#2A2A2A] hover:bg-[#333]"
                      size="sm"
                      onClick={() => {
                        setBlogTitle("");
                        setBlogKeywords("");
                        setBlogSections([""]);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      className="bg-nvidia-green hover:bg-nvidia-green/90 text-black"
                      size="sm"
                      onClick={() => {
                        if (!blogTitle.trim()) {
                          // Show error feedback
                          const feedbackEl = document.createElement('div');
                          feedbackEl.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
                          feedbackEl.textContent = 'Please enter a blog title';
                          document.body.appendChild(feedbackEl);
                          
                          setTimeout(() => {
                            feedbackEl.style.opacity = '0';
                            feedbackEl.style.transition = 'opacity 0.5s';
                            setTimeout(() => document.body.removeChild(feedbackEl), 500);
                          }, 2000);
                          return;
                        }
                        
                        // Generate blog post prompt for the AI
                        const sections = blogSections.filter(s => s.trim()).map(s => `- ${s}`).join('\n');
                        const keywords = blogKeywords.trim() ? `Keywords to include: ${blogKeywords}` : '';
                        
                        const prompt = `Write a ${blogStyle} blog post titled "${blogTitle}". 
${keywords}

${sections ? `Include the following sections:
${sections}` : 'Structure the blog with an introduction, main content with appropriate subheadings, and a conclusion.'}

Make it engaging and detailed. Add relevant examples and insights.`;
                        
                        // Use the prompt
                        onUsePrompt(prompt, { enabled: true, templateId: "deductive" });
                        onClose();
                        
                        // Show success feedback
                        const feedbackEl = document.createElement('div');
                        feedbackEl.className = 'fixed bottom-4 right-4 bg-nvidia-green text-black px-4 py-2 rounded-md shadow-lg z-50';
                        feedbackEl.textContent = 'Blog post prompt sent to AI!';
                        document.body.appendChild(feedbackEl);
                        
                        setTimeout(() => {
                          feedbackEl.style.opacity = '0';
                          feedbackEl.style.transition = 'opacity 0.5s';
                          setTimeout(() => document.body.removeChild(feedbackEl), 500);
                        }, 2000);
                      }}
                    >
                      <AlignLeft className="h-4 w-4 mr-2" />
                      Generate Blog Post
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Social Media Content */}
              {contentType === 'social' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-gray-400">Platform</label>
                      <Select
                        value={socialPlatform}
                        onValueChange={(value) => setSocialPlatform(value as any)}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs bg-[#232323] border-[#3A3A3A]">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="twitter">
                            <div className="flex items-center">
                              <Twitter className="h-3.5 w-3.5 mr-2" />
                              Twitter
                            </div>
                          </SelectItem>
                          <SelectItem value="linkedin">
                            <div className="flex items-center">
                              <Linkedin className="h-3.5 w-3.5 mr-2" />
                              LinkedIn
                            </div>
                          </SelectItem>
                          <SelectItem value="instagram">
                            <div className="flex items-center">
                              <Instagram className="h-3.5 w-3.5 mr-2" />
                              Instagram
                            </div>
                          </SelectItem>
                          <SelectItem value="facebook">
                            <div className="flex items-center">
                              <Facebook className="h-3.5 w-3.5 mr-2" />
                              Facebook
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <label className="text-xs text-gray-400">Topic</label>
                    <Input
                      placeholder="What's your post about?"
                      className="bg-[#232323] border-[#3A3A3A]"
                      value={socialTopic}
                      onChange={(e) => setSocialTopic(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-gray-400">Tone</label>
                      <Select
                        value={socialTone}
                        onValueChange={(value) => setSocialTone(value as any)}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs bg-[#232323] border-[#3A3A3A]">
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="humorous">Humorous</SelectItem>
                          <SelectItem value="inspirational">Inspirational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <label className="text-xs text-gray-400">Hashtags (without # symbol)</label>
                    <Input
                      placeholder="tech, ai, machinelearning"
                      className="bg-[#232323] border-[#3A3A3A]"
                      value={socialHashtags}
                      onChange={(e) => setSocialHashtags(e.target.value)}
                    />
                  </div>
                  
                  <div className="mt-4 p-3 bg-[#232323] rounded-md border border-[#333]">
                    <h4 className="text-xs font-medium mb-2 flex items-center">
                      <TextQuote className="h-3.5 w-3.5 mr-1.5 text-nvidia-green" />
                      Social Media Strategy Tips
                    </h4>
                    <ul className="text-xs text-gray-400 space-y-1.5 ml-5 list-disc">
                      <li>Keep posts concise and focused on a single topic</li>
                      <li>Use 1-3 relevant hashtags for better discoverability</li>
                      <li>Include a clear call-to-action when appropriate</li>
                      <li>Match your tone to your target audience</li>
                    </ul>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      className="bg-[#2A2A2A] hover:bg-[#333]"
                      size="sm"
                      onClick={() => {
                        setSocialTopic("");
                        setSocialHashtags("");
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      className="bg-nvidia-green hover:bg-nvidia-green/90 text-black"
                      size="sm"
                      onClick={() => {
                        if (!socialTopic.trim()) {
                          // Show error feedback
                          const feedbackEl = document.createElement('div');
                          feedbackEl.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
                          feedbackEl.textContent = 'Please enter a topic for your post';
                          document.body.appendChild(feedbackEl);
                          
                          setTimeout(() => {
                            feedbackEl.style.opacity = '0';
                            feedbackEl.style.transition = 'opacity 0.5s';
                            setTimeout(() => document.body.removeChild(feedbackEl), 500);
                          }, 2000);
                          return;
                        }
                        
                        // Generate social media prompt for the AI
                        const hashtags = socialHashtags.trim() 
                          ? `Include these hashtags: ${socialHashtags.split(',').map(tag => `#${tag.trim()}`).join(' ')}` 
                          : '';
                        
                        const platformSpecifics = {
                          twitter: "Keep it under 280 characters.",
                          linkedin: "Make it professional and insightful.",
                          instagram: "Make it visually descriptive and engaging.",
                          facebook: "Make it conversational and engaging."
                        };
                        
                        const prompt = `Write a ${socialTone} ${socialPlatform} post about ${socialTopic}. ${platformSpecifics[socialPlatform]} ${hashtags}`;
                        
                        // Use the prompt
                        onUsePrompt(prompt);
                        onClose();
                        
                        // Show success feedback
                        const feedbackEl = document.createElement('div');
                        feedbackEl.className = 'fixed bottom-4 right-4 bg-nvidia-green text-black px-4 py-2 rounded-md shadow-lg z-50';
                        feedbackEl.textContent = 'Social media prompt sent to AI!';
                        document.body.appendChild(feedbackEl);
                        
                        setTimeout(() => {
                          feedbackEl.style.opacity = '0';
                          feedbackEl.style.transition = 'opacity 0.5s';
                          setTimeout(() => document.body.removeChild(feedbackEl), 500);
                        }, 2000);
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Generate Post
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Knowledge Tab */}
          <TabsContent value="knowledge" className="flex-1 flex flex-col">
            <div className="p-2 pb-0">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Select Knowledge Source</h3>
              <div className="flex flex-wrap gap-2">
                {knowledgeSources.map(source => (
                  <Button
                    key={source.id}
                    variant={activeKnowledgeSource === source.id ? "default" : "outline"}
                    className={`px-3 py-1 h-auto text-xs ${
                      activeKnowledgeSource === source.id 
                        ? "bg-nvidia-green text-black hover:bg-nvidia-green/90"
                        : "bg-[#2A2A2A] hover:bg-[#333]"
                    }`}
                    onClick={() => setActiveKnowledgeSource(source.id)}
                  >
                    {source.name}
                  </Button>
                ))}
              </div>
            </div>
            
            <ScrollArea className="flex-1 px-4">
              {!activeKnowledgeSource ? (
                <div className="text-center text-gray-500 py-6">
                  Select a knowledge source to begin searching
                </div>
              ) : isLoadingKnowledge ? (
                <div className="flex justify-center items-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-nvidia-green border-t-transparent"></div>
                </div>
              ) : knowledgeResults.length === 0 && knowledgeSearchQuery.length > 0 ? (
                <div className="text-center text-gray-500 py-6">
                  No results found for "{knowledgeSearchQuery}"
                </div>
              ) : knowledgeResults.length === 0 ? (
                <div className="py-4">
                  <Card className="p-4 bg-[#2A2A2A] border-[#333]">
                    <h3 className="text-sm font-medium mb-2">
                      {activeKnowledgeSource === "wikipedia" ? "Search Wikipedia" : 
                       activeKnowledgeSource === "hackernews" ? "Discover Tech News" :
                       activeKnowledgeSource === "github" ? "Explore GitHub Repos" :
                       "Explore NASA Data"}
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      {activeKnowledgeSource === "wikipedia" ? "Enter a search term to find information from Wikipedia." : 
                       activeKnowledgeSource === "hackernews" ? "Search for the latest tech news and discussions." :
                       activeKnowledgeSource === "github" ? "Search for repositories and code samples." :
                       "Discover space imagery and scientific data."}
                    </p>
                    <Button 
                      className="w-full bg-nvidia-green hover:bg-nvidia-green/90 text-black"
                      onClick={() => {
                        // Always proceed with search for demo purposes
                        setIsLoadingKnowledge(true);
                        // Here we would normally fetch data from the selected API
                        // For now, we'll simulate it with a setTimeout
                        setTimeout(() => {
                          setIsLoadingKnowledge(false);
                          // For demo purposes, we'll just set some placeholder results
                          if (activeKnowledgeSource === "wikipedia") {
                            const searchTerm = knowledgeSearchQuery.trim() || "NVIDIA AI";
                            setKnowledgeSearchQuery(searchTerm); // Set a default if empty
                            setKnowledgeResults([
                              { id: "1", title: `${searchTerm} - Wikipedia Article`, excerpt: `This is a sample Wikipedia article about ${searchTerm}...` },
                              { id: "2", title: `Related to ${searchTerm}`, excerpt: "This is another sample Wikipedia result..." }
                            ]);
                          } else if (activeKnowledgeSource === "hackernews") {
                            const searchTerm = knowledgeSearchQuery.trim() || "AI Technology";
                            setKnowledgeSearchQuery(searchTerm); // Set a default if empty
                            setKnowledgeResults([
                              { id: "1", title: `${searchTerm}: Latest Developments`, author: "hacker123", score: 324, url: "#" },
                              { id: "2", title: `Discussion: ${searchTerm} Future`, author: "coder456", score: 178, url: "#" }
                            ]);
                          } else if (activeKnowledgeSource === "github") {
                            const searchTerm = knowledgeSearchQuery.trim() || "AI projects";
                            setKnowledgeSearchQuery(searchTerm); // Set a default if empty
                            setKnowledgeResults([
                              { id: "1", title: `awesome-${searchTerm.toLowerCase().replace(/\s+/g, '-')}`, owner: "githubUser", stars: 5324, description: "A curated list of awesome AI projects and resources" },
                              { id: "2", title: `${searchTerm}-toolkit`, owner: "devTeam", stars: 1289, description: "A comprehensive toolkit for AI development" }
                            ]);
                          } else if (activeKnowledgeSource === "nasa") {
                            const searchTerm = knowledgeSearchQuery.trim() || "Mars Rover";
                            setKnowledgeSearchQuery(searchTerm); // Set a default if empty
                            setKnowledgeResults([
                              { id: "1", title: `${searchTerm} Images`, date: "2024-02-15", type: "image" },
                              { id: "2", title: `${searchTerm} Mission Data`, date: "2024-01-20", type: "dataset" }
                            ]);
                          }
                        }, 1500);
                      }}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search Now
                    </Button>
                  </Card>
                </div>
              ) : (
                <div className="py-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium">
                      Results for "{knowledgeSearchQuery}"
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => {
                        setKnowledgeResults([]);
                        setKnowledgeSearchQuery("");
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  
                  {activeKnowledgeSource === "wikipedia" && (
                    knowledgeResults.map((result: any) => (
                      <Card key={result.id} className="p-3 mb-3 bg-[#2A2A2A] border-[#333]">
                        <h4 className="text-sm font-medium mb-1">{result.title}</h4>
                        <p className="text-sm text-gray-400 mb-2">{result.excerpt}</p>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            className="bg-nvidia-green hover:bg-nvidia-green/90 text-black"
                            onClick={() => onUsePrompt(`Provide information about ${result.title}`, {
                              enabled: false,
                              templateId: "standard"
                            })}
                          >
                            Use in Chat
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                  
                  {activeKnowledgeSource === "hackernews" && (
                    knowledgeResults.map((result: any) => (
                      <Card key={result.id} className="p-3 mb-3 bg-[#2A2A2A] border-[#333]">
                        <h4 className="text-sm font-medium mb-1">{result.title}</h4>
                        <p className="text-xs text-gray-500 mb-2">By {result.author} • {result.score} points</p>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            className="bg-nvidia-green hover:bg-nvidia-green/90 text-black"
                            onClick={() => onUsePrompt(`Tell me about this tech news: ${result.title}`, {
                              enabled: false,
                              templateId: "standard"
                            })}
                          >
                            Use in Chat
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Prompt Dialog */}
      <AlertDialog open={showDeletePromptDialog} onOpenChange={setShowDeletePromptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this prompt? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (promptToDelete) {
                  deletePrompt(promptToDelete);
                  setPromptToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Note Dialog */}
      <AlertDialog open={showDeleteNoteDialog} onOpenChange={setShowDeleteNoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (noteToDelete) {
                  deleteNote(noteToDelete);
                  setNoteToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Import Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Prompts</AlertDialogTitle>
            <AlertDialogDescription>
              Paste previously exported JSON data to import prompts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea 
            placeholder="Paste JSON data here..."
            className="min-h-[150px] bg-[#232323] border-[#3A3A3A] mb-4"
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-nvidia-green hover:bg-nvidia-green/90 text-black"
              onClick={() => {
                try {
                  const parsedData = JSON.parse(importData);
                  if (Array.isArray(parsedData)) {
                    // Add missing createdAt fields if any
                    const validData = parsedData.map((item: any) => ({
                      ...item,
                      createdAt: item.createdAt || Date.now()
                    }));
                    setFavoritePrompts([...favoritePrompts, ...validData]);
                    setImportData("");
                  }
                } catch (err) {
                  // Handle error - in a real app we'd show an error toast
                  console.error("Invalid JSON data", err);
                }
              }}
            >
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductivitySidebar;
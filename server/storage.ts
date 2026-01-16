import { 
  type Message, 
  type InsertMessage, 
  type Conversation, 
  type InsertConversation,
  type InsertBranch,
  type InsertBookmark,
  type InsertThought,
  type InsertIdea,
  type InsertThoughtIdeaRelation,
  type ThoughtIdeaRelation,
  type ReasoningStep,
  type ReasoningExplanation,
  type InsertReasoningExplanation
} from "@shared/schema";

// Define custom Branch and Bookmark interfaces with string IDs for in-memory storage
interface Branch {
  id: string;
  name: string;
  conversationId: string;
  createdAt: Date;
  isActive: number;
  rootMessageId: number | null;
}

interface Bookmark {
  id: string;
  name: string;
  conversationId: string;
  messageId: number;
  branchId: string | null;
  createdAt: Date;
}

interface Thought {
  id: number;
  userId: string;
  content: string;
  type: string;
  tags: string[];
  source: string;
  parentId: number | null;
  conversationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  extensions: any;
  connections: any;
  metadata: any;
}

interface Idea {
  id: number;
  userId: string;
  title: string;
  description: string;
  status: string;
  tags: string[];
  version: number;
  parentIdeaId: number | null;
  rootIdeaId: number | null;
  createdAt: Date;
  updatedAt: Date;
  evolutionPath: any[];
  metrics: any;
  feedback: any[];
  metadata: any;
}

// Storage interface
export interface IStorage {
  // Message methods
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  getMessagesByBranch(conversationId: string, branchId: string): Promise<Message[]>;
  getMessageById(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessageReasoningSteps(messageId: number, reasoningSteps: ReasoningStep[]): Promise<Message>;
  
  // Conversation methods
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversations(): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationTitle(id: string, title: string): Promise<Conversation>;
  toggleLearningMode(id: string, enabled: boolean): Promise<Conversation>;
  deleteConversation(id: string): Promise<boolean>;

  // Branch methods
  getBranchesByConversationId(conversationId: string): Promise<Branch[]>;
  getActiveBranch(conversationId: string): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranchName(id: string, name: string): Promise<Branch>;
  setActiveBranch(id: string): Promise<Branch>;
  deleteBranch(id: string): Promise<boolean>;

  // Bookmark methods
  getBookmarksByConversationId(conversationId: string): Promise<Bookmark[]>;
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  updateBookmarkName(id: string, name: string): Promise<Bookmark>;
  deleteBookmark(id: string): Promise<boolean>;
  
  // Reasoning Explanation methods
  getReasoningExplanationsByMessageId(messageId: number): Promise<ReasoningExplanation[]>;
  createReasoningExplanation(explanation: InsertReasoningExplanation): Promise<ReasoningExplanation>;
  
  // Thought methods
  getThoughtsByUserId(userId: string): Promise<Thought[]>;
  getThoughtById(id: number): Promise<Thought | undefined>;
  getThoughtsByConversationId(conversationId: string): Promise<Thought[]>;
  getRelatedThoughts(thoughtId: number): Promise<Thought[]>;
  createThought(thought: InsertThought): Promise<Thought>;
  updateThought(id: number, updates: Partial<InsertThought>): Promise<Thought>;
  deleteThought(id: number): Promise<boolean>;
  
  // Idea methods
  getIdeasByUserId(userId: string): Promise<Idea[]>;
  getIdeaById(id: number): Promise<Idea | undefined>;
  getIdeaVersions(rootIdeaId: number): Promise<Idea[]>;
  createIdea(idea: InsertIdea): Promise<Idea>;
  updateIdea(id: number, updates: Partial<InsertIdea>): Promise<Idea>;
  deleteIdea(id: number): Promise<boolean>;
  
  // Thought-Idea Relations methods
  getThoughtsByIdeaId(ideaId: number): Promise<Thought[]>;
  getIdeasByThoughtId(thoughtId: number): Promise<Idea[]>;
  createThoughtIdeaRelation(relation: InsertThoughtIdeaRelation): Promise<ThoughtIdeaRelation>;
  deleteThoughtIdeaRelation(thoughtId: number, ideaId: number): Promise<boolean>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private messages: Map<number, Message>;
  private conversations: Map<string, Conversation>;
  private branches: Map<string, Branch>; // We store by string key but branch.id is numeric
  private bookmarks: Map<string, Bookmark>; // We store by string key but bookmark.id is numeric
  private thoughts: Map<number, Thought>;
  private ideas: Map<number, Idea>;
  private thoughtIdeaRelations: Map<string, ThoughtIdeaRelation>; // key is `${thoughtId}-${ideaId}`
  private reasoningExplanations: Map<number, ReasoningExplanation[]>; // key is messageId
  private currentMessageId: number;
  private currentConversationId: number;
  private currentBranchId: number;
  private currentBookmarkId: number;
  private currentThoughtId: number;
  private currentIdeaId: number;
  private currentRelationId: number;
  private currentExplanationId: number;

  constructor() {
    this.messages = new Map();
    this.conversations = new Map();
    this.branches = new Map();
    this.bookmarks = new Map();
    this.thoughts = new Map();
    this.ideas = new Map();
    this.thoughtIdeaRelations = new Map();
    this.reasoningExplanations = new Map<number, ReasoningExplanation[]>();
    this.currentMessageId = 1;
    this.currentConversationId = 1;
    this.currentBranchId = 1;
    this.currentBookmarkId = 1;
    this.currentThoughtId = 1;
    this.currentIdeaId = 1;
    this.currentRelationId = 1;
    this.currentExplanationId = 1;
  }

  // Message methods
  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
  }

  async getMessagesByBranch(conversationId: string, branchId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId && message.branchId === branchId)
      .sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
  }

  async getMessageById(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const timestamp = new Date();
    const message: Message = { 
      ...insertMessage, 
      id,
      timestamp,
      parentId: insertMessage.parentId || null,
      branchId: insertMessage.branchId || null
    };
    this.messages.set(id, message);
    return message;
  }

  // Conversation methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .sort((a, b) => {
        if (!a.updatedAt || !b.updatedAt) return 0;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = String(this.currentConversationId++);
    const now = new Date();
    const conversation: Conversation = {
      ...insertConversation,
      id: parseInt(id),
      createdAt: now,
      updatedAt: now
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversationTitle(id: string, title: string): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error(`Conversation with id ${id} not found`);
    }
    
    const updatedConversation: Conversation = {
      ...conversation,
      title,
      updatedAt: new Date()
    };
    
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }

  async deleteConversation(id: string): Promise<boolean> {
    // Also delete all associated branches and bookmarks
    const branchesToDelete = Array.from(this.branches.values())
      .filter(branch => branch.conversationId === id);
    
    for (const branch of branchesToDelete) {
      this.branches.delete(String(branch.id));
    }
    
    const bookmarksToDelete = Array.from(this.bookmarks.values())
      .filter(bookmark => bookmark.conversationId === id);
    
    for (const bookmark of bookmarksToDelete) {
      this.bookmarks.delete(String(bookmark.id));
    }
    
    return this.conversations.delete(id);
  }

  // Branch methods
  async getBranchesByConversationId(conversationId: string): Promise<Branch[]> {
    return Array.from(this.branches.values())
      .filter(branch => branch.conversationId === conversationId)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  async getActiveBranch(conversationId: string): Promise<Branch | undefined> {
    return Array.from(this.branches.values())
      .find(branch => branch.conversationId === conversationId && branch.isActive === 1);
  }

  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const id = String(this.currentBranchId++);
    const now = new Date();

    // If this is the first branch for this conversation, make it active
    let isActive = insertBranch.isActive;
    if (isActive === undefined) {
      const existingBranches = await this.getBranchesByConversationId(insertBranch.conversationId);
      isActive = existingBranches.length === 0 ? 1 : 0;
    }

    // If making this branch active, deactivate all other branches
    if (isActive === 1) {
      const existingBranches = await this.getBranchesByConversationId(insertBranch.conversationId);
      for (const branch of existingBranches) {
        if (branch.isActive === 1) {
          const updatedBranch = { ...branch, isActive: 0 };
          this.branches.set(String(branch.id), updatedBranch);
        }
      }
    }

    // Use string ID directly since schema now expects string IDs
    const branch: Branch = {
      ...insertBranch,
      id: id, // Using string ID directly to match schema
      createdAt: now,
      isActive: isActive || 0,
      rootMessageId: insertBranch.rootMessageId || null
    };
    
    console.log("Creating branch with ID:", id, "and data:", branch);
    this.branches.set(id, branch);
    return branch;
  }

  async updateBranchName(id: string, name: string): Promise<Branch> {
    const branch = this.branches.get(id);
    if (!branch) {
      throw new Error(`Branch with id ${id} not found`);
    }
    
    const updatedBranch: Branch = {
      ...branch,
      name
    };
    
    this.branches.set(id, updatedBranch);
    return updatedBranch;
  }

  async setActiveBranch(id: string): Promise<Branch> {
    const branch = this.branches.get(id);
    if (!branch) {
      throw new Error(`Branch with id ${id} not found`);
    }
    
    // Deactivate all other branches in the conversation
    const conversationBranches = await this.getBranchesByConversationId(branch.conversationId);
    for (const b of conversationBranches) {
      if (b.id !== branch.id && b.isActive === 1) {
        const deactivatedBranch = { ...b, isActive: 0 };
        this.branches.set(String(b.id), deactivatedBranch);
      }
    }
    
    // Activate the requested branch
    const updatedBranch: Branch = {
      ...branch,
      isActive: 1
    };
    
    this.branches.set(id, updatedBranch);
    return updatedBranch;
  }

  async deleteBranch(id: string): Promise<boolean> {
    return this.branches.delete(id);
  }

  // Bookmark methods
  async getBookmarksByConversationId(conversationId: string): Promise<Bookmark[]> {
    return Array.from(this.bookmarks.values())
      .filter(bookmark => bookmark.conversationId === conversationId)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const id = String(this.currentBookmarkId++);
    const now = new Date();
    
    const bookmark: Bookmark = {
      ...insertBookmark,
      id: id, // Using string ID directly to match schema
      createdAt: now,
      branchId: insertBookmark.branchId || null
    };
    
    console.log("Creating bookmark with ID:", id, "and data:", bookmark);
    this.bookmarks.set(id, bookmark);
    return bookmark;
  }

  async updateBookmarkName(id: string, name: string): Promise<Bookmark> {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark) {
      throw new Error(`Bookmark with id ${id} not found`);
    }
    
    const updatedBookmark: Bookmark = {
      ...bookmark,
      name
    };
    
    this.bookmarks.set(id, updatedBookmark);
    return updatedBookmark;
  }

  async deleteBookmark(id: string): Promise<boolean> {
    return this.bookmarks.delete(id);
  }
  
  // Thought methods
  async getThoughtsByUserId(userId: string): Promise<Thought[]> {
    return Array.from(this.thoughts.values())
      .filter(thought => thought.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getThoughtById(id: number): Promise<Thought | undefined> {
    return this.thoughts.get(id);
  }
  
  async getThoughtsByConversationId(conversationId: string): Promise<Thought[]> {
    return Array.from(this.thoughts.values())
      .filter(thought => thought.conversationId === conversationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getRelatedThoughts(thoughtId: number): Promise<Thought[]> {
    const thought = this.thoughts.get(thoughtId);
    if (!thought) {
      return [];
    }
    
    // Get direct children
    const children = Array.from(this.thoughts.values())
      .filter(t => t.parentId === thoughtId);
    
    // Get thoughts with connections to this thought
    const connected = Array.from(this.thoughts.values())
      .filter(t => {
        if (t.id === thoughtId) return false;
        const connections = t.connections || {};
        return Object.values(connections).some((connectedIds: any) => 
          Array.isArray(connectedIds) && connectedIds.includes(thoughtId)
        );
      });
    
    return [...children, ...connected]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createThought(thought: InsertThought): Promise<Thought> {
    const id = this.currentThoughtId++;
    const now = new Date();
    
    const newThought: Thought = {
      ...thought,
      id,
      createdAt: now,
      updatedAt: now,
      parentId: thought.parentId || null,
      conversationId: thought.conversationId || null,
      source: thought.source || 'manual', // Ensure source has a default value of 'manual'
      extensions: thought.extensions || {},
      connections: thought.connections || {},
      metadata: thought.metadata || {}
    };
    
    this.thoughts.set(id, newThought);
    return newThought;
  }
  
  async updateThought(id: number, updates: Partial<InsertThought>): Promise<Thought> {
    const thought = this.thoughts.get(id);
    if (!thought) {
      throw new Error(`Thought with id ${id} not found`);
    }
    
    const updatedThought: Thought = {
      ...thought,
      ...updates,
      id,
      updatedAt: new Date()
    };
    
    this.thoughts.set(id, updatedThought);
    return updatedThought;
  }
  
  async deleteThought(id: number): Promise<boolean> {
    // Also remove any thought-idea relations involving this thought
    const relations = Array.from(this.thoughtIdeaRelations.values())
      .filter(relation => relation.thoughtId === id);
    
    for (const relation of relations) {
      this.thoughtIdeaRelations.delete(`${relation.thoughtId}-${relation.ideaId}`);
    }
    
    return this.thoughts.delete(id);
  }
  
  // Idea methods
  async getIdeasByUserId(userId: string): Promise<Idea[]> {
    return Array.from(this.ideas.values())
      .filter(idea => idea.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getIdeaById(id: number): Promise<Idea | undefined> {
    return this.ideas.get(id);
  }
  
  async getIdeaVersions(rootIdeaId: number): Promise<Idea[]> {
    return Array.from(this.ideas.values())
      .filter(idea => idea.rootIdeaId === rootIdeaId || idea.id === rootIdeaId)
      .sort((a, b) => a.version - b.version);
  }
  
  async createIdea(idea: InsertIdea): Promise<Idea> {
    const id = this.currentIdeaId++;
    const now = new Date();
    
    // If this is a new root idea (not a version of an existing idea)
    // set the rootIdeaId to this idea's id
    const rootIdeaId = idea.rootIdeaId || (idea.parentIdeaId ? null : id);
    
    // Ensure arrays for JSON fields and default values
    const evolutionPath = Array.isArray(idea.evolutionPath) ? idea.evolutionPath : [];
    const feedback = Array.isArray(idea.feedback) ? idea.feedback : [];
    
    const newIdea: Idea = {
      id,
      userId: idea.userId,
      title: idea.title,
      description: idea.description,
      status: idea.status || 'draft',
      tags: idea.tags || [],
      version: idea.version || 1,
      parentIdeaId: idea.parentIdeaId || null,
      rootIdeaId,
      createdAt: now,
      updatedAt: now,
      evolutionPath: evolutionPath,
      metrics: idea.metrics || {},
      feedback: feedback,
      metadata: idea.metadata || {}
    };
    
    this.ideas.set(id, newIdea);
    return newIdea;
  }
  
  async updateIdea(id: number, updates: Partial<InsertIdea>): Promise<Idea> {
    const idea = this.ideas.get(id);
    if (!idea) {
      throw new Error(`Idea with id ${id} not found`);
    }
    
    // Ensure arrays for JSON fields if they are being updated
    let evolutionPath = idea.evolutionPath;
    let feedback = idea.feedback;
    
    if (updates.evolutionPath !== undefined) {
      evolutionPath = Array.isArray(updates.evolutionPath) ? updates.evolutionPath : [];
    }
    
    if (updates.feedback !== undefined) {
      feedback = Array.isArray(updates.feedback) ? updates.feedback : [];
    }
    
    const updatedIdea: Idea = {
      ...idea,
      ...updates,
      id,
      evolutionPath,
      feedback,
      updatedAt: new Date()
    };
    
    this.ideas.set(id, updatedIdea);
    return updatedIdea;
  }
  
  async deleteIdea(id: number): Promise<boolean> {
    // Also remove any thought-idea relations involving this idea
    const relations = Array.from(this.thoughtIdeaRelations.values())
      .filter(relation => relation.ideaId === id);
    
    for (const relation of relations) {
      this.thoughtIdeaRelations.delete(`${relation.thoughtId}-${relation.ideaId}`);
    }
    
    return this.ideas.delete(id);
  }
  
  // Thought-Idea Relations methods
  async getThoughtsByIdeaId(ideaId: number): Promise<Thought[]> {
    const relations = Array.from(this.thoughtIdeaRelations.values())
      .filter(relation => relation.ideaId === ideaId);
    
    const thoughtIds = relations.map(relation => relation.thoughtId);
    const thoughts = Array.from(this.thoughts.values())
      .filter(thought => thoughtIds.includes(thought.id));
    
    return thoughts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getIdeasByThoughtId(thoughtId: number): Promise<Idea[]> {
    const relations = Array.from(this.thoughtIdeaRelations.values())
      .filter(relation => relation.thoughtId === thoughtId);
    
    const ideaIds = relations.map(relation => relation.ideaId);
    const ideas = Array.from(this.ideas.values())
      .filter(idea => ideaIds.includes(idea.id));
    
    return ideas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createThoughtIdeaRelation(relation: InsertThoughtIdeaRelation): Promise<ThoughtIdeaRelation> {
    const id = this.currentRelationId++;
    const now = new Date();
    
    const newRelation: ThoughtIdeaRelation = {
      id,
      createdAt: now,
      thoughtId: relation.thoughtId,
      ideaId: relation.ideaId,
      relationType: relation.relationType || 'associated'
    };
    
    this.thoughtIdeaRelations.set(`${relation.thoughtId}-${relation.ideaId}`, newRelation);
    return newRelation;
  }
  
  async deleteThoughtIdeaRelation(thoughtId: number, ideaId: number): Promise<boolean> {
    return this.thoughtIdeaRelations.delete(`${thoughtId}-${ideaId}`);
  }
  
  // Learning Mode methods
  async updateMessageReasoningSteps(messageId: number, reasoningSteps: ReasoningStep[]): Promise<Message> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error(`Message with id ${messageId} not found`);
    }
    
    const updatedMessage: Message = {
      ...message,
      reasoningSteps: reasoningSteps,
      hasReasoningSteps: reasoningSteps.length > 0
    };
    
    this.messages.set(messageId, updatedMessage);
    return updatedMessage;
  }
  
  async toggleLearningMode(id: string, enabled: boolean): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error(`Conversation with id ${id} not found`);
    }
    
    const updatedConversation: Conversation = {
      ...conversation,
      learningModeEnabled: enabled,
      updatedAt: new Date()
    };
    
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
  
  async getReasoningExplanationsByMessageId(messageId: number): Promise<ReasoningExplanation[]> {
    return this.reasoningExplanations.get(messageId) || [];
  }
  
  async createReasoningExplanation(explanation: InsertReasoningExplanation): Promise<ReasoningExplanation> {
    const id = this.currentExplanationId++;
    const now = new Date();
    
    const newExplanation: ReasoningExplanation = {
      ...explanation,
      id,
      createdAt: now
    };
    
    // Get existing explanations for this message or create an empty array
    const existingExplanations = this.reasoningExplanations.get(explanation.messageId) || [];
    
    // Add the new explanation
    const updatedExplanations = [...existingExplanations, newExplanation];
    
    // Update the map
    this.reasoningExplanations.set(explanation.messageId, updatedExplanations);
    
    return newExplanation;
  }
}

export const storage = new MemStorage();

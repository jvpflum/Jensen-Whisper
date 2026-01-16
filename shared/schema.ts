import { pgTable, serial, text, timestamp, integer, boolean, pgEnum, varchar, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// User schema
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Message role enum
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system', 'tool']);

// Message schema
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  conversationId: text('conversation_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  model: text('model').default('llama-3.1-nemotron-253b-v1'),
  branchId: text('branch_id'),
  reasoningSteps: jsonb('reasoning_steps').default('[]'),
  hasReasoningSteps: boolean('has_reasoning_steps').default(false),
  parentMessageId: integer('parent_message_id'),
});

// Message insert schema
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Conversation schema
export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  userId: text('user_id'),
  createdAt: timestamp('created_at').defaultNow(),
  learningModeEnabled: boolean('learning_mode_enabled').default(false),
});

// Conversation insert schema
export const insertConversationSchema = createInsertSchema(conversations).omit({ createdAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Branch schema
export const branches = pgTable('branches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  conversationId: text('conversation_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  isActive: integer('is_active').default(0),
  rootMessageId: integer('root_message_id'),
});

// Branch insert schema
export const insertBranchSchema = createInsertSchema(branches).omit({ createdAt: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branches.$inferSelect;

// Bookmark schema
export const bookmarks = pgTable('bookmarks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  conversationId: text('conversation_id').notNull(),
  messageId: integer('message_id').notNull(),
  branchId: text('branch_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Bookmark insert schema
export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({ createdAt: true });
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;

// Reasoning explanation schema
export const reasoningExplanations = pgTable('reasoning_explanations', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').notNull(),
  stepIndex: integer('step_index').notNull(),
  explanation: text('explanation').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Reasoning explanation insert schema
export const insertReasoningExplanationSchema = createInsertSchema(reasoningExplanations).omit({ id: true, createdAt: true });
export type InsertReasoningExplanation = z.infer<typeof insertReasoningExplanationSchema>;
export type ReasoningExplanation = typeof reasoningExplanations.$inferSelect;

// Reasoning step schema for the reasoningSteps JSON field
export const reasoningStepSchema = z.object({
  stepIndex: z.number(),
  content: z.string(),
  type: z.enum(['premise', 'reasoning', 'evidence', 'conclusion', 'alternative']),
  isPinned: z.boolean().optional().default(false),
  explanations: z.array(z.object({
    id: z.number().optional(),
    content: z.string(),
    createdAt: z.string().optional()
  })).optional().default([]),
});

export type ReasoningStep = z.infer<typeof reasoningStepSchema>;

// Thought table schema
export const thoughts = pgTable('thoughts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  type: text('type').default('note'),
  tags: text('tags').array().default([]),
  source: text('source').default('user'),
  parentId: integer('parent_id'),
  conversationId: text('conversation_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  extensions: jsonb('extensions').default('{}'),
  connections: jsonb('connections').default('{}'),
  metadata: jsonb('metadata').default('{}'),
});

export const insertThoughtSchema = createInsertSchema(thoughts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertThought = z.infer<typeof insertThoughtSchema>;
export type Thought = typeof thoughts.$inferSelect;

// Idea table schema
export const ideas = pgTable('ideas', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').default('draft'),
  tags: text('tags').array().default([]),
  version: integer('version').default(1),
  parentIdeaId: integer('parent_idea_id'),
  rootIdeaId: integer('root_idea_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  evolutionPath: jsonb('evolution_path').default('[]'),
  metrics: jsonb('metrics').default('{}'),
  feedback: jsonb('feedback').default('[]'),
  metadata: jsonb('metadata').default('{}'),
});

export const insertIdeaSchema = createInsertSchema(ideas).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type Idea = typeof ideas.$inferSelect;

// Thought-Idea relation table
export const thoughtIdeaRelations = pgTable('thought_idea_relations', {
  id: serial('id').primaryKey(),
  thoughtId: integer('thought_id').notNull(),
  ideaId: integer('idea_id').notNull(),
  relationType: text('relation_type').default('reference'),
  createdAt: timestamp('created_at').defaultNow(),
  strength: integer('strength').default(1),
  metadata: jsonb('metadata').default('{}'),
});

export const insertThoughtIdeaRelationSchema = createInsertSchema(thoughtIdeaRelations).omit({ id: true, createdAt: true });
export type InsertThoughtIdeaRelation = z.infer<typeof insertThoughtIdeaRelationSchema>;
export type ThoughtIdeaRelation = typeof thoughtIdeaRelations.$inferSelect;

// Tool schema
export const tools = pgTable('tools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  icon: text('icon').default('tool'),
  parameters: jsonb('parameters').default('[]'),
  requiresApiKey: boolean('requires_api_key').default(false),
  apiKeyField: text('api_key_field'),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: jsonb('metadata').default('{}'),
});

export const insertToolSchema = createInsertSchema(tools).omit({ createdAt: true, updatedAt: true });
export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof tools.$inferSelect;

// Chat API types
export const chatRequestSchema = z.object({
  message: z.string(),
  conversationId: z.string().nullable().optional(),
  reasoningMode: z.boolean().optional(),
  systemPrompt: z.string().optional(),
  parentMessageId: z.number().optional(),
  branchId: z.string().optional(),
  modelId: z.string().optional()
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export type ChatResponse = {
  messageId: number;
  role: string;
  content: string;
  conversationId: string;
  branchId: string | null;
};
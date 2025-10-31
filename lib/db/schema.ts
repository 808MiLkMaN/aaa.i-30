import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  jsonb,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
  decimal,
} from 'drizzle-orm/pg-core';
import type { AppUsage } from '../usage';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
  credits: integer('credits').notNull().default(100), // Starting credits
  isAdmin: boolean('isAdmin').notNull().default(false),
  stripeCustomerId: varchar('stripeCustomerId', { length: 255 }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
  lastContext: jsonb('lastContext').$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

// Credit System Tables
export const creditTransaction = pgTable('CreditTransaction', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  amount: integer('amount').notNull(), // Positive for additions, negative for usage
  type: varchar('type', {
    enum: ['purchase', 'usage', 'admin_grant', 'refund', 'subscription'],
  }).notNull(),
  description: text('description'),
  chatId: uuid('chatId').references(() => chat.id),
  modelUsed: varchar('modelUsed', { length: 100 }),
  tokensUsed: integer('tokensUsed'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type CreditTransaction = InferSelectModel<typeof creditTransaction>;

export const subscription = pgTable('Subscription', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  stripeSubscriptionId: varchar('stripeSubscriptionId', { length: 255 })
    .notNull()
    .unique(),
  stripePriceId: varchar('stripePriceId', { length: 255 }).notNull(),
  status: varchar('status', {
    enum: ['active', 'canceled', 'past_due', 'unpaid'],
  }).notNull(),
  creditsPerMonth: integer('creditsPerMonth').notNull(),
  currentPeriodStart: timestamp('currentPeriodStart').notNull(),
  currentPeriodEnd: timestamp('currentPeriodEnd').notNull(),
  cancelAtPeriodEnd: boolean('cancelAtPeriodEnd').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type Subscription = InferSelectModel<typeof subscription>;

export const modelPricing = pgTable('ModelPricing', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  modelName: varchar('modelName', { length: 100 }).notNull().unique(),
  displayName: varchar('displayName', { length: 255 }).notNull(),
  creditsPerRequest: integer('creditsPerRequest').notNull(), // Base cost
  creditsPerToken: decimal('creditsPerToken', { precision: 10, scale: 6 }), // Optional: per token pricing
  category: varchar('category', {
    enum: ['fast', 'balanced', 'advanced', 'custom'],
  })
    .notNull()
    .default('balanced'),
  description: text('description'),
  isActive: boolean('isActive').notNull().default(true),
  maxTokens: integer('maxTokens'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type ModelPricing = InferSelectModel<typeof modelPricing>;

export const usageLog = pgTable('UsageLog', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  chatId: uuid('chatId').references(() => chat.id),
  messageId: uuid('messageId').references(() => message.id),
  modelUsed: varchar('modelUsed', { length: 100 }).notNull(),
  creditsCharged: integer('creditsCharged').notNull(),
  tokensInput: integer('tokensInput'),
  tokensOutput: integer('tokensOutput'),
  tokensTotal: integer('tokensTotal'),
  duration: integer('duration'), // milliseconds
  status: varchar('status', { enum: ['success', 'error', 'cancelled'] })
    .notNull()
    .default('success'),
  errorMessage: text('errorMessage'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type UsageLog = InferSelectModel<typeof usageLog>;

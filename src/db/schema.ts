import { pgTable, text, serial, integer, timestamp, boolean, jsonb, varchar, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'player', 'league_admin']);
export const gameStatusEnum = pgEnum('game_status', ['setup', 'in_progress', 'paused', 'completed']);
export const answerResultEnum = pgEnum('answer_result', ['correct', 'incorrect', 'passed', 'timeout']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('player'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Quiz files table
export const quizFiles = pgTable('quiz_files', {
  id: serial('id').primaryKey(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  topic: varchar('topic', { length: 255 }).notNull(),
  league: varchar('league', { length: 255 }).notNull(),
  description: text('description'),
  uploadedBy: integer('uploaded_by').notNull().references(() => users.id),
  totalQuestions: integer('total_questions').notNull(),
  totalRounds: integer('total_rounds').notNull(),
  timesPlayed: integer('times_played').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Quiz questions table (parsed from XLSX)
export const quizQuestions = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  quizFileId: integer('quiz_file_id').notNull().references(() => quizFiles.id, { onDelete: 'cascade' }),
  roundNumber: integer('round_number').notNull(),
  playerNumber: integer('player_number').notNull(),
  question: text('question').notNull(),
  questionImageUrl: text('question_image_url'),
  answer: text('answer').notNull(),
  answerImageUrl: text('answer_image_url'),
  orderIndex: integer('order_index').notNull(),
});

// Game sessions table
export const gameSessions = pgTable('game_sessions', {
  id: serial('id').primaryKey(),
  quizFileId: integer('quiz_file_id').notNull().references(() => quizFiles.id),
  hostId: integer('host_id').notNull().references(() => users.id),
  league: varchar('league', { length: 255 }).notNull(),
  topic: varchar('topic', { length: 255 }).notNull(),
  status: gameStatusEnum('status').notNull().default('setup'),
  currentQuestionId: integer('current_question_id').references(() => quizQuestions.id),
  currentPlayerIndex: integer('current_player_index').default(0),
  playerIds: jsonb('player_ids').notNull().$type<number[]>(),
  playerNames: jsonb('player_names').notNull().$type<string[]>(),
  scores: jsonb('scores').notNull().$type<Record<string, number>>(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Player answers table
export const playerAnswers = pgTable('player_answers', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => quizQuestions.id),
  playerId: integer('player_id').notNull().references(() => users.id),
  playerName: varchar('player_name', { length: 255 }).notNull(),
  attemptOrder: integer('attempt_order').notNull(),
  spokenAnswer: text('spoken_answer'),
  result: answerResultEnum('result').notNull(),
  isAddressed: boolean('is_addressed').notNull().default(false),
  timeTaken: integer('time_taken'),
  pointsAwarded: integer('points_awarded').notNull().default(0),
  wasOverruled: boolean('was_overruled').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Overrule events table
export const overruleEvents = pgTable('overrule_events', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => quizQuestions.id),
  originalAnswerId: integer('original_answer_id').notNull().references(() => playerAnswers.id),
  challengerId: integer('challenger_id').notNull().references(() => users.id),
  challengerName: varchar('challenger_name', { length: 255 }).notNull(),
  claimType: varchar('claim_type', { length: 50 }).notNull(),
  originalResult: answerResultEnum('original_result').notNull(),
  newResult: answerResultEnum('new_result').notNull(),
  pointsAdjustment: integer('points_adjustment').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  sessionId: integer('session_id').references(() => gameSessions.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: integer('entity_id'),
  details: jsonb('details').$type<Record<string, any>>(),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  uploadedQuizzes: many(quizFiles),
  hostedSessions: many(gameSessions),
  answers: many(playerAnswers),
  overrules: many(overruleEvents),
}));

export const quizFilesRelations = relations(quizFiles, ({ one, many }) => ({
  uploader: one(users, {
    fields: [quizFiles.uploadedBy],
    references: [users.id],
  }),
  questions: many(quizQuestions),
  sessions: many(gameSessions),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one, many }) => ({
  quizFile: one(quizFiles, {
    fields: [quizQuestions.quizFileId],
    references: [quizFiles.id],
  }),
  answers: many(playerAnswers),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  quizFile: one(quizFiles, {
    fields: [gameSessions.quizFileId],
    references: [quizFiles.id],
  }),
  host: one(users, {
    fields: [gameSessions.hostId],
    references: [users.id],
  }),
  answers: many(playerAnswers),
  overrules: many(overruleEvents),
  auditLogs: many(auditLogs),
}));

export const playerAnswersRelations = relations(playerAnswers, ({ one, many }) => ({
  session: one(gameSessions, {
    fields: [playerAnswers.sessionId],
    references: [gameSessions.id],
  }),
  question: one(quizQuestions, {
    fields: [playerAnswers.questionId],
    references: [quizQuestions.id],
  }),
  player: one(users, {
    fields: [playerAnswers.playerId],
    references: [users.id],
  }),
  overrules: many(overruleEvents),
}));

export const overruleEventsRelations = relations(overruleEvents, ({ one }) => ({
  session: one(gameSessions, {
    fields: [overruleEvents.sessionId],
    references: [gameSessions.id],
  }),
  question: one(quizQuestions, {
    fields: [overruleEvents.questionId],
    references: [quizQuestions.id],
  }),
  originalAnswer: one(playerAnswers, {
    fields: [overruleEvents.originalAnswerId],
    references: [playerAnswers.id],
  }),
  challenger: one(users, {
    fields: [overruleEvents.challengerId],
    references: [users.id],
  }),
}));

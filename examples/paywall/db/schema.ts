import { integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"

type PaymentRequestMetadata = Record<string, any>

export const paymentRequestsTable = pgTable("payment_requests", {
  id: uuid().primaryKey().defaultRandom(),
  price: integer().notNull(),
  metadata: jsonb().$type<PaymentRequestMetadata>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
})

export const creditsTable = pgTable("credits", {
  id: uuid().primaryKey().defaultRandom(),
  paymentRequestId: uuid().notNull(),
  initialCredits: integer().notNull(),
  remainingCredits: integer().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
})

import { integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentRequestMetadata = Record<string, any>

// This table stores payment requests that we generate. Whenever any of the
// endpoints receives a Receipt, we should check to see that the Receipt
// corresponds to a Payment Request we generated.
export const paymentRequestsTable = pgTable("payment_requests", {
  id: uuid().primaryKey().defaultRandom(),
  price: integer().notNull(),
  metadata: jsonb().$type<PaymentRequestMetadata>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
})

// This table stores credits that can be used by the image generation endpoints
export const creditsTable = pgTable("credits", {
  id: uuid().primaryKey().defaultRandom(),
  paymentRequestId: uuid().notNull(),
  initialCredits: integer().notNull(),
  remainingCredits: integer().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
})

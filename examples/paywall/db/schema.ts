import { integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"

type PaymentRequestMetadata = {
  credits: number
}

export const paymentRequestsTable = pgTable("payment_requests", {
  id: uuid().primaryKey().defaultRandom(),
  price: integer().notNull(),
  metadata: jsonb().$type<PaymentRequestMetadata>(),
  createdAt: timestamp("created_at").notNull().defaultNow()
})

export const receiptsTable = pgTable("receipts", {
  id: uuid().primaryKey().defaultRandom(),
  credits: integer().notNull(),
  creditsRemaining: integer().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
})

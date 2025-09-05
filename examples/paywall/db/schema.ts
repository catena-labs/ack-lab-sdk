import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core"

type PaymentRequestTokenMetadata = {
  credits: number
}

export const paymentRequestTokensTable = pgTable("payment_request_tokens", {
  id: uuid().primaryKey().defaultRandom(),
  // id: varchar("id").primaryKey(),
  price: integer().notNull(),
  metadata: jsonb().$type<PaymentRequestTokenMetadata>(),
  createdAt: timestamp("created_at").notNull().defaultNow()
})

export const receiptsTable = pgTable("receipts", {
  id: uuid().primaryKey().defaultRandom(),
  // id: varchar("id").primaryKey(),
  credits: integer().notNull(),
  creditsRemaining: integer().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
})

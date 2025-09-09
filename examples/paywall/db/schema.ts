import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentRequestMetadata = Record<string, any>

// This table stores payment requests that we generate. Whenever any of the
// endpoints receives a Receipt, we should check to see that the Receipt
// corresponds to a Payment Request we generated.
export const paymentRequestsTable = sqliteTable("payment_requests", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  price: integer().notNull(),
  metadata: text({ mode: "json" }).$type<PaymentRequestMetadata>().notNull(),
  createdAt: integer({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
})

// This table stores credits that can be used by the image generation endpoints
export const creditsTable = sqliteTable("credits", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  paymentRequestId: text().notNull(),
  initialCredits: integer().notNull(),
  remainingCredits: integer().notNull(),
  createdAt: integer({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
})

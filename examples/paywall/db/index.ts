import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"

const sqlite = new Database(process.env.DATABASE_PATH || "./paywall.db")
export const db = drizzle({ client: sqlite })

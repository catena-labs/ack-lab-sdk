import { db } from "@/db"
import { receiptsTable } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { getDbPaymentRequestToken } from "./payment-request-tokens"

export async function getOrCreateDbReceipt(receiptId: string) {
  const receipt = await db
    .select()
    .from(receiptsTable)
    .where(eq(receiptsTable.id, receiptId))

  if (receipt.length === 0) {
    //check to see if we ever made a PRT for this receipt
    const prt = await getDbPaymentRequestToken(receiptId)

    if (!prt) {
      throw new Error("Payment request token not found")
    }

    const credits = prt.metadata!.credits

    return await db
      .insert(receiptsTable)
      .values({ id: receiptId, credits, creditsRemaining: credits })
      .returning()
      .then((receipt) => receipt[0])
  }

  return receipt[0]
}

//each time a receipt is used, decrement the credits remaining
export async function consumeReceiptCredit(receiptId: string) {
  await db
    .update(receiptsTable)
    .set({ creditsRemaining: sql`"receipts"."creditsRemaining" - 1` })
    .where(eq(receiptsTable.id, receiptId))
}

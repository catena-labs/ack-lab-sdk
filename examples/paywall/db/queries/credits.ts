import { db } from "@/db"
import { creditsTable } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { getDbPaymentRequest } from "./payment-requests"

/**
 * Gets a credit from the database, or creates it if it doesn't exist.
 * A Credit will only be created if a PaymentRequest exists for it.
 * @param paymentRequestId
 * @returns
 */
export async function getOrCreateCredits(paymentRequestId: string) {
  const receipt = await db
    .select()
    .from(creditsTable)
    .where(eq(creditsTable.paymentRequestId, paymentRequestId))

  if (receipt.length === 0) {
    //check to see if we ever made a PRT for this receipt
    const prt = await getDbPaymentRequest(paymentRequestId)

    if (!prt) {
      throw new Error("Payment request not found")
    }

    const credits = prt.metadata.credits

    return await db
      .insert(creditsTable)
      .values({
        paymentRequestId,
        initialCredits: credits,
        remainingCredits: credits
      })
      .returning()
      .then((receipt) => receipt[0])
  }

  return receipt[0]
}

/**
 * Each time a receipt is used, decrement the credits remaining
 * @param receiptId
 */
export async function consumeReceiptCredit(receiptId: string) {
  await db
    .update(creditsTable)
    .set({ remainingCredits: sql`${creditsTable.remainingCredits} - 1` })
    .where(eq(creditsTable.id, receiptId))
}

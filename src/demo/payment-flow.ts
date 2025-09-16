import colors from "yoctocolors"
import { AckLabAgent } from "../agent"

async function main() {
  const sellerClient = new AckLabAgent({
    clientId: "<client-id>",
    clientSecret: "<client-secret>",
    agentId: "<seller-agent-id>"
  })

  const buyerClient = new AckLabAgent({
    clientId: "<client-id>",
    clientSecret: "<client-secret>",
    agentId: "<buyer-agent-id>"
  })

  const { paymentRequestToken } = await sellerClient.createPaymentRequest({
    id: "test-payment-request",
    amount: 1,
    currencyCode: "USD",
    description: "Test payment"
  })

  console.log(colors.green("paymentRequestToken"), paymentRequestToken)

  const { receipt } = await buyerClient.executePayment(paymentRequestToken)

  console.log(colors.green("payment receipt"), receipt)

  const { paymentRequestId } = await sellerClient.verifyPaymentReceipt(receipt)

  console.log(
    colors.green("validated payment receipt for payment request: "),
    paymentRequestId
  )
}

main().catch(console.error)

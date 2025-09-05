import colors from "yoctocolors"
import { AckLabSdk } from "../sdk"

async function main() {
  const sellerClient = new AckLabSdk({
    clientId: "<client-id>",
    clientSecret: "<client-secret>"
  })

  const buyerClient = new AckLabSdk({
    clientId: "<client-id>",
    clientSecret: "<client-secret>"
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

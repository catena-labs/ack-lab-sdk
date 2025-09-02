import { AckLabSdk } from "@ack-lab/sdk"

// we only sell a single product
const product = {
  id: "adama",
  title: "Research on William Adama",
  description: "All his wildest secrets",
  price: 10,
  content:
    "This is the super secret document you just paid all that money for. TL;DR: William Adama has no secrets."
}

export const sdk = new AckLabSdk({
  clientId: process.env.ACK_LAB_CLIENT_ID!,
  clientSecret: process.env.ACK_LAB_CLIENT_SECRET!
})

export async function processMessage({
  message,
  data
}: {
  message?: string
  data?: unknown
}) {
  const { receipt } = (data as { receipt: string }) || {}

  if (receipt) {
    console.log("Counterparty has sent a receipt:")
    console.log(receipt)

    //FIXME: verify the receipt here

    return {
      message: `Thank you for your purchase! Here is your research`,
      data: {
        research: product.content
      }
    }
  } else {
    console.log("No receipt was sent, sending back a payment request token")

    //FIXME: we should be able to create a payment request with a product ID but description is the only field we can set
    const { paymentRequestToken } = await sdk.createPaymentRequest(
      product.price * 100,
      {
        description: `Purchase ${product.title}`,
        currencyCode: "USD"
      }
    )

    return {
      message: `The product is available for $${product.price}. Here is a Payment Request Token you can use to purchase it.`,
      data: {
        paymentRequestToken
      }
    }
  }
}

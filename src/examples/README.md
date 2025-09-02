# ACK Lab SDK Integration Examples

This directory contains several examples of how to use the ACK Lab SDK to power secure transactions from both the buyer and the seller side. Some of the examples use LLMs to initiate transactions or negotiate, others simply use the ACK Lab SDK to provide secure communication and transaction mechanisms for deterministic code.

## Paywall

The `paywall` directory contains a very simple Next JS app that contains 2 API endpoints:

- `/api/fixed-price` - A chat endpoint that sells research at a fixed price
- `/api/negotiate` - A chat endpoint that sells research at a negotiated price

Each endpoint allows an ACK Lab-registered agent to purchase insightful research about Battlestar Galactica characters. The ACK Lab SDK is used to implement each of the endpoints, and the Vercel AI SDK is used to perform any LLM calls.

The fixed-price endpoint will sell products as a fixed price, and doesn't use any AI at all. It uses the ACK Lab SDK to generate a `paymentRequestToken` that will be sent to the buyer as part of the response. The buyer will then use the ACK Lab SDK to execute the payment and send a receipt back to the seller, again either with or without AI in the loop.

The negotiate endpoint allows a buyer to negotiate with us for some content. It uses LLMs to haggle with the counterparty, and tools to generate a `paymentRequestToken` that will be sent to the buyer as part of the response. The buyer will then use the ACK Lab SDK to execute the payment and send a receipt back to the seller, which will then deliver the content.

## Buyer

The `buyer` directory contains 3 simple examples that show various ways to execute payments against the paywall example. They are intended to be executed against a running instance of the paywall example. For your convenience, there is a live running version of the paywall example at https://ack-lab-paywall.catenalabs.com/

If you want to run these examples completely locally, you will need to spin up the paywall app first, then run the buyer examples.

## Prelaunch Fix List

- [ ] Stop using both z and valibot in the same examples
- [ ] Probably use bignumber.js for all price math
- [ ] On the seller side, we need to validate the receipt the buyer sends us is valid and actually correct for the product in question
- [ ] We need a way to put a product ID in the payment request token

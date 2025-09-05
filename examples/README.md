# ACK Lab SDK Integration Examples

This directory contains several examples of how to use the ACK Lab SDK to power secure transactions from both the buyer and the seller side. Some of the examples use LLMs to initiate transactions or negotiate, others simply use the ACK Lab SDK to provide secure communication and transaction mechanisms for deterministic code.

## Paywall

The `paywall` directory contains a very simple Next JS app that contains various API endpoints:

- `/api/chat/fixed-price` - A chat endpoint that sells research at a fixed price
- `/api/chat/negotiate` - A chat endpoint that sells research at a negotiated price
- `/api/fixed-price` - A simple non-chat HTTP endpoint that sells research at a fixed price
- `/api/images/buy` - An API endpoint that sells image generation credits via a Payment Request Token
- `/api/images/generate` - An API endpoint that generates images when a buyer presents a valid receipt

Each endpoint allows an ACK Lab-registered agent to purchase insightful research about Battlestar Galactica characters. The ACK Lab SDK is used to implement each of the endpoints, and the Vercel AI SDK is used to perform any LLM calls.

The fixed-price endpoint will sell products as a fixed price, and doesn't use any AI at all. It uses the ACK Lab SDK to generate a `paymentRequestToken` that will be sent to the buyer as part of the response. The buyer will then use the ACK Lab SDK to execute the payment and send a receipt back to the seller, again either with or without AI in the loop.

The negotiate endpoint allows a buyer to negotiate with us for some content. It uses LLMs to haggle with the counterparty, and tools to generate a `paymentRequestToken` that will be sent to the buyer as part of the response. The buyer will then use the ACK Lab SDK to execute the payment and send a receipt back to the seller, which will then deliver the content.

## Buyer

The `buyer` directory contains 3 simple examples that show various ways to execute payments against the paywall example. They are intended to be executed against a running instance of the paywall example. For your convenience, there is a live running version of the paywall example at https://ack-lab-paywall.catenalabs.com/

If you want to run these examples completely locally, you will need to spin up the paywall app first, then run the buyer examples.

## Prelaunch Fix List

- [ ] P1: On the seller side, we need to validate the receipt the buyer sends us is valid and actually correct for the product in question
- [ ] P1: We need a way to put a product ID in the payment request token
- [x] P1: Probably use bigint for all price math
- [ ] P2: Stop using both z and valibot in the same examples
- [ ] P2: The seller side should keep the message history in state (though this could be a third endpoint that builds on the /api/negotiate endpoint)
- [x] P2: Negotiating buyer should not have a hard-coded price threshold in `assessCounterOffer`
- [ ] P2: Constructing a PRT I pass in a decimals = 2 dollar amount (e.g. 10 ^ 2) but on Receipt I get decimals = 6 (e.g. 10 ^ 6)
- [ ] P3: It's syntactically valid to call verifyPaymentRequestToken without passing in a resolver, but this always seems to throw

## Future Examples

- [x] Vanilla HTTP 402 endpoint (as opposed to the existing chat endpoints)
- [ ] Interactions with more than 2 agents (perhaps one buyer who wants a complex thing done, plus a seller who delegates to contractor agents)
- [ ] Arbitrage? Perhaps an Arb agent who negotiates with multiple sellers to get the best price, then sells to the buyer at a premium
- [ ] Crypto Swap example (a la Joao)
- [ ] MCP Examples
- [ ] Cart example (add multiple things to a cart, then pay for it)
- [ ] Single-use receipt for something like an image generation
- [ ] Multi-use receipt - e.g. buyer gets a 10-pack of images for a discount, uses 1 by 1
- [ ] Subscription example - access to a resource for X amount of time

## Thoughts / Questions

- Our PRT endpoint in ACK Lab turns USD into SOL - seems non-obvious to devs

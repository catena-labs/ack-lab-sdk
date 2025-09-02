# ACK Lab Paywal Demo

This directory contains a very simple Next JS app that just consists of 2 API endpoints:

/api/fixed-price - A chat endpoint that sells research at a fixed price
/api/negotiate - A chat endpoint that sells research at a negotiated price

Each endpoint allows an ACK Lab-registered agent to purchase insightful research about Battlestar Galactica characters. The ACK Lab SDK is used to implement each of the endpoints, and the Vercel AI SDK is used to perform any LLM calls.

The fixed-price endpoint will sell products as a fixed price, and doesn't use any AI at all. It uses the ACK Lab SDK to generate a `paymentRequestToken` that will be sent to the buyer as part of the response. The buyer will then use the ACK Lab SDK to execute the payment and send a receipt back to the seller, again either with or without AI in the loop.

The negotiate endpoint allows a buyer to negotiate with us for some content. It uses LLMs to haggle with the counterparty, and tools to generate a `paymentRequestToken` that will be sent to the buyer as part of the response. The buyer will then use the ACK Lab SDK to execute the payment and send a receipt back to the seller, which will then deliver the content.

## Setting up

All you need to run the seller API is a free ACK Lab account and an ACK Lab Agent with an API key. Go to https://ack-lab.catenalabs.com/, sign in, and create a new agent called "Paywall". Create an API key for the agent and copy the client ID and client secret into the .env file:

```
ACK_LAB_CLIENT_ID=your-client-id
ACK_LAB_CLIENT_SECRET=your-client-secret
```

## Running the demo

Install the dependencies and run the app:

```bash
pnpm install
pnpm run dev
```

By default, the app will run on http://localhost:3000, which now gives you a chat interface to interact with the seller API.

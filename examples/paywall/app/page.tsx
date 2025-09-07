"use client"

import { useState } from "react"

interface CopyButtonProps {
  text: string
  label?: string
}

function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
    >
      {copied ? "Copied!" : label}
    </button>
  )
}

interface CodeBlockProps {
  children: string
  language?: string
}

function CodeBlock({ children, language = "bash" }: CodeBlockProps) {
  return (
    <div className="relative bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400 text-xs uppercase">{language}</span>
        <CopyButton text={children} />
      </div>
      <pre className="overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  )
}

interface EndpointCardProps {
  title: string
  path: string
  description: string
  detailedSummary: string
  buyerScript: string
  readmeLink: string
}

function EndpointCard({
  title,
  path,
  description,
  detailedSummary,
  buyerScript,
  readmeLink
}: EndpointCardProps) {
  const baseUrl = `https://github.com/catena-labs/ack-lab-sdk/tree/main/examples/paywall`

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <code className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
          {path}
        </code>
      </div>

      <p className="text-gray-600 mb-4">{description}</p>

      <div className="text-gray-700 mb-6 leading-relaxed whitespace-pre-line">
        {detailedSummary}
      </div>

      <div className="space-y-3">
        <div>
          <span className="font-medium text-gray-700">Test with: </span>
          <div className="mt-2">
            <CodeBlock>{buyerScript}</CodeBlock>
          </div>
        </div>

        <div>
          <button
            onClick={() => window.open(`${baseUrl}${readmeLink}`, "_blank")}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium cursor-pointer"
          >
            View endpoint README &amp; code →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const endpoints = [
    {
      title: "Simple HTTP Commerce",
      path: "/api/fixed-price",
      description:
        "The most basic ACK Lab SDK implementation - handles both payment requests and product delivery in a single endpoint.",
      detailedSummary: `This endpoint represents the simplest possible implementation of digital commerce using the ACK Lab SDK. It demonstrates the fundamental pattern of payment request generation and receipt validation in a single, straightforward HTTP endpoint.

When a buyer makes a request without a receipt, the endpoint creates a payment request in the database first, then generates an ACK Lab Payment Request Token (PRT) for exactly $10. The buyer receives this PRT with a 402 "Payment Required" status code, indicating that payment is needed to access the content.

After the buyer pays using the PRT and receives a receipt, they submit it back to the same endpoint. The system then performs two-step validation: first cryptographically verifying the receipt's authenticity, then checking the database to ensure the payment request was actually created by this seller. Upon successful validation, the buyer receives their digital product immediately.

This pattern is ideal for developers who want to understand the core ACK Lab SDK concepts without additional complexity from agent communication or AI systems.`,
      buyerScript: "cd examples/buyer && pnpm run buy-fixed-price",
      readmeLink: "/app/api/fixed-price/README.md"
    },
    {
      title: "Conversational Fixed-Price Sales",
      path: "/api/chat/fixed-price",
      description:
        "Demonstrates secure agent-to-agent communication for selling research at a fixed price.",
      detailedSummary: `This endpoint showcases the ACK Lab SDK's secure agent-to-agent communication capabilities for digital commerce. Unlike the simple HTTP endpoint, this implementation uses structured messaging between buyer and seller agents with schema validation and encrypted communication.

The seller agent processes incoming messages using predefined schemas that validate both input and output formats. When a buyer agent sends an initial message requesting research, the seller responds with product information and automatically generates a Payment Request Token, which is sent back through the secure messaging channel rather than as a direct HTTP response.

The ACK Lab SDK handles all the complexities of secure communication, including JWT token validation, message encryption/decryption, and ensuring messages conform to the expected schemas. This creates a robust foundation for more sophisticated agent-to-agent commerce scenarios.

After payment, the buyer agent submits the receipt through the same secure messaging channel. The seller validates the receipt and delivers the research content as a structured response. This pattern demonstrates how digital commerce can be conducted entirely through secure agent communication without exposing sensitive payment details in HTTP responses.`,
      buyerScript: "cd examples/buyer && pnpm run buy-chat-fixed-price",
      readmeLink: "/app/api/chat/fixed-price/README.md"
    },
    {
      title: "AI-Powered Price Negotiation",
      path: "/api/chat/negotiate",
      description:
        "Shows autonomous AI agents negotiating prices within business constraints using GPT-4o.",
      detailedSummary: `This endpoint demonstrates one of the most sophisticated patterns in the ACK Lab SDK examples: autonomous AI-to-AI price negotiation. The seller agent uses GPT-4o with carefully crafted business rules to negotiate prices while maintaining profitability constraints.

The AI seller is programmed with specific negotiation parameters, including a maximum discount limit of 50% and instructions to balance revenue optimization with customer retention. When buyers initiate negotiations, the AI evaluates offers, makes counteroffers, and autonomously decides when to accept deals based on its business logic.

The system integrates LLM decision-making with the ACK Lab SDK's payment infrastructure through custom tools. When the AI decides to accept an offer or make a counteroffer, it automatically calls the createPaymentRequest tool, which generates a Payment Request Token for the negotiated amount. This seamless integration allows the AI to conduct complete business transactions without human intervention.

The negotiation process maintains conversation state across multiple rounds, enabling sophisticated back-and-forth discussions. The AI can reference previous offers, build rapport with buyers, and make strategic pricing decisions. Once a price is agreed upon, the standard ACK Lab payment and receipt validation process ensures secure transaction completion.`,
      buyerScript: "cd examples/buyer && pnpm run negotiate",
      readmeLink: "/app/api/chat/negotiate/README.md"
    },
    {
      title: "Credit-Based Purchasing",
      path: "/api/images/buy",
      description:
        "Implements bulk credit purchasing where buyers pre-pay for image generation rights.",
      detailedSummary: `This endpoint implements a credit-based commerce system where buyers can purchase usage rights in bulk before consuming services. It demonstrates how to handle variable quantities, metadata tracking, and prepaid service models using the ACK Lab SDK.

When buyers request credits, they specify the quantity they want to purchase. The system calculates the total cost at $1 per credit and creates a payment request with detailed metadata including the number of credits and product information. This metadata becomes crucial later when the receipt is redeemed for actual service consumption.

The endpoint showcases dynamic pricing calculations and flexible payment request generation. Unlike fixed-price endpoints, this system can handle any quantity of credits, making it suitable for bulk purchasing scenarios. The database stores not just the payment request details but also the specific credit allocation, enabling precise tracking of what buyers have purchased.

This pattern is particularly valuable for services where usage and payment are separated in time. Buyers can purchase credits when convenient, then consume them gradually as needed. The system maintains a complete audit trail of credit purchases, which integrates seamlessly with the consumption endpoint to provide usage tracking and balance management.`,
      buyerScript: "cd examples/buyer && pnpm run images",
      readmeLink: "/app/api/images/buy/README.md"
    },
    {
      title: "Credit Consumption Service",
      path: "/api/images/generate",
      description:
        "Consumes purchased credits to generate AI images using DALL-E 3, with usage tracking.",
      detailedSummary: `This endpoint demonstrates how to implement pay-per-use services with credit tracking and consumption. It integrates AI image generation capabilities with the ACK Lab SDK's payment verification system to create a complete usage-based service.

When buyers submit receipts along with image generation requests, the system first validates the receipt cryptographically, then checks the database to ensure the payment request was created by this seller. It then queries the credits system to determine how many credits remain on the receipt, preventing overuse and ensuring buyers only consume what they've paid for.

The endpoint integrates with OpenAI's DALL-E 3 API to generate high-quality images based on buyer specifications. However, generation only occurs after successful credit verification, ensuring that computational resources are only used for legitimate, paid requests. Each successful generation consumes exactly one credit from the buyer's balance.

The system maintains precise usage tracking through database updates that decrement the remaining credit count. This creates a complete audit trail of credit consumption and prevents double-spending or unauthorized usage. The same receipt can be used multiple times until credits are exhausted, providing flexibility for buyers while maintaining strict usage controls for sellers.`,
      buyerScript: "cd examples/buyer && pnpm run images",
      readmeLink: "/app/api/images/generate/README.md"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ACK Lab SDK Paywall Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            This Next.js application implements 5 different ACK Lab SDK patterns
            as API endpoints. Each endpoint demonstrates a different approach to
            digital commerce, from simple HTTP transactions to AI-powered
            negotiations.
          </p>
        </div>

        {/* Getting Started */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-12">
          <h2 className="text-2xl font-semibold text-blue-900 mb-4">
            Getting Started
          </h2>
          <p className="text-blue-800 mb-4">
            The paywall is running and ready to accept requests. Test any
            endpoint using the corresponding buyer scripts:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-blue-900 mb-2">
                1. Install buyer dependencies:
              </h3>
              <CodeBlock>cd examples/buyer && pnpm install</CodeBlock>
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">
                2. Run any buyer example (inside examples/buyer dir):
              </h3>
              <CodeBlock>pnpm run buy-fixed-price</CodeBlock>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            API Endpoints
          </h2>
          <div className="grid gap-8">
            {endpoints.map((endpoint, index) => (
              <EndpointCard key={index} {...endpoint} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

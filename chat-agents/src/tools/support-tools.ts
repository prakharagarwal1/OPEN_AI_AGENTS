import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";

const tickets: Map<string, { id: string; title: string; description: string; priority: string; status: string; createdAt: string }> = new Map();

export async function createTicket(input: Record<string, unknown>): Promise<string> {
  const { title, description, priority, category } = input as {
    title: string;
    description: string;
    priority: string;
    category?: string;
  };

  if (!title || !description || !priority) {
    return "Error: title, description, and priority are required";
  }

  const ticket = {
    id: uuidv4(),
    title,
    description,
    priority,
    category: category || "general",
    status: "open",
    createdAt: new Date().toISOString(),
  };

  tickets.set(ticket.id, ticket);
  logger.info("Support ticket created", { ticketId: ticket.id });

  return JSON.stringify(ticket, null, 2);
}

export async function knowledgeSearch(input: Record<string, unknown>): Promise<string> {
  const { query } = input as { query: string };
  if (!query) return "Error: No query provided";

  const knowledgeBase: Record<string, string> = {
    password: "To reset your password, go to Settings > Security > Change Password. You will receive a verification email.",
    billing: "Billing questions can be addressed at Settings > Billing. We accept credit cards and PayPal.",
    api: "API keys can be generated in Settings > Developers > API Keys. Keys are scoped to specific permissions.",
    account: "For account issues, please contact support@company.com or use the contact form in your dashboard.",
    security: "We recommend enabling two-factor authentication in Settings > Security > 2FA.",
  };

  const queryLower = query.toLowerCase();
  const matches: string[] = [];

  for (const [key, answer] of Object.entries(knowledgeBase)) {
    if (queryLower.includes(key)) {
      matches.push(answer);
    }
  }

  if (matches.length === 0) {
    return "No relevant knowledge base articles found. A support ticket has been suggested.";
  }

  return matches.join("\n\n---\n\n");
}
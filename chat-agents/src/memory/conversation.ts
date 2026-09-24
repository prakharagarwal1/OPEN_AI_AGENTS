import { v4 as uuidv4 } from "uuid";
import { redisClient } from "./redis";
import { logger } from "../utils/logger";

export interface Conversation {
  id: string;
  userId?: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    agentId?: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

class ConversationManager {
  private readonly TTL = 3600;
  private cache: Map<string, Conversation> = new Map();

  async create(userId?: string, metadata?: Record<string, unknown>): Promise<Conversation> {
    const conversation: Conversation = {
      id: uuidv4(),
      userId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
    };

    await this.save(conversation);
    logger.info("Conversation created", { conversationId: conversation.id });
    return conversation;
  }

  async get(conversationId: string): Promise<Conversation | null> {
    const cached = this.cache.get(conversationId);
    if (cached) return cached;

    const data = await redisClient.get(`conversation:${conversationId}`);
    if (!data) return null;

    const conversation = JSON.parse(data) as Conversation;
    this.cache.set(conversationId, conversation);
    return conversation;
  }

  async save(conversation: Conversation): Promise<void> {
    conversation.updatedAt = new Date().toISOString();
    this.cache.set(conversation.id, conversation);
    await redisClient.set(
      `conversation:${conversation.id}`,
      JSON.stringify(conversation),
      this.TTL
    );
  }

  async addMessage(
    conversationId: string,
    message: Conversation["messages"][number]
  ): Promise<void> {
    const conversation = await this.get(conversationId);
    if (!conversation) {
      logger.warn("Conversation not found for addMessage", { conversationId });
      return;
    }

    conversation.messages.push(message);
    await this.save(conversation);
  }

  async delete(conversationId: string): Promise<boolean> {
    this.cache.delete(conversationId);
    await redisClient.del(`conversation:${conversationId}`);
    await redisClient.del(`chat:history:${conversationId}`);
    logger.info("Conversation deleted", { conversationId });
    return true;
  }

  async list(userId?: string): Promise<Conversation[]> {
    const pattern = `conversation:*`;
    const keys = await redisClient.keys(pattern);
    if (!keys) return [];

    const conversations: Conversation[] = [];
    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        const conv = JSON.parse(data) as Conversation;
        if (!userId || conv.userId === userId) {
          conversations.push(conv);
        }
      }
    }

    return conversations.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const conversationManager = new ConversationManager();
export default conversationManager;
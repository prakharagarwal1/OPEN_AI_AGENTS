import { v4 as uuidv4 } from "uuid";
import { redisClient } from "./redis";
import { logger } from "../utils/logger";

export interface VoiceConversation {
  id: string;
  userId?: string;
  transcript: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    audioUrl?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

class VoiceConversationManager {
  private readonly TTL = 7200;
  private cache: Map<string, VoiceConversation> = new Map();

  async create(userId?: string, metadata?: Record<string, unknown>): Promise<VoiceConversation> {
    const conversation: VoiceConversation = {
      id: uuidv4(),
      userId,
      transcript: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
    };

    await this.save(conversation);
    logger.info("Voice conversation created", { conversationId: conversation.id });
    return conversation;
  }

  async get(conversationId: string): Promise<VoiceConversation | null> {
    const cached = this.cache.get(conversationId);
    if (cached) return cached;

    const data = await redisClient.get(`voice:conversation:${conversationId}`);
    if (!data) return null;

    const conversation = JSON.parse(data) as VoiceConversation;
    this.cache.set(conversationId, conversation);
    return conversation;
  }

  async save(conversation: VoiceConversation): Promise<void> {
    conversation.updatedAt = new Date().toISOString();
    this.cache.set(conversation.id, conversation);
    await redisClient.set(
      `voice:conversation:${conversation.id}`,
      JSON.stringify(conversation),
      this.TTL
    );
  }

  async addEntry(
    conversationId: string,
    entry: VoiceConversation["transcript"][number]
  ): Promise<void> {
    const conversation = await this.get(conversationId);
    if (!conversation) {
      logger.warn("Conversation not found for addEntry", { conversationId });
      return;
    }

    conversation.transcript.push(entry);
    await this.save(conversation);
  }

  async delete(conversationId: string): Promise<boolean> {
    this.cache.delete(conversationId);
    await redisClient.del(`voice:conversation:${conversationId}`);
    logger.info("Voice conversation deleted", { conversationId });
    return true;
  }

  async list(userId?: string): Promise<VoiceConversation[]> {
    const pattern = `voice:conversation:*`;
    const keys = await redisClient.keys(pattern);
    if (!keys) return [];

    const conversations: VoiceConversation[] = [];
    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        const conv = JSON.parse(data) as VoiceConversation;
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

export const voiceConversationManager = new VoiceConversationManager();
export default voiceConversationManager;
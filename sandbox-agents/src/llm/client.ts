import OpenAI from "openai";
import { config } from "../config";
import { logger } from "../utils/logger";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

class LLMClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
      baseURL: config.OPENAI_BASE_URL,
    });
  }

  async chat(params: {
    messages: ChatCompletionMessageParam[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    conversationId?: string;
  }): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const { messages, model, temperature, maxTokens, conversationId } = params;

    try {
      const completion = await this.client.chat.completions.create({
        model: model || config.OPENAI_MODEL,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 4096,
      });

      return completion;
    } catch (error) {
      logger.error("LLM chat completion failed", error as Error, { conversationId });
      throw error;
    }
  }

  async streamChat(params: {
    messages: ChatCompletionMessageParam[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    onToken: (token: string) => void;
    conversationId?: string;
  }): Promise<string> {
    const { messages, model, temperature, maxTokens, onToken, conversationId } = params;

    try {
      const stream = await this.client.chat.completions.create({
        model: model || config.OPENAI_MODEL,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 4096,
        stream: true,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || "";
        if (token) {
          fullResponse += token;
          onToken(token);
        }
      }

      return fullResponse;
    } catch (error) {
      logger.error("LLM stream chat failed", error as Error, { conversationId });
      throw error;
    }
  }
}

export const llmClient = new LLMClient();
export default llmClient;
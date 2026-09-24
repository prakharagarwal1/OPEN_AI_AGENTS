import OpenAI from "openai";
import { config } from "../config";
import { logger } from "../utils/logger";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

class VoiceLLMClient {
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
        max_tokens: maxTokens ?? 1024,
      });

      return completion;
    } catch (error) {
      logger.error("Voice LLM chat failed", error as Error, { conversationId });
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
        max_tokens: maxTokens ?? 1024,
        stream: true,
      });

      let fullContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullContent += content;
          onToken(content);
        }
      }

      return fullContent;
    } catch (error) {
      logger.error("Voice LLM stream chat failed", error as Error, { conversationId });
      throw error;
    }
  }
}

export const llmClient = new VoiceLLMClient();
export default llmClient;
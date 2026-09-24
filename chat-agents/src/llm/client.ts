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
    tools?: OpenAI.Chat.ChatCompletionTool[];
    toolChoice?: OpenAI.Chat.ChatCompletionToolChoiceOption;
    stream?: boolean;
    conversationId?: string;
  }): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const { messages, model, temperature, maxTokens, tools, toolChoice, stream = false, conversationId } = params;

    try {
      const completion = await this.client.chat.completions.create({
        model: model || config.OPENAI_MODEL,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 4096,
        tools,
        tool_choice: toolChoice,
        stream,
      });

      if (stream) {
        // For streaming callers, collect the stream into a single ChatCompletion
        return this.collectStream(completion as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>);
      }

      return completion as OpenAI.Chat.Completions.ChatCompletion;
    } catch (error) {
      logger.error("LLM chat completion failed", error as Error, { conversationId });
      throw error;
    }
  }

  private async collectStream(stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    let id = "";
    let created = 0;
    let model = "";
    let object: "chat.completion" = "chat.completion";
    let content = "";
    let finishReason: string | null = null;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    for await (const chunk of stream) {
      id = id || chunk.id;
      created = created || chunk.created;
      model = model || chunk.model;
      const choice = chunk.choices[0];
      if (choice) {
        if (choice.delta.content) content += choice.delta.content;
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens ?? 0;
        completionTokens = chunk.usage.completion_tokens ?? 0;
        totalTokens = chunk.usage.total_tokens ?? 0;
      }
    }

    return {
      id,
      created,
      model,
      object,
      choices: [{
        index: 0,
        message: { role: "assistant", content },
        finish_reason: finishReason,
      }],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
      },
    } as unknown as OpenAI.Chat.Completions.ChatCompletion;
  }

  async streamChat(params: {
    messages: ChatCompletionMessageParam[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: OpenAI.Chat.ChatCompletionTool[];
    onToken: (token: string) => void;
    onToolCall?: (toolCall: OpenAI.Chat.Completions.ChatCompletionChunkToolCall) => void;
    conversationId?: string;
  }): Promise<string> {
    const { messages, model, temperature, maxTokens, tools, onToken, onToolCall, conversationId } = params;

    try {
      const stream = await this.client.chat.completions.create({
        model: model || config.OPENAI_MODEL,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 4096,
        tools,
        stream: true,
      });

      let fullContent = "";
      const toolCalls: Record<number, { name: string; arguments: string }> = {};

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        const delta = choice.delta;
        if (delta.content) {
          fullContent += delta.content;
          onToken(delta.content);
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCalls[tc.index]) {
              toolCalls[tc.index] = { name: "", arguments: "" };
            }
            const entry = toolCalls[tc.index];
            if (!entry) continue;
            const fn = tc.function;
            if (fn?.name) {
              entry.name += fn.name;
            }
            if (fn?.arguments) {
              entry.arguments += fn.arguments;
              onToolCall?.(tc);
            }
          }
        }
      }

      return fullContent;
    } catch (error) {
      logger.error("LLM stream chat failed", error as Error, { conversationId });
      throw error;
    }
  }

  async embed(params: {
    input: string | string[];
    model?: string;
  }): Promise<number[][]> {
    const { input, model = "text-embedding-3-small" } = params;
    try {
      const response = await this.client.embeddings.create({
        model,
        input,
      });
      return response.data.map((d) => d.embedding);
    } catch (error) {
      logger.error("Embedding failed", error as Error);
      throw error;
    }
  }
}

export const llmClient = new LLMClient();
export default llmClient;
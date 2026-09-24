import { llmClient } from "../llm/client";

export async function summarize(input: Record<string, unknown>): Promise<string> {
  const { text, maxLength } = input as { text: string; maxLength?: number };
  if (!text) return "Error: No text provided";

  const maxLen = maxLength || 200;
  const words = text.split(/\s+/);
  if (words.length <= maxLen) {
    return text;
  }

  try {
    const completion = await llmClient.chat({
      messages: [
        {
          role: "system",
          content: `Summarize the following text in approximately ${maxLen} words. Focus on key points and main ideas.`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.3,
      maxTokens: 512,
    });

    return completion.choices[0]?.message?.content || "Could not summarize";
  } catch (error) {
    return `Error summarizing: ${(error as Error).message}`;
  }
}
import { webSearch } from "./web-search";
import { executeCode } from "./code-executor";
import { readFile, writeFile } from "./file-ops";
import { calculate } from "./calculator";
import { summarize } from "./summarizer";
import { createTicket, knowledgeSearch } from "./support-tools";

export const toolRegistry: Record<string, (input: Record<string, unknown>) => Promise<string>> = {
  web_search: webSearch,
  execute_code: executeCode,
  read_file: readFile,
  write_file: writeFile,
  calculate,
  summarize,
  create_ticket: createTicket,
  knowledge_search: knowledgeSearch,
};

export function getToolExecutor(name: string) {
  return toolRegistry[name];
}

export function listTools(): string[] {
  return Object.keys(toolRegistry);
}
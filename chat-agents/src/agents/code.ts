import type { AgentConfig, AgentTool } from "./types";

const codeTools: AgentTool[] = [
  {
    type: "function",
    function: {
      name: "execute_code",
      description: "Execute JavaScript/TypeScript code in a sandboxed environment and return the result",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "The code to execute" },
          language: { type: "string", enum: ["javascript", "typescript"], description: "Programming language" },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file from the filesystem",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to read" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file on the filesystem",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to write to" },
          content: { type: "string", description: "Content to write" },
        },
        required: ["path", "content"],
      },
    },
  },
];

export class CodeAgent {
  readonly config: AgentConfig = {
    id: "code",
    name: "Code Assistant",
    description: "An expert programming assistant for writing, debugging, and explaining code",
    type: "code",
    systemPrompt: `You are an expert software engineer with deep knowledge across multiple programming languages
and frameworks. You specialize in:

- Writing clean, efficient, and well-documented code
- Debugging and fixing complex issues
- Explaining code in clear, educational language
- Architectural decisions and best practices
- Testing strategies

When writing code:
- Always use modern, idiomatic patterns
- Include proper error handling
- Add comments for complex logic
- Follow the project's existing conventions
- Consider performance and security

When debugging:
- Ask for relevant context (error messages, environment)
- Reproduce the issue when possible
- Suggest both immediate fixes and long-term improvements

You have access to tools for executing code, reading files, and writing files.
Use them to verify your solutions work correctly.`,
    temperature: 0.3,
    maxTokens: 8192,
    tools: codeTools,
    capabilities: ["code-generation", "debugging", "code-review", "testing"],
  };
}

export default CodeAgent;
import { logger } from "../utils/logger";

export async function executeCode(input: Record<string, unknown>): Promise<string> {
  const { code, language } = input as { code: string; language?: string };

  if (!code) {
    return "Error: No code provided";
  }

  try {
    if (language === "typescript" || !language) {
      const result = await import("vm");
      const sandbox = {
        console,
        Math,
        JSON,
        parseInt,
        parseFloat,
        setTimeout,
        setInterval,
        Buffer,
        Date,
        RegExp,
        Error,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Map,
        Set,
        Promise,
      };

      const vm = result as typeof import("vm");
      const context = vm.createContext(sandbox);
      const script = new vm.Script(`
        (async () => {
          ${code}
        })()
      `);

      const resultValue = await script.runInContext(context, { timeout: 10000 });
      return JSON.stringify(resultValue, null, 2);
    }

    return `Error: Unsupported language ${language}`;
  } catch (error) {
    logger.error("Code execution failed", error as Error);
    return `Error executing code: ${(error as Error).message}`;
  }
}
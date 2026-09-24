import { promises as fs } from "fs";
import { resolve } from "path";
import { logger } from "../utils/logger";

const ALLOWED_DIR = process.cwd();

export async function readFile(input: Record<string, unknown>): Promise<string> {
  const { path } = input as { path: string };
  if (!path) return "Error: No path provided";

  const fullPath = resolve(ALLOWED_DIR, path);
  if (!fullPath.startsWith(ALLOWED_DIR)) {
    return "Error: Access denied - path is outside allowed directory";
  }

  try {
    const content = await fs.readFile(fullPath, "utf-8");
    return content;
  } catch (error) {
    logger.error("File read failed", error as Error, { path });
    return `Error reading file: ${(error as Error).message}`;
  }
}

export async function writeFile(input: Record<string, unknown>): Promise<string> {
  const { path, content } = input as { path: string; content: string };
  if (!path) return "Error: No path provided";
  if (content === undefined) return "Error: No content provided";

  const fullPath = resolve(ALLOWED_DIR, path);
  if (!fullPath.startsWith(ALLOWED_DIR)) {
    return "Error: Access denied - path is outside allowed directory";
  }

  try {
    await fs.mkdir(resolve(fullPath, ".."), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
    return `File written successfully: ${path}`;
  } catch (error) {
    logger.error("File write failed", error as Error, { path });
    return `Error writing file: ${(error as Error).message}`;
  }
}
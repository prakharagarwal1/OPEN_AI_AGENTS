export async function calculate(input: Record<string, unknown>): Promise<string> {
  const { expression } = input as { expression: string };
  if (!expression) return "Error: No expression provided";

  try {
    const sanitized = expression.replace(/[^0-9+\-*/().\s^%a-zA-Z_]/g, "");
    const result = eval(sanitized);
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return `Error calculating: ${(error as Error).message}`;
  }
}
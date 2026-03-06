import type { ToolCall } from "@/components/tool-calls-display";

/**
 * Parse tool calls from the streaming markdown content
 * Looks for patterns like:
 *
 * **Tool called:** `tool_name`
 * **Input:**
 * ```json
 * {...}
 * ```
 * **Output:**
 * ```json
 * {...}
 * ```
 */
export function parseToolCallsFromMarkdown(content: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  // Match tool call blocks
  const toolBlockRegex = /\*\*Tool called:\*\* `([^`]+)`\s*\*\*Input:\*\*\s*```json\s*([\s\S]*?)```\s*(?:\*\*Output:\*\*\s*```json\s*([\s\S]*?)```)?/g;

  let match;
  let index = 0;

  while ((match = toolBlockRegex.exec(content)) !== null) {
    const [, toolName, paramsJson, resultJson] = match;

    try {
      const params = JSON.parse(paramsJson.trim());
      const result = resultJson ? JSON.parse(resultJson.trim()) : undefined;

      // Determine status based on whether we have a result
      const status: ToolCall["status"] = resultJson ? "completed" : "running";

      toolCalls.push({
        id: `tool-${index}-${toolName}`,
        name: toolName,
        status,
        params,
        result,
        duration: result?.duration || undefined,
      });

      index++;
    } catch (error) {
      // If JSON parsing fails, skip this tool call
      console.warn("Failed to parse tool call:", error);
    }
  }

  return toolCalls;
}

/**
 * Remove tool call blocks from markdown content
 * to avoid displaying them twice
 */
export function stripToolCallsFromMarkdown(content: string): string {
  // Remove the entire ## 🔧 Tool Execution section
  return content.replace(
    /## 🔧 Tool Execution\s*[\s\S]*?(?=##|$)/g,
    ""
  ).trim();
}

/**
 * Check if content contains tool execution section
 */
export function hasToolCalls(content: string): boolean {
  return content.includes("## 🔧 Tool Execution");
}

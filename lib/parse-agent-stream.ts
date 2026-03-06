/**
 * Parse streaming agent output into structured format for StreamingAgentDisplay
 */

export type ReadEvent = {
  type: "read";
  file: string;
  duration?: number;
};

export type ThoughtEvent = {
  type: "thought";
  content: string;
  duration?: number;
};

export type ToolEvent = {
  type: "tool";
  name: string;
  status: "running" | "completed" | "error";
  input?: Record<string, any>;
  output?: any;
  duration?: number;
};

export type StreamingAgentState = {
  reads: ReadEvent[];
  thoughts: ThoughtEvent[];
  tools: ToolEvent[];
  response: string;
  isStreaming: boolean;
};

/**
 * Parse markdown stream and extract structured agent state
 */
export function parseAgentStream(markdown: string): StreamingAgentState {
  const state: StreamingAgentState = {
    reads: [],
    thoughts: [],
    tools: [],
    response: "",
    isStreaming: false,
  };

  // Extract Planning/Thought section
  const planningMatch = markdown.match(
    /## 📋 Loan Assessment Planning\s*([\s\S]*?)(?=##|$)/
  );
  if (planningMatch) {
    state.thoughts.push({
      type: "thought",
      content: planningMatch[1].trim(),
    });
  }

  // Extract tool calls
  const toolBlockRegex =
    /\*\*Tool called:\*\* `([^`]+)`\s*\*\*Input:\*\*\s*```json\s*([\s\S]*?)```\s*(?:\*\*Output:\*\*\s*```json\s*([\s\S]*?)```)?/g;

  let toolMatch;
  while ((toolMatch = toolBlockRegex.exec(markdown)) !== null) {
    const [, toolName, inputJson, outputJson] = toolMatch;

    try {
      const input = JSON.parse(inputJson.trim());
      const output = outputJson ? JSON.parse(outputJson.trim()) : undefined;

      state.tools.push({
        type: "tool",
        name: toolName,
        status: outputJson ? "completed" : "running",
        input,
        output,
      });
    } catch (error) {
      // If parsing fails, skip
      console.warn("Failed to parse tool:", error);
    }
  }

  // Extract final analysis/response (after tool execution)
  const analysisMatch = markdown.match(
    /## 📊 Credit Analysis\s*([\s\S]*?)$/
  );
  if (analysisMatch) {
    state.response = analysisMatch[1].trim();
  } else {
    // If no analysis section yet, check for any content after tools
    const afterTools = markdown.split("---\n\n").pop();
    if (afterTools && !afterTools.includes("**Tool called:**")) {
      state.response = afterTools.trim();
    }
  }

  return state;
}

/**
 * Check if markdown contains agent workflow sections
 */
export function hasAgentWorkflow(markdown: string): boolean {
  return (
    markdown.includes("## 📋 Loan Assessment Planning") ||
    markdown.includes("## 🔧 Tool Execution")
  );
}

/**
 * Strip agent workflow sections from markdown
 * Returns only the final response/analysis
 */
export function stripAgentWorkflow(markdown: string): string {
  // Remove planning section
  let cleaned = markdown.replace(
    /## 📋 Loan Assessment Planning\s*[\s\S]*?(?=##|$)/,
    ""
  );

  // Remove tool execution section
  cleaned = cleaned.replace(/## 🔧 Tool Execution\s*[\s\S]*?(?=##|$)/, "");

  return cleaned.trim();
}

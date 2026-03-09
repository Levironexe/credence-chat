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

export type ContentSection = {
  type: "thought" | "tools" | "text";
  content?: string;
  tools?: ToolEvent[];
};

export type StreamingAgentState = {
  reads: ReadEvent[];
  thoughts: ThoughtEvent[];
  tools: ToolEvent[];
  response: string;
  isStreaming: boolean;
  // Ordered sections to preserve interleaved structure
  sections: ContentSection[];
};

/**
 * Parse markdown stream and extract structured agent state with ordered sections
 */
export function parseAgentStream(markdown: string): StreamingAgentState {
  const state: StreamingAgentState = {
    reads: [],
    thoughts: [],
    tools: [],
    response: "",
    isStreaming: false,
    sections: [],
  };

  // Step 1: Extract thought section if present
  // NOTE: Thought extraction disabled - we don't stream true internal LLM reasoning yet.
  // Planning content will be treated as regular text instead.
  // Keeping this logic commented for future internal reasoning feature.

  /*
  const planningMatch = markdown.match(
    /## Loan Assessment Planning\s*([\s\S]*?)(?=##|\*\*Tool called:|$)/
  );

  if (planningMatch) {
    const thoughtContent = planningMatch[1].trim();
    state.thoughts.push({
      type: "thought",
      content: thoughtContent,
    });
    state.sections.push({
      type: "thought",
      content: thoughtContent,
    });

    // Remove the planning section from remaining content
    remainingContent = markdown.substring(planningMatch.index! + planningMatch[0].length);
  }
  */

  let remainingContent = markdown;

  // Step 2: Parse the rest into interleaved sections (text, tools, text, tools...)
  // Split by tool blocks while keeping track of positions
  const toolBlockRegex =
    /\*\*Tool called:\*\* `([^`]+)`\s*\*\*Input:\*\*\s*```json\s*([\s\S]*?)```\s*(?:\*\*Output:\*\*\s*```json\s*([\s\S]*?)```)?(?:\s*---\s*)?/g;

  let lastIndex = 0;
  let toolMatch;
  const toolsInSection: ToolEvent[] = [];

  while ((toolMatch = toolBlockRegex.exec(remainingContent)) !== null) {
    // Add text content before this tool (if any)
    if (toolMatch.index > lastIndex) {
      const textContent = remainingContent.substring(lastIndex, toolMatch.index).trim();
      if (textContent) {
        state.sections.push({
          type: "text",
          content: textContent,
        });
      }
    }

    // Parse the tool
    const [, toolName, inputJson, outputJson] = toolMatch;
    try {
      const input = JSON.parse(inputJson.trim());
      const output = outputJson ? JSON.parse(outputJson.trim()) : undefined;

      const toolEvent: ToolEvent = {
        type: "tool",
        name: toolName,
        status: outputJson ? "completed" : "running",
        input,
        output,
      };

      state.tools.push(toolEvent);
      toolsInSection.push(toolEvent);
    } catch (error) {
      console.warn(` Failed to parse tool:`, toolName, error);
    }

    lastIndex = toolMatch.index + toolMatch[0].length;
  }

  // Add tools section if we found any tools
  if (toolsInSection.length > 0) {
    state.sections.push({
      type: "tools",
      tools: toolsInSection,
    });
  }

  // Add remaining text after last tool
  if (lastIndex < remainingContent.length) {
    const textContent = remainingContent.substring(lastIndex).trim();
    if (textContent) {
      state.sections.push({
        type: "text",
        content: textContent,
      });
    }
  }

  console.log(`📊 Total sections: ${state.sections.length}`, state.sections.map(s => s.type));
  console.log(`📊 Total tools parsed: ${state.tools.length}`);

  return state;
}

/**
 * Check if markdown contains agent workflow sections
 */
export function hasAgentWorkflow(markdown: string): boolean {
  return (
    markdown.includes("## Loan Assessment Planning") ||
    markdown.includes("## Tool Execution") ||
    markdown.includes("**Tool called:**")
  );
}

/**
 * Strip agent workflow sections from markdown
 * Returns only the final response/analysis
 */
export function stripAgentWorkflow(markdown: string): string {
  console.log("🧹 stripAgentWorkflow called, input length:", markdown.length);

  // Remove planning section
  let cleaned = markdown.replace(
    /## Loan Assessment Planning\s*[\s\S]*?(?=##|$)/,
    ""
  );

  // Remove tool execution section (entire section with all tool calls)
  cleaned = cleaned.replace(/##  Tool Execution\s*[\s\S]*?(?=##|$)/, "");

  // Remove ALL tool call blocks - matches from "**Tool called:**" until next tool or section
  // This handles cases where Output might not have a code block or might just say "Tool called: X"
  // Also removes the --- separator after each tool
  cleaned = cleaned.replace(
    /\*\*Tool called:\*\*[^]*?(?:---\s*)?(?=\*\*Tool called:\*\*|##|$)/g,
    ""
  );

  // Clean up multiple consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  console.log("🧹 After strip, output length:", cleaned.length);
  console.log("🧹 Still has tool calls:", cleaned.includes("**Tool called:**"));

  return cleaned.trim();
}

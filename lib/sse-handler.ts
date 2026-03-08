/**
 * SSE Event Handler for Credence AI
 *
 * Handles structured SSE events from the backend and routes them to appropriate UI sections.
 *
 * Event types:
 * - text: User-facing text (main response area)
 * - reasoning: Internal LLM reasoning (collapsible section)
 * - tool_call: Tool execution start (collapsible section)
 * - tool_result: Tool execution result (collapsible section)
 * - node_start: Node execution start (collapsible section header)
 * - skip: Node skipped notification (muted note)
 */

export interface SSEChunk {
  type: "text" | "reasoning" | "tool_call" | "tool_result" | "node_start" | "skip";
  choices: [{ delta: { content: string } }];
  // Type-specific fields
  node?: string;
  message?: string;
  tool?: string;
  input?: Record<string, any>;
  output?: any;
}

export interface CollapsibleSection {
  id: string;
  type: "node" | "tool" | "reasoning";
  title: string;
  content: string;
  isOpen: boolean;
  isStreaming: boolean;
}

export class SSEEventHandler {
  private collapsibleSections: CollapsibleSection[] = [];
  private currentSection: CollapsibleSection | null = null;
  private mainResponse: string = "";
  private onUpdate: () => void;

  constructor(onUpdate: () => void) {
    this.onUpdate = onUpdate;
  }

  /**
   * Handle incoming SSE chunk
   */
  handleChunk(chunk: SSEChunk) {
    switch (chunk.type) {
      case "node_start":
        this.handleNodeStart(chunk);
        break;

      case "reasoning":
        this.handleReasoning(chunk);
        break;

      case "tool_call":
        this.handleToolCall(chunk);
        break;

      case "tool_result":
        this.handleToolResult(chunk);
        break;

      case "skip":
        this.handleSkip(chunk);
        break;

      case "text":
        this.handleText(chunk);
        break;
    }

    this.onUpdate();
  }

  /**
   * Start a new collapsible section for a node
   */
  private handleNodeStart(chunk: SSEChunk) {
    // Check if we already have a section for this node (prevent duplicates)
    const existingSection = this.collapsibleSections.find(
      (s) => s.type === "node" && s.title === chunk.message
    );

    if (existingSection) {
      // Reopen existing section instead of creating duplicate
      existingSection.isOpen = true;
      existingSection.isStreaming = true;
      this.currentSection = existingSection;
      return;
    }

    // Close previous section
    if (this.currentSection) {
      this.currentSection.isOpen = false;
      this.currentSection.isStreaming = false;
    }

    // Create new section
    const section: CollapsibleSection = {
      id: `${chunk.node}-${Date.now()}`,
      type: "node",
      title: chunk.message || "",
      content: "",
      isOpen: true,
      isStreaming: true,
    };

    this.collapsibleSections.push(section);
    this.currentSection = section;
  }

  /**
   * Append reasoning text to current collapsible section
   */
  private handleReasoning(chunk: SSEChunk) {
    // Get content from either new format (content) or old format (choices[0].delta.content)
    const content = (chunk as any).content || chunk.choices?.[0]?.delta?.content || "";

    if (this.currentSection) {
      this.currentSection.content += content;
    } else {
      // No section open, create a generic reasoning section
      const section: CollapsibleSection = {
        id: `reasoning-${Date.now()}`,
        type: "reasoning",
        title: `🧠 ${chunk.node || "Reasoning"}`,
        content: content,
        isOpen: true,
        isStreaming: true,
      };
      this.collapsibleSections.push(section);
      this.currentSection = section;
    }
  }

  /**
   * Start a new tool call collapsible section
   */
  private handleToolCall(chunk: SSEChunk) {
    // Close previous section if it's not a tool section
    if (this.currentSection && this.currentSection.type !== "tool") {
      this.currentSection.isOpen = false;
      this.currentSection.isStreaming = false;
    }

    const section: CollapsibleSection = {
      id: `tool-${chunk.tool}-${Date.now()}`,
      type: "tool",
      title: `🔧 ${chunk.tool}`,
      content: `**Input:**\n\`\`\`json\n${JSON.stringify(chunk.input, null, 2)}\n\`\`\`\n\n*Waiting for result...*`,
      isOpen: true,
      isStreaming: true,
    };

    this.collapsibleSections.push(section);
    this.currentSection = section;
  }

  /**
   * Update tool section with result
   */
  private handleToolResult(chunk: SSEChunk) {
    // Find the matching tool section
    const section = [...this.collapsibleSections]
      .reverse()
      .find((s) => s.type === "tool" && s.title.includes(chunk.tool || ""));

    if (section) {
      section.content = `**Input:**\n\`\`\`json\n${JSON.stringify(chunk.input, null, 2)}\n\`\`\`\n\n**Output:**\n\`\`\`json\n${chunk.output}\n\`\`\``;
      section.isStreaming = false;
      section.isOpen = false; // Auto-collapse after completion
    }
  }

  /**
   * Add a skip note to current section
   */
  private handleSkip(chunk: SSEChunk) {
    if (this.currentSection) {
      this.currentSection.content += `\n\n*${chunk.message}*`;
    } else {
      // Add as a standalone muted note
      const section: CollapsibleSection = {
        id: `skip-${Date.now()}`,
        type: "node",
        title: "ℹ️ Info",
        content: chunk.message || "",
        isOpen: false,
        isStreaming: false,
      };
      this.collapsibleSections.push(section);
    }
  }

  /**
   * Append text to main response area
   */
  private handleText(chunk: SSEChunk) {
    // Close current section when user-facing text starts
    if (this.currentSection) {
      this.currentSection.isOpen = false;
      this.currentSection.isStreaming = false;
      this.currentSection = null;
    }

    // Get content from either new format (content) or old format (choices[0].delta.content)
    const content = (chunk as any).content || chunk.choices?.[0]?.delta?.content || "";
    this.mainResponse += content;
  }

  /**
   * Get current state for rendering
   */
  getState() {
    return {
      collapsibleSections: this.collapsibleSections,
      mainResponse: this.mainResponse,
      isStreaming: this.currentSection?.isStreaming || false,
    };
  }

  /**
   * Reset state for new message
   */
  reset() {
    this.collapsibleSections = [];
    this.currentSection = null;
    this.mainResponse = "";
    this.onUpdate();
  }
}

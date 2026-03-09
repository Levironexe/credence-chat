/**
 * SSE Event Handler for Credence AI
 *
 * Handles structured SSE events from the backend and builds a parts array.
 *
 * Event types:
 * - text: User-facing text → text part
 * - reasoning: Internal LLM reasoning → reasoning part
 * - tool_call: Tool execution start → tool-call part
 * - tool_result: Tool execution result → updates tool-call to tool-result
 * - node_start: Node execution start → node-start part
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

// Part types for the parts array
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool-call"; name: string; input: Record<string, any> }
  | { type: "tool-result"; name: string; input: Record<string, any>; output: any; isError?: boolean }
  | { type: "reasoning"; content: string; node?: string }
  | { type: "node-start"; title: string; node: string };

// Deprecated: kept for backwards compatibility
export interface CollapsibleSection {
  id: string;
  type: "node" | "tool" | "reasoning";
  title: string;
  content: string;
  isOpen: boolean;
  isStreaming: boolean;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  eventType: "text" | "section";
  textContent?: string;
  section?: CollapsibleSection;
}

export class SSEEventHandler {
  private parts: MessagePart[] = [];
  private currentReasoningPart: MessagePart | null = null;
  private onUpdate: () => void;

  // Deprecated: kept for backwards compatibility
  private collapsibleSections: CollapsibleSection[] = [];
  private currentSection: CollapsibleSection | null = null;
  private mainResponse: string = "";
  private timeline: TimelineEvent[] = [];

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
   * Start a new node - add node-start part
   */
  private handleNodeStart(chunk: SSEChunk) {
    const part: MessagePart = {
      type: "node-start",
      title: chunk.message || "",
      node: chunk.node || "",
    };
    this.parts.push(part);

    // Backwards compatibility: maintain old timeline structure
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
    this.timeline.push({
      id: section.id,
      timestamp: Date.now(),
      eventType: "section",
      section: section,
    });
  }

  /**
   * Add reasoning content - append to existing reasoning part or create new one
   */
  private handleReasoning(chunk: SSEChunk) {
    const content = (chunk as any).content || chunk.choices?.[0]?.delta?.content || "";

    // Check if last part is a reasoning part we can append to
    const lastPart = this.parts[this.parts.length - 1];
    if (lastPart && lastPart.type === "reasoning") {
      lastPart.content += content;
    } else {
      // Create new reasoning part
      const part: MessagePart = {
        type: "reasoning",
        content: content,
        node: chunk.node,
      };
      this.parts.push(part);
      this.currentReasoningPart = part;
    }

    // Backwards compatibility
    if (this.currentSection) {
      this.currentSection.content += content;
    } else {
      const section: CollapsibleSection = {
        id: `reasoning-${Date.now()}`,
        type: "reasoning",
        title: ` ${chunk.node || "Reasoning"}`,
        content: content,
        isOpen: true,
        isStreaming: true,
      };
      this.collapsibleSections.push(section);
      this.currentSection = section;
      this.timeline.push({
        id: section.id,
        timestamp: Date.now(),
        eventType: "section",
        section: section,
      });
    }
  }

  /**
   * Add tool call - creates tool-call part
   */
  private handleToolCall(chunk: SSEChunk) {
    const part: MessagePart = {
      type: "tool-call",
      name: chunk.tool || "",
      input: chunk.input || {},
    };
    this.parts.push(part);

    // Backwards compatibility
    if (this.currentSection && this.currentSection.type !== "tool") {
      this.currentSection.isOpen = false;
      this.currentSection.isStreaming = false;
    }
    const section: CollapsibleSection = {
      id: `tool-${chunk.tool}-${Date.now()}`,
      type: "tool",
      title: ` ${chunk.tool}`,
      content: `**Input:**\n\`\`\`json\n${JSON.stringify(chunk.input, null, 2)}\n\`\`\`\n\n*Waiting for result...*`,
      isOpen: true,
      isStreaming: true,
    };
    this.collapsibleSections.push(section);
    this.currentSection = section;
    this.timeline.push({
      id: section.id,
      timestamp: Date.now(),
      eventType: "section",
      section: section,
    });
  }

  /**
   * Update tool section with result - converts most recent tool-call to tool-result
   */
  private handleToolResult(chunk: SSEChunk) {
    // Find the most recent tool-call part matching this tool name
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const part = this.parts[i];
      if (part.type === "tool-call" && part.name === chunk.tool) {
        // Convert tool-call to tool-result
        const resultPart: MessagePart = {
          type: "tool-result",
          name: part.name,
          input: part.input,
          output: chunk.output,
          isError: false,
        };
        this.parts[i] = resultPart;
        break;
      }
    }

    // Backwards compatibility
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

    // Append to existing text part or create new one
    const lastPart = this.parts[this.parts.length - 1];
    if (lastPart && lastPart.type === "text") {
      lastPart.text += content;
    } else {
      const part: MessagePart = {
        type: "text",
        text: content,
      };
      this.parts.push(part);
    }

    // Backwards compatibility
    this.mainResponse += content;

    // Push text event to timeline
    this.timeline.push({
      id: `text-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      eventType: "text",
      textContent: content,
    });
  }

  /**
   * Get current state for rendering
   */
  getState() {
    return {
      parts: this.parts,
      // Deprecated: kept for backwards compatibility
      collapsibleSections: this.collapsibleSections,
      mainResponse: this.mainResponse,
      timeline: this.timeline,
      isStreaming: this.currentSection?.isStreaming || false,
    };
  }

  /**
   * Reset state for new message
   */
  reset() {
    this.parts = [];
    this.currentReasoningPart = null;
    // Deprecated: kept for backwards compatibility
    this.collapsibleSections = [];
    this.currentSection = null;
    this.mainResponse = "";
    this.timeline = [];
    this.onUpdate();
  }
}

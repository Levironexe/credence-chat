"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Brain,
  Wrench,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "./elements/tool";

const NODE_LABELS: Record<string, string> = {
  classify: "Classifying query",
  data_completeness: "Checking data completeness",
  planning: "Planning analysis",
  credit_scoring: "Computing credit score",
  explainability: "Analyzing score factors",
  fairness_check: "Validating fairness",
  counterfactual_generation: "Generating improvement paths",
  response: "Generating report",
};

interface PipelinePart {
  type: string;
  data?: any;
}

function ReasoningBlock({ content, node }: { content: string; node?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden text-muted-foreground">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 py-1"
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <div className="group relative w-3.5 h-3.5">
            <Brain className="w-3.5 h-3.5 text-muted-foreground group-hover:hidden" />
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hidden group-hover:block" />
          </div>
        )}
        <span className="text-sm text-muted-foreground">
          {node ? `Thinking (${node.replace(/_/g, " ")})` : "Thinking"}
        </span>
      </button>

      {isOpen && (
        <div className="border-l border-muted-foreground/20 ml-1.5 px-4 py-2">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
        </div>
      )}
    </div>
  );
}

function NodeStartBlock({ title, node }: { title: string; node: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-muted-foreground">
      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
      <span className="text-sm">
        {title || NODE_LABELS[node] || node.replace(/_/g, " ")}
      </span>
    </div>
  );
}

/**
 * Build an ordered list of display items from streaming parts,
 * preserving the original streaming order. tool_call and tool_result
 * for the same tool name are merged into a single entry (in the
 * position of the first tool_call).
 */
type DisplayItem =
  | { kind: "node"; title: string; node: string }
  | { kind: "reasoning"; content: string; node?: string }
  | {
      kind: "tool";
      name: string;
      input: Record<string, any>;
      output?: any;
      isError?: boolean;
      hasResult: boolean;
    };

function buildOrderedItems(parts: PipelinePart[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  const toolIndexMap = new Map<string, number>(); // tool name -> index in items[]

  for (const part of parts) {
    if (part.type === "data-node-start" && part.data) {
      items.push({ kind: "node", title: part.data.title, node: part.data.node });
    } else if (part.type === "data-reasoning" && part.data) {
      items.push({ kind: "reasoning", content: part.data.content, node: part.data.node });
    } else if (part.type === "data-tool-call" && part.data) {
      const { name, input } = part.data;
      if (!toolIndexMap.has(name)) {
        toolIndexMap.set(name, items.length);
        items.push({ kind: "tool", name, input: input || {}, hasResult: false });
      }
    } else if (part.type === "data-tool-result" && part.data) {
      const { name, input, output, isError } = part.data;
      const idx = toolIndexMap.get(name);
      if (idx !== undefined) {
        const existing = items[idx] as Extract<DisplayItem, { kind: "tool" }>;
        existing.output = output;
        existing.isError = isError;
        existing.hasResult = true;
      } else {
        toolIndexMap.set(name, items.length);
        items.push({ kind: "tool", name, input: input || {}, output, isError, hasResult: true });
      }
    }
  }

  return items;
}

export function PipelineDisplay({
  parts,
  isLoading,
}: {
  parts: PipelinePart[];
  isLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (parts.length === 0) return null;

  const items = buildOrderedItems(parts);
  const toolCount = items.filter((i) => i.kind === "tool").length;
  const nodeCount = items.filter((i) => i.kind === "node").length;

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/20 hover:bg-muted/30 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <Wrench className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Analysis Pipeline
          {toolCount > 0 && ` \u2022 ${toolCount} tool${toolCount > 1 ? "s" : ""}`}
          {nodeCount > 0 && ` \u2022 ${nodeCount} step${nodeCount > 1 ? "s" : ""}`}
        </span>
        {isLoading && (
          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin ml-auto" />
        )}
        {!isLoading && parts.length > 0 && (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 py-2 space-y-1">
          {items.map((item, index) => {
            if (item.kind === "node") {
              return (
                <NodeStartBlock
                  key={`item-${index}`}
                  title={item.title}
                  node={item.node}
                />
              );
            }

            if (item.kind === "reasoning") {
              return (
                <ReasoningBlock
                  key={`item-${index}`}
                  content={item.content}
                  node={item.node}
                />
              );
            }

            if (item.kind === "tool") {
              return (
                <Tool defaultOpen={false} key={`item-${index}`}>
                  <ToolHeader
                    state={item.hasResult ? (item.isError ? "output-error" : "output-available") : "input-available"}
                    type={`tool-${item.name}` as any}
                  />
                  <ToolContent>
                    <ToolInput input={item.input} />
                    {item.hasResult && (
                      <ToolOutput
                        errorText={item.isError ? "Tool execution failed" : undefined}
                        output={
                          <pre className="whitespace-pre-wrap p-3 text-xs font-mono">
                            {typeof item.output === "string"
                              ? item.output
                              : JSON.stringify(item.output, null, 2)}
                          </pre>
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}

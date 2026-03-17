"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  ChevronDown,
  ChevronRight,
  Brain,
  Box,
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
  metric_extraction: "Extracting metric overrides",
  fetch_merchant_data: "Fetching merchant profile",
  document_ingestion: "Processing documents",
  data_completeness: "Loading applicant data",
  planning: "Planning analysis",
  credit_scoring: "Computing credit score",
  explainability: "Analyzing score factors",
  fairness_check: "Checking lending fairness",
  counterfactual_generation: "Generating improvement paths",
  analysis: "Synthesizing findings",
  response: "Generating report",
};

interface PipelinePart {
  type: string;
  data?: any;
}

function ReasoningContent({ content }: { content: string }) {
  return (
    <div className="border-l border-muted-foreground/20 ml-1.5 mt-1 px-4 py-2">
      <div className="text-sm text-muted-foreground/70 prose prose-sm prose-invert max-w-none
        prose-headings:text-muted-foreground/70 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
        prose-p:my-1 prose-p:leading-snug
        prose-strong:text-muted-foreground/70 prose-strong:font-semibold
        prose-ul:my-1 prose-ul:pl-4 prose-li:my-0.5
        prose-ol:my-1 prose-ol:pl-4
        prose-hr:border-muted-foreground/20 prose-hr:my-2">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

function ElapsedTimer({ startedAt, isActive }: { startedAt: number; isActive: boolean }) {
  const [elapsed, setElapsed] = useState(() => (Date.now() - startedAt) / 1000);

  useEffect(() => {
    if (!isActive) {
      setElapsed((Date.now() - startedAt) / 1000);
      return;
    }
    const id = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, 100);
    return () => clearInterval(id);
  }, [isActive, startedAt]);

  return (
    <span className="shrink-0 font-mono text-xs text-muted-foreground/60">
      {elapsed.toFixed(1)}s
    </span>
  );
}

function NodeStartBlock({
  title,
  node,
  startedAt,
  isActive,
  reasoning,
}: {
  title: string;
  node: string;
  startedAt: number;
  isActive: boolean;
  reasoning?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (reasoning) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 py-1 text-muted-foreground hover:text-muted-foreground/80"
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )}
          <Brain className="w-3 h-3 shrink-0 text-muted-foreground/60" />
          <span className="text-sm">
            {title || NODE_LABELS[node] || node.replace(/_/g, " ")}
          </span>
          <ElapsedTimer startedAt={startedAt} isActive={isActive} />
        </button>
        {isOpen && <ReasoningContent content={reasoning} />}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1 text-muted-foreground">
      <Box className="w-3 h-3 shrink-0" />
      <span className="text-sm">
        {title || NODE_LABELS[node] || node.replace(/_/g, " ")}
      </span>
      <ElapsedTimer startedAt={startedAt} isActive={isActive} />
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
  | { kind: "node"; title: string; node: string; reasoning?: string }
  | { kind: "reasoning"; content: string; node?: string } // fallback: orphan reasoning
  | {
      kind: "tool";
      name: string;
      input: Record<string, any>;
      output?: any;
      isError?: boolean;
      hasResult: boolean;
    };

// These nodes are no-ops in the current deployment and add noise to the trace.
// fetch_merchant_data: MCP tools disabled, hits fallback immediately.
// analysis: pure pass-through; response node does all report generation.
const SKIP_NODES = new Set(["fetch_merchant_data", "analysis"]);

function buildOrderedItems(parts: PipelinePart[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  const toolIndexMap = new Map<string, number>(); // tool name -> index in items[]

  for (const part of parts) {
    if (part.type === "data-node-start" && part.data) {
      if (SKIP_NODES.has(part.data.node)) continue;
      items.push({ kind: "node", title: part.data.title, node: part.data.node });
    } else if (part.type === "data-reasoning" && part.data) {
      // Attach reasoning to its parent node item if one exists with the same node name
      const parentNode = part.data.node
        ? (items.findLast((i) => i.kind === "node" && i.node === part.data.node) as Extract<DisplayItem, { kind: "node" }> | undefined)
        : undefined;
      if (parentNode) {
        parentNode.reasoning = part.data.content;
      } else {
        items.push({ kind: "reasoning", content: part.data.content, node: part.data.node });
      }
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
  const nodeTimestamps = useRef<Map<string, number>>(new Map());

  if (parts.length === 0) return null;

  const items = buildOrderedItems(parts);

  // Record timestamp the first time each node appears
  const now = Date.now();
  for (const item of items) {
    if (item.kind === "node" && !nodeTimestamps.current.has(item.node)) {
      nodeTimestamps.current.set(item.node, now);
    }
  }
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
              const nodeItems = items.filter((i) => i.kind === "node");
              const isLastNode = nodeItems[nodeItems.length - 1] === item;
              const isActiveNode = isLoading && isLastNode;
              const startedAt = nodeTimestamps.current.get(item.node) ?? Date.now();
              return (
                <NodeStartBlock
                  key={`item-${index}`}
                  title={item.title}
                  node={item.node}
                  startedAt={startedAt}
                  isActive={isActiveNode}
                  reasoning={item.reasoning}
                />
              );
            }

            if (item.kind === "reasoning") {
              // Orphan reasoning (no matching node) — render standalone
              return <ReasoningContent key={`item-${index}`} content={item.content} />;
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

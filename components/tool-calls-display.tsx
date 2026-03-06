"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Search,
  Globe,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  FileText,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolCall = {
  id: string;
  name: string;
  status: "running" | "completed" | "error";
  params: Record<string, any>;
  result?: any;
  duration?: number;
};

type DisplayMode = "collapsed" | "inline" | "timeline" | "transparent";

interface ToolCallsDisplayProps {
  toolCalls: ToolCall[];
  mode?: DisplayMode;
  className?: string;
}

const TOOL_ICONS: Record<string, any> = {
  credit_score_model: Calculator,
  data_completeness_checker: CheckCircle2,
  financial_statement_analyzer: FileText,
  shap_explainer: BarChart3,
  counterfactual_generator: Lightbulb,
  lending_knowledge_retriever: Search,
  web_search: Search,
  database_query: Database,
  api_call: Globe,
};

const TOOL_COLORS: Record<string, string> = {
  credit_score_model: "text-blue-400",
  data_completeness_checker: "text-emerald-400",
  financial_statement_analyzer: "text-purple-400",
  shap_explainer: "text-amber-400",
  counterfactual_generator: "text-pink-400",
  lending_knowledge_retriever: "text-cyan-400",
};

function getToolIcon(toolName: string) {
  const Icon = TOOL_ICONS[toolName] || Globe;
  return Icon;
}

function getToolColor(toolName: string) {
  return TOOL_COLORS[toolName] || "text-slate-400";
}

function formatParams(params: Record<string, any>): string {
  return JSON.stringify(params, null, 2);
}

function formatResult(result: any): string {
  if (typeof result === "object") {
    return JSON.stringify(result, null, 2);
  }
  return String(result);
}

// Collapsed Pattern Component
function CollapsedToolCalls({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const toggleTool = (id: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTools(newExpanded);
  };

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-900/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-slate-300">
          Used {toolCalls.length} tool{toolCalls.length !== 1 ? "s" : ""}
        </span>
        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
          {toolCalls.filter((t) => t.status === "completed").length} completed
        </span>
      </div>

      <div className="space-y-2">
        {toolCalls.map((tool) => {
          const Icon = getToolIcon(tool.name);
          const isExpanded = expandedTools.has(tool.id);
          const color = getToolColor(tool.name);

          return (
            <div key={tool.id} className="border border-slate-700 rounded-md">
              <button
                onClick={() => toggleTool(tool.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-800/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
                <Icon className={cn("w-4 h-4 flex-shrink-0", color)} />
                <span className="text-sm text-slate-200 flex-1 text-left">
                  {tool.name.replace(/_/g, " ")}
                </span>
                {tool.duration && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {tool.duration}s
                  </span>
                )}
                {tool.status === "completed" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {tool.status === "running" && (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                )}
                {tool.status === "error" && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-slate-700 pt-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-1 font-medium">
                      Parameters:
                    </div>
                    <pre className="text-xs text-slate-300 bg-slate-950/50 p-2 rounded overflow-x-auto">
                      {formatParams(tool.params)}
                    </pre>
                  </div>

                  {tool.result && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1 font-medium">
                        Result:
                      </div>
                      <pre className="text-xs text-slate-300 bg-slate-950/50 p-2 rounded overflow-x-auto">
                        {formatResult(tool.result)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Inline Pattern Component
function InlineToolCalls({ toolCalls }: { toolCalls: ToolCall[] }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {toolCalls.map((tool) => {
        const Icon = getToolIcon(tool.name);
        const color = getToolColor(tool.name);

        return (
          <span
            key={tool.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/50 border border-slate-700 rounded-full text-xs"
          >
            <Icon className={cn("w-3 h-3", color)} />
            <span className="text-slate-300">
              {tool.name.replace(/_/g, " ")}
            </span>
            {tool.status === "completed" && (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            )}
            {tool.status === "running" && (
              <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
            )}
          </span>
        );
      })}
    </div>
  );
}

// Timeline Pattern Component
function TimelineToolCalls({ toolCalls }: { toolCalls: ToolCall[] }) {
  return (
    <div className="relative">
      {toolCalls.map((tool, index) => {
        const Icon = getToolIcon(tool.name);
        const color = getToolColor(tool.name);
        const isLast = index === toolCalls.length - 1;

        return (
          <div key={tool.id} className="relative flex gap-4 pb-6">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-700" />
            )}

            {/* Timeline dot */}
            <div
              className={cn(
                "relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 flex-shrink-0",
                tool.status === "completed" &&
                  "bg-emerald-500/20 border-emerald-500",
                tool.status === "running" &&
                  "bg-amber-500/20 border-amber-500 animate-pulse",
                tool.status === "error" && "bg-red-500/20 border-red-500"
              )}
            >
              <Icon className={cn("w-3 h-3", color)} />
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-slate-200">
                  {tool.name.replace(/_/g, " ")}
                </h4>
                {tool.duration && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {tool.duration}s
                  </span>
                )}
              </div>

              {tool.result && typeof tool.result === "object" && (
                <div className="text-xs text-slate-400 mt-1">
                  {Object.entries(tool.result)
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <div key={key}>
                        <span className="text-slate-500">{key}:</span>{" "}
                        {String(value)}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Transparent Pattern Component
function TransparentToolCalls({ toolCalls }: { toolCalls: ToolCall[] }) {
  return (
    <div className="space-y-3">
      {toolCalls.map((tool) => {
        const Icon = getToolIcon(tool.name);
        const color = getToolColor(tool.name);

        return (
          <div
            key={tool.id}
            className={cn(
              "border-l-4 rounded-r-lg p-4 bg-slate-900/50",
              tool.status === "completed" && "border-emerald-500",
              tool.status === "running" && "border-amber-500",
              tool.status === "error" && "border-red-500"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4", color)} />
                <h4 className="text-sm font-medium text-slate-200">
                  {tool.name.replace(/_/g, " ")}
                </h4>
                {tool.status === "running" && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Running
                  </span>
                )}
                {tool.status === "completed" && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </span>
                )}
                {tool.status === "error" && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Error
                  </span>
                )}
              </div>
              {tool.duration && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {tool.duration}s
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <div className="text-xs text-slate-400 mb-1 font-medium">
                  Parameters:
                </div>
                <pre className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded overflow-x-auto border border-slate-800">
                  {formatParams(tool.params)}
                </pre>
              </div>

              {tool.result && (
                <div>
                  <div className="text-xs text-slate-400 mb-1 font-medium">
                    Result:
                  </div>
                  <pre className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded overflow-x-auto border border-slate-800">
                    {formatResult(tool.result)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ToolCallsDisplay({
  toolCalls,
  mode = "transparent",
  className,
}: ToolCallsDisplayProps) {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className={cn("my-4", className)}>
      {mode === "collapsed" && <CollapsedToolCalls toolCalls={toolCalls} />}
      {mode === "inline" && <InlineToolCalls toolCalls={toolCalls} />}
      {mode === "timeline" && <TimelineToolCalls toolCalls={toolCalls} />}
      {mode === "transparent" && <TransparentToolCalls toolCalls={toolCalls} />}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Brain,
  Wrench,
  Clock,
  Calculator,
  CheckCircle2,
  Search,
  BarChart3,
  Lightbulb,
  Database,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ReadEvent = {
  type: "read";
  file: string;
  duration?: number;
};

type ThoughtEvent = {
  type: "thought";
  content: string;
  duration?: number;
};

type ToolEvent = {
  type: "tool";
  name: string;
  status: "running" | "completed" | "error";
  input?: Record<string, any>;
  output?: any;
  duration?: number;
};

type StreamingAgentState = {
  reads: ReadEvent[];
  thoughts: ThoughtEvent[];
  tools: ToolEvent[];
  response: string;
  isStreaming: boolean;
};

interface StreamingAgentDisplayProps {
  state: StreamingAgentState;
  className?: string;
}

const TOOL_ICONS: Record<string, any> = {
  credit_score_model: Calculator,
  data_completeness_checker: CheckCircle2,
  financial_statement_analyzer: FileText,
  shap_explainer: BarChart3,
  counterfactual_generator: Lightbulb,
  lending_knowledge_retriever: Search,
  database_query: Database,
  web_search: Search,
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
  return TOOL_ICONS[toolName] || Wrench;
}

function getToolColor(toolName: string) {
  return TOOL_COLORS[toolName] || "text-slate-400";
}

function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  return `${seconds.toFixed(1)}s`;
}

function CollapsibleSection({
  title,
  count,
  duration,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  count?: number;
  duration?: number;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const hasContent = count && count > 0;

  if (!hasContent) return null;

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-700/40 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
        <Icon className="w-4 h-4 text-slate-300" />
        <span className="text-sm font-medium text-slate-200">
          {title}
          {count && count > 1 && ` (${count})`}
        </span>
        {duration !== undefined && (
          <span className="ml-auto text-xs text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(duration)}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="bg-slate-800/20 border-t border-slate-700 p-3">
          {children}
        </div>
      )}
    </div>
  );
}

function ReadItem({ event }: { event: ReadEvent }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-300 py-1">
      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <span className="flex-1">{event.file}</span>
      {event.duration && (
        <span className="text-xs text-slate-500">
          {formatDuration(event.duration)}
        </span>
      )}
    </div>
  );
}

function ThoughtItem({ event }: { event: ThoughtEvent }) {
  return (
    <div className="flex flex-col gap-1 py-2 border-l-2 border-slate-600 pl-3">
      <p className="text-sm text-slate-200">{event.content}</p>
      {event.duration && (
        <span className="text-xs text-slate-500">
          {formatDuration(event.duration)}
        </span>
      )}
    </div>
  );
}

function ToolItem({ event }: { event: ToolEvent }) {
  const Icon = getToolIcon(event.name);
  const color = getToolColor(event.name);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-slate-700 rounded-md overflow-hidden mb-2 last:mb-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-slate-800/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
        <Icon className={cn("w-4 h-4 flex-shrink-0", color)} />
        <span className="text-sm text-slate-200 flex-1 text-left">
          {event.name.replace(/_/g, " ")}
        </span>
        {event.duration && (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(event.duration)}
          </span>
        )}
        {event.status === "completed" && (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        )}
        {event.status === "running" && (
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
        )}
      </button>

      {isExpanded && (event.input || event.output) && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-700 pt-3 bg-slate-900/30">
          {event.input && (
            <div>
              <div className="text-xs text-slate-400 mb-1 font-medium">
                Input:
              </div>
              <pre className="text-xs text-slate-300 bg-slate-950/50 p-2 rounded overflow-x-auto border border-slate-800 font-mono">
                {JSON.stringify(event.input, null, 2)}
              </pre>
            </div>
          )}

          {event.output && (
            <div>
              <div className="text-xs text-slate-400 mb-1 font-medium">
                Output:
              </div>
              <pre className="text-xs text-slate-300 bg-slate-950/50 p-2 rounded overflow-x-auto border border-slate-800 font-mono">
                {typeof event.output === "string"
                  ? event.output
                  : JSON.stringify(event.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StreamingAgentDisplay({
  state,
  className,
}: StreamingAgentDisplayProps) {
  const totalReadDuration = state.reads.reduce(
    (sum, r) => sum + (r.duration || 0),
    0
  );
  const totalThoughtDuration = state.thoughts.reduce(
    (sum, t) => sum + (t.duration || 0),
    0
  );
  const totalToolDuration = state.tools.reduce(
    (sum, t) => sum + (t.duration || 0),
    0
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Reads Section */}
      <CollapsibleSection
        title="Context & Reads"
        count={state.reads.length}
        duration={totalReadDuration}
        icon={FileText}
        defaultOpen={false}
      >
        <div className="space-y-1">
          {state.reads.map((read, i) => (
            <ReadItem key={i} event={read} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Thoughts Section */}
      <CollapsibleSection
        title="Thought"
        count={state.thoughts.length}
        duration={totalThoughtDuration}
        icon={Brain}
        defaultOpen={false}
      >
        <div className="space-y-2">
          {state.thoughts.map((thought, i) => (
            <ThoughtItem key={i} event={thought} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Tools Section */}
      <CollapsibleSection
        title="Tools"
        count={state.tools.length}
        duration={totalToolDuration}
        icon={Wrench}
        defaultOpen={true}
      >
        <div>
          {state.tools.map((tool, i) => (
            <ToolItem key={i} event={tool} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Response Section (Always Visible) */}
      {state.response && (
        <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/20">
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="text-sm text-slate-100 whitespace-pre-wrap">
              {state.response}
            </div>
            {state.isStreaming && (
              <span className="inline-flex items-center gap-1 text-slate-400 ml-1">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse animation-delay-200">●</span>
                <span className="animate-pulse animation-delay-400">●</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

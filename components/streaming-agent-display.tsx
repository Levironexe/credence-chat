"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Brain,
  Wrench,
  Calculator,
  CheckCircle2,
  Search,
  BarChart3,
  Lightbulb,
  Database,
  Loader2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StreamingAgentState } from "@/lib/parse-agent-stream";
import { Response } from "./elements/response";

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
  credit_score_model: "text-muted-foreground",
  data_completeness_checker: "text-muted-foreground",
  financial_statement_analyzer: "text-muted-foreground",
  shap_explainer: "text-muted-foreground",
  counterfactual_generator: "text-muted-foreground",
  lending_knowledge_retriever: "text-muted-foreground",
};

function getToolIcon(toolName: string) {
  return TOOL_ICONS[toolName] || Wrench;
}

function getToolColor(toolName: string) {
  return TOOL_COLORS[toolName] || "text-slate-400";
}

// Collapsible Thought Section
function ThoughtSection({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden text-muted-foreground ">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 pb-3"
      >
        {isOpen ? (

        <ChevronDown className="w-5 h-5 text-muted-foreground" />

        ) : (
        <div className="group relative w-5 h-5">
          <Brain className="w-5 h-5 text-muted-foreground group-hover:hidden" />
          <ChevronRight className="w-5 h-5 text-muted-foreground hidden group-hover:block" />
        </div>
        )}
        
        <span className="text-sm text-muted-foreground ">Thought</span>
      </button>

      {isOpen && (
        <div className="border-l border-muted-foreground/20 px-4 py-2 ">
          <p className="text-sm text-muted-foreground">{content}</p>
        </div>
      )}
    </div>
  );
}

// Tools Section with individual tool cards
function ToolsSection({ tools }: { tools: any[] }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="text-muted-foreground">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 pb-3"
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}

        <Wrench className="w-5 h-5 text-muted-foreground" />

        <span className="text-sm text-muted-foreground">
          Tools ({tools.length})
        </span>
      </button>

      {isOpen && (
        <div className="border-l border-muted-foreground/20 pl-4 space-y-3">
          {tools.map((tool, i) => (
            <ToolCard key={i} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}

// Individual tool card (collapsible)
function ToolCard({ tool }: { tool: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const Icon = getToolIcon(tool.name);
  const color = getToolColor(tool.name);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 text-left group"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}

        <Icon className={cn("w-4 h-4", color)} />

        <span className="text-sm text-muted-foreground flex-1">
          {tool.name.replace(/_/g, " ")}
        </span>

        {tool.status === "completed" && (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        )}

        {tool.status === "running" && (
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
        )}
      </button>

      {isExpanded && (tool.input || tool.output) && (
        <div className="mt-2 ml-6 space-y-3 text-sm">
          {tool.input && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Input</div>

              <pre className="text-xs bg-muted/30 p-3 rounded font-mono overflow-x-auto">
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
          )}

          {tool.output && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Output</div>

              <pre className="text-xs bg-muted/30 p-3 rounded font-mono overflow-x-auto">
                {typeof tool.output === "string"
                  ? tool.output
                  : JSON.stringify(tool.output, null, 2)}
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
}: {
  state: StreamingAgentState;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Render ordered sections: thought -> text -> tools -> text */}
      {state.sections.map((section, index) => {
        if (section.type === "thought") {
          return <ThoughtSection key={index} content={section.content || ""} />;
        }

        if (section.type === "tools" && section.tools && section.tools.length > 0) {
          return <ToolsSection key={index} tools={section.tools} />;
        }

        if (section.type === "text" && section.content) {
          // Render markdown text naturally without any box
          return (
            <div key={index}>
              <Response>{section.content}</Response>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

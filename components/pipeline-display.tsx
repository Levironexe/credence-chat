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
  Shield,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOOL_ICONS: Record<string, any> = {
  credit_score_model: Calculator,
  data_completeness_checker: CheckCircle2,
  financial_statement_analyzer: FileText,
  shap_explainer: BarChart3,
  counterfactual_generator: Lightbulb,
  fairness_validator: Shield,
  applicant_lookup: User,
  lending_knowledge_retriever: Search,
  database_query: Database,
  pdf_extractor: FileText,
  bank_statement_parser: FileText,
};

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

function ToolCard({ name, input, output, isResult }: {
  name: string;
  input: Record<string, any>;
  output?: any;
  isResult: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = TOOL_ICONS[name] || Wrench;

  return (
    <div className="ml-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 text-left group py-1"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground flex-1">
          {name.replace(/_/g, " ")}
        </span>
        {isResult ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
        )}
      </button>

      {isExpanded && (input || output) && (
        <div className="mt-1 ml-6 space-y-2 text-sm">
          {input && Object.keys(input).length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Input</div>
              <pre className="text-xs bg-muted/30 p-2 rounded font-mono overflow-x-auto max-h-40 overflow-y-auto">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Output</div>
              <pre className="text-xs bg-muted/30 p-2 rounded font-mono overflow-x-auto max-h-40 overflow-y-auto">
                {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
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

export function PipelineDisplay({
  parts,
  isLoading,
}: {
  parts: PipelinePart[];
  isLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (parts.length === 0) return null;

  // Count tools for the summary label
  const toolParts = parts.filter(
    (p) => p.type === "data-tool-call" || p.type === "data-tool-result"
  );
  const uniqueTools = new Set(toolParts.map((p) => p.data?.name)).size;
  const nodeParts = parts.filter((p) => p.type === "data-node-start");

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
          {uniqueTools > 0 && ` \u2022 ${uniqueTools} tool${uniqueTools > 1 ? "s" : ""}`}
          {nodeParts.length > 0 && ` \u2022 ${nodeParts.length} step${nodeParts.length > 1 ? "s" : ""}`}
        </span>
        {isLoading && (
          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin ml-auto" />
        )}
        {!isLoading && parts.length > 0 && (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 py-2 space-y-0.5">
          {parts.map((part, index) => {
            const key = `pipeline-${index}`;

            if (part.type === "data-node-start" && part.data) {
              return (
                <NodeStartBlock
                  key={key}
                  title={part.data.title}
                  node={part.data.node}
                />
              );
            }

            if (part.type === "data-tool-call" && part.data) {
              return (
                <ToolCard
                  key={key}
                  name={part.data.name}
                  input={part.data.input || {}}
                  isResult={false}
                />
              );
            }

            if (part.type === "data-tool-result" && part.data) {
              return (
                <ToolCard
                  key={key}
                  name={part.data.name}
                  input={part.data.input || {}}
                  output={part.data.output}
                  isResult={true}
                />
              );
            }

            if (part.type === "data-reasoning" && part.data) {
              return (
                <ReasoningBlock
                  key={key}
                  content={part.data.content}
                  node={part.data.node}
                />
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

type NodeColor = "core" | "ml" | "conditional" | "exit";
interface NodeDef { id: string; label: string; color: NodeColor }

// Ordered by main execution sequence — top = runs first
const PIPELINE: NodeDef[] = [
  { id: "classify",                  label: "Classify",            color: "core"        },
  { id: "fetch_merchant_data",       label: "Fetch Merchant",      color: "core"        },
  { id: "metric_extraction",         label: "Metric Extraction",   color: "core"        },
  { id: "document_ingestion",        label: "Document Ingestion",  color: "core"        },
  { id: "data_completeness",         label: "Data Completeness",   color: "core"        },
  { id: "credit_scoring",            label: "Credit Scoring",      color: "ml"          },
  { id: "explainability",            label: "Explainability",      color: "ml"          },
  { id: "fairness_check",            label: "Fairness Check",      color: "ml"          },
  { id: "counterfactual_generation", label: "Counterfactual Gen",  color: "conditional" },
  { id: "planning",                  label: "Planning",            color: "core"        },
  { id: "tool_selection",            label: "Tool Selection",      color: "core"        },
  { id: "execute_tools",             label: "Execute Tools",       color: "core"        },
  { id: "analysis",                  label: "Analysis",            color: "core"        },
  { id: "response",                  label: "Response",            color: "core"        },
  { id: "simple_response",           label: "Simple Response",     color: "exit"        },
  { id: "single_tool_execution",     label: "Single Tool Exec",    color: "exit"        },
  { id: "need_more_data",            label: "Need More Data",      color: "exit"        },
];

const COLORS: Record<NodeColor, { dot: string; ring: string; text: string }> = {
  core:        { dot: "bg-indigo-500",  ring: "ring-indigo-500/40",  text: "text-indigo-300"  },
  ml:          { dot: "bg-emerald-500", ring: "ring-emerald-500/40", text: "text-emerald-300" },
  conditional: { dot: "bg-amber-500",   ring: "ring-amber-500/40",   text: "text-amber-300"   },
  exit:        { dot: "bg-slate-500",   ring: "ring-slate-500/40",   text: "text-slate-400"   },
};

const LEGEND = [
  { dot: "bg-indigo-500",  label: "Core"        },
  { dot: "bg-emerald-500", label: "ML tools"    },
  { dot: "bg-amber-500",   label: "Conditional" },
] as const;

interface Props {
  activeNode: string | null;
  completedNodes: string[];
  isStreaming: boolean;
}

export function NodeGraphVisualizer({ activeNode, completedNodes, isStreaming }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isStreaming) setIsOpen(true);
  }, [isStreaming]);

  const hasActivity = isStreaming || completedNodes.length > 0 || activeNode != null;
  if (!hasActivity) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col items-end gap-1.5">
      {/* Toggle pill */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/90 px-3 py-1 text-xs text-zinc-400 backdrop-blur transition-colors hover:text-zinc-200"
      >
        {isStreaming && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
        )}
        Agent graph {isOpen ? "▲" : "▼"}
      </button>

      {/* Pipeline panel */}
      {isOpen && (
        <div className="w-52 rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur">
          <div className="relative flex flex-col">
            {/* Vertical connector line */}
            <div className="absolute bottom-2 left-[6px] top-2 w-px bg-zinc-800" />

            {PIPELINE.map((node) => {
              const isActive = node.id === activeNode;
              const isDone = !isActive && completedNodes.includes(node.id);
              const c = COLORS[node.color];

              return (
                <div
                  key={node.id}
                  style={{ transition: "opacity 0.3s ease" }}
                  className={`relative flex items-center gap-2.5 py-[5px] ${
                    isActive ? "opacity-100" : isDone ? "opacity-60" : "opacity-20"
                  }`}
                >
                  {/* Dot */}
                  <div className="relative z-10 shrink-0">
                    {isActive ? (
                      <div className={`h-3.5 w-3.5 animate-pulse rounded-full ring-2 ${c.dot} ${c.ring}`} />
                    ) : isDone ? (
                      <div className={`h-3.5 w-3.5 rounded-full ${c.dot}`} />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-zinc-700 bg-zinc-900" />
                    )}
                  </div>

                  {/* Label */}
                  <span className={`flex-1 font-mono text-[11px] leading-tight ${
                    isActive ? c.text : isDone ? "text-zinc-400" : "text-zinc-600"
                  }`}>
                    {node.label}
                  </span>

                  {/* Checkmark */}
                  {isDone && <span className="text-[10px] text-zinc-600">✓</span>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-2 flex gap-3 border-t border-zinc-800 pt-2">
            {LEGEND.map(({ dot, label }) => (
              <span key={label} className="flex items-center gap-1 text-[9px] text-zinc-600">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

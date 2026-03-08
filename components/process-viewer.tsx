/**
 * Process Viewer Component
 *
 * Displays collapsible sections for internal process steps (reasoning, tool calls, node progress)
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollapsibleSection } from "@/lib/sse-handler";
import ReactMarkdown from "react-markdown";

interface ProcessViewerProps {
  sections: CollapsibleSection[];
  className?: string;
}

export function ProcessViewer({ sections, className }: ProcessViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  if (sections.length === 0) {
    return null;
  }

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      {sections.map((section) => {
        const isExpanded = section.isOpen || expandedSections.has(section.id);

        return (
          <div
            key={section.id}
            className={cn(
              "border rounded-lg overflow-hidden",
              "transition-colors duration-200",
              section.isStreaming
                ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20"
            )}
          >
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className={cn(
                "w-full px-4 py-2 flex items-center gap-2",
                "text-left text-sm font-medium",
                "hover:bg-gray-100 dark:hover:bg-gray-800/50",
                "transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              )}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}

              <span className="flex-1">{section.title}</span>

              {section.isStreaming && (
                <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{section.content || "*No content yet...*"}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

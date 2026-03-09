/**
 * Timeline Renderer Component
 *
 * Renders events in chronological order, interspersing text and collapsible sections
 * Matches StreamingAgentDisplay UI style
 */

"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Brain,
  Wrench,
  Calculator,
  Search,
  BarChart3,
  Lightbulb,
  FileText,
  Database,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineEvent, CollapsibleSection } from "@/lib/sse-handler";
import ReactMarkdown from "react-markdown";
import { Response } from "./elements/response";

// Icon mapping for different section types
const SECTION_ICONS: Record<string, any> = {
  reasoning: Brain,
  node: Activity,
  tool: Wrench,
  credit_score_model: Calculator,
  data_completeness_checker: CheckCircle2,
  financial_statement_analyzer: FileText,
  shap_explainer: BarChart3,
  counterfactual_generator: Lightbulb,
  lending_knowledge_retriever: Search,
  database_query: Database,
};

function getSectionIcon(section: any) {
  // Try tool-specific icon first
  if (section.type === "tool" && section.title) {
    const toolName = section.title.toLowerCase().replace(/[\s]+/g, "_");
    if (SECTION_ICONS[toolName]) {
      return SECTION_ICONS[toolName];
    }
  }
  // Fall back to type icon
  return SECTION_ICONS[section.type] || Activity;
}

interface TimelineRendererProps {
  timeline: TimelineEvent[];
  className?: string;
}

export function TimelineRenderer({ timeline, className }: TimelineRendererProps) {
  // Track explicit user toggle state: Map<sectionId, isExpanded>
  // If not in map, fall back to section.isOpen
  const [toggledSections, setToggledSections] = useState<Map<string, boolean>>(new Map());

  // Group consecutive text events into single text blocks
  // AND consolidate sections with the same title+type
  const groupedTimeline: Array<{ type: "text"; content: string } | { type: "section"; section: CollapsibleSection }> = [];
  let textBuffer = "";
  const sectionMap = new Map<string, CollapsibleSection>();

  for (const event of timeline) {
    if (event.eventType === "text") {
      textBuffer += event.textContent || "";
    } else if (event.section) {
      // Flush text buffer if we have accumulated text
      if (textBuffer) {
        groupedTimeline.push({ type: "text", content: textBuffer });
        textBuffer = "";
      }

      // Create a unique key for consolidating sections with same title+type
      const sectionKey = `${event.section.type}-${event.section.title}`;

      if (sectionMap.has(sectionKey)) {
        // Consolidate: append content to existing section
        const existingSection = sectionMap.get(sectionKey)!;
        existingSection.content += event.section.content || "";
        // Update streaming status (if any chunk is still streaming, section is streaming)
        existingSection.isStreaming = existingSection.isStreaming || event.section.isStreaming;
      } else {
        // Create new consolidated section
        const consolidatedSection: CollapsibleSection = {
          ...event.section,
          id: sectionKey, // Use consistent ID for same title+type
        };
        sectionMap.set(sectionKey, consolidatedSection);
        groupedTimeline.push({ type: "section", section: consolidatedSection });
      }
    }
  }

  // Flush any remaining text
  if (textBuffer) {
    groupedTimeline.push({ type: "text", content: textBuffer });
  }

  if (groupedTimeline.length === 0) {
    return null;
  }

  const toggleSection = (id: string, currentExpandedState: boolean) => {
    setToggledSections((prev) => {
      const next = new Map(prev);
      // Toggle from the current displayed state
      next.set(id, !currentExpandedState);
      return next;
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {groupedTimeline.map((item, index) => {
        if (item.type === "text") {
          // Render text block as markdown
          return (
            <div key={`text-${index}`}>
              <Response>{item.content}</Response>
            </div>
          );
        }

        // Render section as collapsible card
        const section = item.section;
        if (!section) return null;

        // Check if user has explicitly toggled this section
        // If so, use their preference; otherwise use section.isOpen
        const isExpanded = toggledSections.has(section.id)
          ? toggledSections.get(section.id)!
          : section.isOpen;
        const Icon = getSectionIcon(section);
        const isCompleted = !section.isStreaming && section.content;

        return (
          <div key={section.id} className="text-muted-foreground text-left">
            <button
              type="button"
              onClick={() => toggleSection(section.id, isExpanded)}
              className="w-full flex items-center text-left gap-2 pb-3 group"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <div className="group/icon relative w-4 h-4">
                  <Icon className="w-4 h-4 text-muted-foreground group-hover/icon:hidden" />
                  <ChevronRight className="w-4 h-4 text-muted-foreground hidden group-hover/icon:block" />
                </div>
              )}

              <span className="text-sm text-muted-foreground flex-1">
                {section.title}
              </span>

              {isCompleted && !section.isStreaming && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}

              {section.isStreaming && (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              )}
            </button>

            {isExpanded && (
              <div className="border-l border-muted-foreground/20 pl-4 py-2">
                {section.content ? (
                  <div className="text-xs bg-muted/30 p-3 rounded font-mono overflow-x-auto">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No content yet...</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

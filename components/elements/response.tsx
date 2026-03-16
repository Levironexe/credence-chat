"use client";

import type { ComponentProps, ReactNode } from "react";
import React, { useState } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import { BarChart3Icon, TableIcon } from "lucide-react";

type ResponseProps = ComponentProps<typeof Streamdown>;

// --- Color rules for semantic values in table cells ---

type ColorRule = {
  pattern: RegExp;
  className: string;
};

// Patterns matched against the full text content of a <td>
const COLOR_RULES: ColorRule[] = [
  // Decision values
  { pattern: /\bAUTO[- ]?APPROVE\b/i, className: "text-emerald-500 font-semibold" },
  { pattern: /\bAPPROVE\b(?!.*DECLINE)/i, className: "text-emerald-500 font-semibold" },
  { pattern: /\bDECLINE\b/i, className: "text-red-400 font-semibold" },
  { pattern: /\bMANUAL REVIEW\b/i, className: "text-amber-400 font-semibold" },

  // Risk levels
  { pattern: /\bLOW\b/, className: "text-emerald-500 font-semibold" },
  { pattern: /\bMEDIUM\b/, className: "text-amber-400 font-semibold" },
  { pattern: /\bHIGH\b/, className: "text-red-400 font-semibold" },

  // Fairness pass/fail
  { pattern: /\bPASSED\b/, className: "text-emerald-500 font-semibold" },
  { pattern: /\bFAILED\b/, className: "text-red-400 font-semibold" },

  // Risk direction
  { pattern: /Increases risk/i, className: "text-red-400" },
  { pattern: /Decreases risk/i, className: "text-emerald-500" },
  { pattern: /Reduces risk/i, className: "text-emerald-500" },

  // Influence level (replaces raw SHAP values)
  { pattern: /^Strong$/i, className: "text-amber-400 font-semibold" },
  { pattern: /^Moderate$/i, className: "text-blue-400 font-medium" },
  { pattern: /^Minor$/i, className: "text-zinc-400" },
];

// Score band colors (matched in credit score cell)
const SCORE_BAND_COLORS: Record<string, string> = {
  "Exceptional": "text-emerald-400",
  "Very Good": "text-emerald-500",
  "Good": "text-teal-400",
  "Fair": "text-amber-400",
  "Poor": "text-red-400",
};

// Delta patterns like (↓-318,480) or (↑+$310,968) or (↑+63,000)
const DELTA_REGEX = /(\(([↑↓])([+\-]\$?[\d,.]+)\))/g;

// SHAP impact pattern like +0.1234 or -0.0567
const SHAP_REGEX = /^([+-]\d+\.\d+)$/;

// Default probability pattern like 45.2% or 8.3%
const PROB_REGEX = /^(\d+\.?\d*)%$/;

/**
 * Extract plain text from ReactNode tree for pattern matching.
 */
function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node) && node.props?.children) {
    return extractText(node.props.children);
  }
  return "";
}

/**
 * Colorize delta indicators (↑/↓) within text.
 */
function colorizeDelta(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(DELTA_REGEX);
  if (parts.length === 1) return text;

  const result: ReactNode[] = [];
  let i = 0;
  while (i < parts.length) {
    if (i + 3 < parts.length && (parts[i + 2] === "↑" || parts[i + 2] === "↓")) {
      if (parts[i]) result.push(parts[i]);
      const arrow = parts[i + 2];
      const value = parts[i + 3];
      const isUp = arrow === "↑";
      result.push(
        <span
          key={`${keyPrefix}-delta-${i}`}
          className={cn(
            "font-semibold whitespace-nowrap",
            isUp ? "text-emerald-500" : "text-red-400"
          )}
        >
          ({arrow}{value})
        </span>
      );
      i += 4;
    } else {
      if (parts[i]) result.push(parts[i]);
      i += 1;
    }
  }
  return <>{result}</>;
}

/**
 * Recursively colorize delta indicators in children tree.
 */
function colorizeDeltaChildren(children: ReactNode, keyPrefix = "c"): ReactNode {
  if (typeof children === "string") {
    return colorizeDelta(children, keyPrefix);
  }
  if (Array.isArray(children)) {
    return React.Children.map(children, (child, idx) =>
      colorizeDeltaChildren(child, `${keyPrefix}-${idx}`)
    );
  }
  if (React.isValidElement(children) && children.props?.children) {
    return React.cloneElement(children, {
      ...children.props,
      children: colorizeDeltaChildren(children.props.children, keyPrefix),
    });
  }
  return children;
}

/**
 * Colorize an entire cell based on semantic rules.
 * Returns a className to apply to the whole cell, or null.
 */
function getCellColor(text: string): string | null {
  // Check color rules (decision, risk, pass/fail, direction)
  for (const rule of COLOR_RULES) {
    if (rule.pattern.test(text)) return rule.className;
  }

  // Score band in credit score cell (e.g. "750 / 850 (Very Good)")
  for (const [band, color] of Object.entries(SCORE_BAND_COLORS)) {
    if (text.includes(band)) return color + " font-semibold";
  }

  // SHAP impact value like +0.1234 or -0.0567
  const shapMatch = text.trim().match(SHAP_REGEX);
  if (shapMatch) {
    const val = parseFloat(shapMatch[1]);
    return val > 0 ? "text-emerald-500 font-medium" : "text-red-400 font-medium";
  }

  // Default probability — color by severity
  const probMatch = text.trim().match(PROB_REGEX);
  if (probMatch) {
    const pct = parseFloat(probMatch[1]);
    if (pct <= 15) return "text-emerald-500 font-semibold";
    if (pct <= 35) return "text-amber-400 font-semibold";
    return "text-red-400 font-semibold";
  }

  return null;
}

// Custom td that applies semantic colors — preserves Streamdown's default styling
const ColorizedTd = React.memo(
  ({ children, className, node, ...props }: any) => {
    const text = extractText(children);
    const cellColor = getCellColor(text);

    // If the cell has a semantic color, wrap content with it
    // Also always process delta indicators
    let content: ReactNode;
    if (cellColor) {
      content = (
        <span className={cellColor}>
          {colorizeDeltaChildren(children)}
        </span>
      );
    } else {
      content = colorizeDeltaChildren(children);
    }

    return (
      <td
        className={cn("px-4 py-2 text-sm", className)}
        data-streamdown="table-cell"
        {...props}
      >
        {content}
      </td>
    );
  },
  (prev: any, next: any) =>
    prev.className === next.className &&
    prev.children === next.children
);
ColorizedTd.displayName = "ColorizedTd";

// Heading that colorizes risk level keywords (LOW/MEDIUM/HIGH)
const RISK_KEYWORD_REGEX = /\b(LOW|MEDIUM|HIGH)\b/;
const RISK_KEYWORD_COLORS: Record<string, string> = {
  LOW: "text-emerald-500 font-bold",
  MEDIUM: "text-amber-400 font-bold",
  HIGH: "text-red-400 font-bold",
};

function ColorizedH3({ children, node, ...props }: any) {
  const text = extractText(children);
  const match = text.match(RISK_KEYWORD_REGEX);
  if (!match) return <h3 {...props}>{children}</h3>;

  const keyword = match[1];
  const color = RISK_KEYWORD_COLORS[keyword];
  // Replace the keyword in children with a colored span
  const parts = text.split(RISK_KEYWORD_REGEX);
  return (
    <h3 {...props}>
      {parts.map((part, i) =>
        part === keyword ? (
          <span key={i} className={color}>{part}</span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </h3>
  );
}

const customComponents = {
  td: ColorizedTd,
  h3: ColorizedH3,
};

// Allow data: URIs (for base64 SHAP waterfall plot images) through Streamdown's sanitizer
function allowDataImageUrls(url: string): string {
  if (url.startsWith("data:image/")) return url;
  // Fall through to default behavior for other URLs
  return url;
}

// --- SHAP Chart/Table toggle ---

// Regex to match: ![SHAP Waterfall Plot](url) followed by SHAP table
// The image and table may be separated by blank lines and optional text
const SHAP_IMAGE_REGEX = /!\[SHAP Waterfall Plot\]\(([^)]+)\)/;
const SHAP_TABLE_HEADER_REGEX = /\|\s*#\s*\|\s*Factor\s*\|\s*(?:SHAP Impact|Influence)\s*\|\s*Value\s*\|\s*(?:Direction|Impact)\s*\|/;

interface ShapSection {
  imageUrl: string;
  tableMarkdown: string;
}

/**
 * Split markdown into segments: regular text and SHAP toggle sections.
 * Returns an array of { type: "text", content } or { type: "shap", imageUrl, tableMarkdown }.
 */
function splitShapSections(markdown: string): Array<
  | { type: "text"; content: string }
  | { type: "shap"; imageUrl: string; tableMarkdown: string }
> {
  if (typeof markdown !== "string") return [{ type: "text", content: markdown || "" }];

  const imageMatch = markdown.match(SHAP_IMAGE_REGEX);
  const tableHeaderMatch = markdown.match(SHAP_TABLE_HEADER_REGEX);

  // Need both image and table to create the toggle
  if (!imageMatch || !tableHeaderMatch) {
    return [{ type: "text", content: markdown }];
  }

  const imageStart = imageMatch.index!;
  const imageEnd = imageStart + imageMatch[0].length;
  const imageUrl = imageMatch[1];

  // Find the table: starts at the header line and ends when table rows stop
  const tableHeaderStart = tableHeaderMatch.index!;

  // Walk backwards from table header to find the start of the line
  let tableStart = tableHeaderStart;
  while (tableStart > 0 && markdown[tableStart - 1] !== "\n") {
    tableStart--;
  }

  // Find the end of the table: table rows are lines starting with |
  const linesAfterHeader = markdown.slice(tableStart).split("\n");
  let tableLineCount = 0;
  for (const line of linesAfterHeader) {
    if (line.trim().startsWith("|") || line.trim() === "") {
      tableLineCount++;
    } else {
      // Stop at first non-table, non-empty line
      if (tableLineCount > 0) break;
    }
  }
  // Trim trailing empty lines from the table
  while (tableLineCount > 0 && linesAfterHeader[tableLineCount - 1].trim() === "") {
    tableLineCount--;
  }

  const tableEnd = tableStart + linesAfterHeader.slice(0, tableLineCount).join("\n").length;
  const tableMarkdown = markdown.slice(tableStart, tableEnd);

  // Determine the region to replace: from image start to table end
  const sectionStart = Math.min(imageStart, tableStart);
  const sectionEnd = Math.max(imageEnd, tableEnd);

  // Remove any text between image and table that's just whitespace/newlines
  const before = markdown.slice(0, sectionStart).trimEnd();
  const after = markdown.slice(sectionEnd).trimStart();

  const segments: Array<
    | { type: "text"; content: string }
    | { type: "shap"; imageUrl: string; tableMarkdown: string }
  > = [];

  if (before) segments.push({ type: "text", content: before });
  segments.push({ type: "shap", imageUrl, tableMarkdown });
  if (after) segments.push({ type: "text", content: after });

  return segments;
}

/**
 * SHAP Chart/Table toggle view.
 * Shows either the waterfall plot image or the SHAP values table with a tab bar.
 */
function ShapToggleView({
  imageUrl,
  tableMarkdown,
  streamdownClass,
  streamdownProps,
}: {
  imageUrl: string;
  tableMarkdown: string;
  streamdownClass: string;
  streamdownProps: Omit<ResponseProps, "children" | "className">;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <div>
      <div className="mb-3 flex items-center gap-1 rounded-lg bg-zinc-800/60 p-0.5 w-fit">
        <button
          type="button"
          onClick={() => setView("chart")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            view === "chart"
              ? "bg-zinc-700 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <BarChart3Icon className="size-3.5" />
          Chart
        </button>
        <button
          type="button"
          onClick={() => setView("table")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            view === "table"
              ? "bg-zinc-700 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <TableIcon className="size-3.5" />
          Table
        </button>
      </div>

      {view === "chart" ? (
        <div className="overflow-hidden rounded-lg">
          <img
            src={imageUrl}
            alt="SHAP Waterfall Plot"
            className="w-full max-w-[700px] rounded-lg"
          />
        </div>
      ) : (
        <Streamdown
          className={streamdownClass}
          components={customComponents}
          {...streamdownProps}
        >
          {tableMarkdown}
        </Streamdown>
      )}
    </div>
  );
}

export function Response({ className, children, ...props }: ResponseProps) {
  const streamdownClass = cn(
    "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
    className
  );

  // Check if markdown contains a SHAP image+table section to toggle
  const markdown = typeof children === "string" ? children : "";
  const segments = splitShapSections(markdown);

  // If no SHAP section found, render normally
  if (segments.length === 1 && segments[0].type === "text") {
    return (
      <Streamdown
        className={streamdownClass}
        components={customComponents}
        {...({ urlTransform: allowDataImageUrls } as any)}
        {...props}
      >
        {children}
      </Streamdown>
    );
  }

  // Render segments: text through Streamdown, SHAP through toggle view
  return (
    <div className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}>
      {segments.map((segment, i) => {
        if (segment.type === "text") {
          return (
            <Streamdown
              key={i}
              className="[&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto"
              components={customComponents}
              {...({ urlTransform: allowDataImageUrls } as any)}
              {...props}
            >
              {segment.content}
            </Streamdown>
          );
        }
        return (
          <ShapToggleView
            key={i}
            imageUrl={segment.imageUrl}
            tableMarkdown={segment.tableMarkdown}
            streamdownClass="[&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto"
            streamdownProps={props}
          />
        );
      })}
    </div>
  );
}

"use client";

import type { ComponentProps, ReactNode } from "react";
import React from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

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

  // SHAP Direction
  { pattern: /^\s*Positive\s*$/, className: "text-emerald-500" },
  { pattern: /^\s*Negative\s*$/, className: "text-red-400" },
];

// Score band colors (matched in credit score cell)
const SCORE_BAND_COLORS: Record<string, string> = {
  "Exceptional": "text-emerald-400",
  "Very Good": "text-emerald-500",
  "Good": "text-teal-400",
  "Fair": "text-amber-400",
  "Poor": "text-red-400",
};

// Delta patterns like (↓-318,480) or (↑+63,000)
const DELTA_REGEX = /(\(([↑↓])([+\-][\d,.]+)\))/g;

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

const customComponents = {
  td: ColorizedTd,
};

export function Response({ className, children, ...props }: ResponseProps) {
  return (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
        className
      )}
      components={customComponents}
      {...props}
    >
      {children}
    </Streamdown>
  );
}

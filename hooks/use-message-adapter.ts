/**
 * Adapter hook to convert simple Message format from useStructuredChat
 * to complex ChatMessage format required by UI components
 */

"use client";

import { useMemo, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import type { TimelineEvent } from "@/lib/sse-handler";

interface SimpleMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts?: any[]; // Optional parts array from SSE handler
}

export function useMessageAdapter(
  rawMessages: SimpleMessage[],
  initialMessages: ChatMessage[],
  currentProvider?: string,
  liveTimeline?: TimelineEvent[]
): ChatMessage[] {
  // Freeze provider per message so switching models doesn't change old icons
  const providerMapRef = useRef<Record<string, string>>({});

  const messages = useMemo(() => {
    // Only convert if rawMessages has content (avoid overwriting initialMessages with empty array)
    if (rawMessages.length === 0) {
      return initialMessages;
    }

    // Convert rawMessages (current session) and prepend initialMessages (from DB)
    // so previous conversation history remains visible when user sends follow-ups
    const convertedRaw = rawMessages.map((msg, index) => {
      // Attach live timeline to the last assistant message during streaming
      const isLastMessage = index === rawMessages.length - 1;
      const shouldAttachTimeline = isLastMessage && msg.role === "assistant" && liveTimeline && liveTimeline.length > 0;

      // Lock in provider on first render of each message
      // so switching models doesn't change icons of already-rendered messages
      if (msg.role === "assistant" && !providerMapRef.current[msg.id]) {
        providerMapRef.current[msg.id] = currentProvider || "anthropic";
      }
      const messageProvider = providerMapRef.current[msg.id] || currentProvider;

      // Convert MessagePart[] from SSE handler to AI SDK UIMessagePart[] format
      const parts = msg.parts && msg.parts.length > 0
        ? msg.parts.map((part: any) => {
            // Convert simple MessagePart objects to AI SDK data parts
            if (part.type === "tool-call") {
              return {
                type: "data-tool-call" as const,
                data: { name: part.name, input: part.input },
              };
            }
            if (part.type === "tool-result") {
              return {
                type: "data-tool-result" as const,
                data: { name: part.name, input: part.input, output: part.output, isError: part.isError },
              };
            }
            if (part.type === "reasoning") {
              return {
                type: "data-reasoning" as const,
                data: { content: part.content, node: part.node },
              };
            }
            if (part.type === "node-start") {
              return {
                type: "data-node-start" as const,
                data: { title: part.title, node: part.node },
              };
            }
            if (part.type === "text") {
              return {
                type: "text" as const,
                text: part.text,
              };
            }
            // Fallback: return as-is
            return part;
          })
        : [
            {
              type: "text" as const,
              text: String(msg.content || ""), // Explicitly convert to string
            },
          ];

      return {
        id: msg.id || Date.now().toString(),
        role: msg.role || "assistant",
        parts,
        metadata: {
          createdAt: new Date().toISOString(),
          provider: messageProvider,
          timelineEvents: shouldAttachTimeline ? liveTimeline : undefined,
        },
      };
    });

    // Prepend DB messages so previous conversation history stays visible
    return [...initialMessages, ...convertedRaw];
  }, [rawMessages, liveTimeline, initialMessages, currentProvider]);

  return messages;
}

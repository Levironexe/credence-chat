/**
 * Custom hook for handling structured SSE events from LangGraph backend
 *
 * This hook reads raw SSE streams and handles custom event types (node_start, tool_call, etc.)
 * without using the AI SDK's useChat hook.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { CollapsibleSection, TimelineEvent } from "@/lib/sse-handler";
import { SSEEventHandler } from "@/lib/sse-handler";

interface StructuredEvent {
  type: "node_start" | "tool_call" | "tool_result" | "text" | "reasoning" | "skip" | "error" | "text-start" | "text-delta" | "text-end" | "finish";
  [key: string]: any;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts?: any[]; // Parts array from SSE handler
}

export function useStructuredChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [collapsibleSections, setCollapsibleSections] = useState<CollapsibleSection[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const sseHandlerRef = useRef<SSEEventHandler | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageRef = useRef<string>("");

  // Initialize SSE handler
  if (!sseHandlerRef.current) {
    sseHandlerRef.current = new SSEEventHandler(() => {
      const state = sseHandlerRef.current?.getState();
      if (state) {
        setCollapsibleSections([...state.collapsibleSections]);
        setTimeline([...state.timeline]);

        // Update last assistant message with parts array
        setMessages((prev) => {
          if (prev.length === 0 || prev[prev.length - 1].role !== "assistant") {
            return prev;
          }

          // Build content string from parts for backwards compatibility
          const textParts = state.parts.filter((p) => p.type === "text");
          const content = textParts.map((p) => p.text).join("");

          return [
            ...prev.slice(0, -1),
            {
              ...prev[prev.length - 1],
              content,
              parts: state.parts,
            },
          ];
        });
      }
    });
  }

  const handleEvent = useCallback((event: StructuredEvent) => {
    console.log("[SSE Event]", event.type, event);

    switch (event.type) {
      case "text":
        // Ensure assistant message exists before passing to handler
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last || last.role !== "assistant") {
            return [...prev, { id: Date.now().toString(), role: "assistant", content: "", parts: [] }];
          }
          return prev;
        });
        // Pass to SSE handler - it will update via onUpdate callback
        sseHandlerRef.current?.handleChunk(event as any);
        break;

      case "text-delta":
        // Ensure assistant message exists
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last || last.role !== "assistant") {
            return [...prev, { id: event.id || Date.now().toString(), role: "assistant", content: "", parts: [] }];
          }
          return prev;
        });
        // Pass to SSE handler as text event
        sseHandlerRef.current?.handleChunk({ ...event, type: "text", content: event.delta || "" } as any);
        break;

      case "node_start":
      case "tool_call":
      case "reasoning":
      case "skip":
      case "tool_result":
        // All structured events - pass to SSE handler
        sseHandlerRef.current?.handleChunk(event as any);
        break;
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string, options?: any) => {
      // Add user message
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Reset for new response
      currentMessageRef.current = "";
      sseHandlerRef.current?.reset();
      setIsStreaming(true);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: options?.id || Date.now().toString(),
            messages: [{ role: "user", parts: [{ type: "text", text }] }],
            selectedChatModel: options?.model || "agent/loan-analyst",
            selectedVisibilityType: "private",
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Chat API Error]", response.status, errorText);
          throw new Error(`Chat API error ${response.status}: ${errorText}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (!data || data === "[DONE]") continue;

              try {
                const event: StructuredEvent = JSON.parse(data);
                handleEvent(event);
              } catch (e) {
                console.warn("[SSE Parse Error]", data, e);
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("[Stream Error]", error);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant",
              content: `Error: ${error.message}`,
            },
          ]);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [handleEvent]
  );

  const stop = useCallback(async () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    messages,
    setMessages,
    sendMessage,
    collapsibleSections,
    timeline,
    isStreaming,
    stop,
  };
}

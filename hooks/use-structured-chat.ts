/**
 * Custom hook for handling structured SSE events from LangGraph backend
 *
 * This hook reads raw SSE streams and handles custom event types (node_start, tool_call, etc.)
 * without using the AI SDK's useChat hook.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { CollapsibleSection } from "@/lib/sse-handler";
import { SSEEventHandler } from "@/lib/sse-handler";

interface StructuredEvent {
  type: "node_start" | "tool_call" | "tool_result" | "text" | "reasoning" | "skip" | "error" | "text-start" | "text-delta" | "text-end" | "finish";
  [key: string]: any;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useStructuredChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [collapsibleSections, setCollapsibleSections] = useState<CollapsibleSection[]>([]);
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
      }
    });
  }

  const handleEvent = useCallback((event: StructuredEvent) => {
    console.log("[SSE Event]", event.type, event);

    switch (event.type) {
      case "text":
        // Main user-facing text - accumulate in current message
        const content = event.content || "";
        currentMessageRef.current += content;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: currentMessageRef.current }];
          } else {
            return [...prev, { id: Date.now().toString(), role: "assistant", content: currentMessageRef.current }];
          }
        });
        break;

      case "text-delta":
        // Standard AI SDK format - also accumulate
        const delta = event.delta || "";
        currentMessageRef.current += delta;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: currentMessageRef.current }];
          } else {
            return [...prev, { id: event.id || Date.now().toString(), role: "assistant", content: currentMessageRef.current }];
          }
        });
        break;

      case "node_start":
      case "tool_call":
      case "reasoning":
      case "skip":
        // Structured events - pass to SSE handler
        sseHandlerRef.current?.handleChunk(event as any);
        break;

      case "tool_result":
        // Tool result - pass to SSE handler
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

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    messages,
    setMessages,
    sendMessage,
    collapsibleSections,
    isStreaming,
    stop,
  };
}

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

export function useStructuredChat(initialHistory?: Array<{ role: string; content: string }>) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [collapsibleSections, setCollapsibleSections] = useState<CollapsibleSection[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const sseHandlerRef = useRef<SSEEventHandler | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageRef = useRef<string>("");
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;
  const initialHistoryRef = useRef(initialHistory);
  initialHistoryRef.current = initialHistory;

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

    // Transition from submitted → streaming on first event
    setIsSubmitted(false);
    setIsStreaming(true);

    // Ensure assistant message exists for all event types
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== "assistant") {
        return [...prev, { id: Date.now().toString(), role: "assistant", content: "", parts: [] }];
      }
      return prev;
    });

    switch (event.type) {
      case "text":
        sseHandlerRef.current?.handleChunk(event as any);
        break;

      case "text-delta":
        sseHandlerRef.current?.handleChunk({ ...event, type: "text", content: event.delta || "" } as any);
        break;

      case "node_start":
      case "tool_call":
      case "reasoning":
      case "skip":
      case "tool_result":
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

      // Build conversation history: initial history (from DB) + session messages + new message
      const historyMessages: Array<{ role: string; parts: Array<{ type: string; text: string }> }> = [];

      // Include initial history from DB (previous conversations loaded on page)
      if (initialHistoryRef.current) {
        for (const msg of initialHistoryRef.current) {
          historyMessages.push({
            role: msg.role,
            parts: [{ type: "text", text: msg.content }],
          });
        }
      }

      // Add current session messages
      const currentMessages = [...messagesRef.current];
      for (const msg of currentMessages) {
        if (msg.role === "user" || msg.role === "assistant") {
          historyMessages.push({
            role: msg.role,
            parts: [{ type: "text", text: msg.content }],
          });
        }
      }
      // Add the new user message
      historyMessages.push({ role: "user", parts: [{ type: "text", text }] });

      setMessages((prev) => [...prev, userMsg]);

      // Reset for new response — enter "submitted" state until first SSE event
      currentMessageRef.current = "";
      sseHandlerRef.current?.reset();
      setIsSubmitted(true);
      setIsStreaming(false);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: options?.id || Date.now().toString(),
            messages: historyMessages,
            selectedChatModel: options?.model || "agent/loan-analyst",
            selectedVisibilityType: "private",
            selectedProfileId: options?.selectedProfileId || null,
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
        setIsSubmitted(false);
      }
    },
    [handleEvent]
  );

  const stop = useCallback(async () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setIsSubmitted(false);
  }, []);

  return {
    messages,
    setMessages,
    sendMessage,
    collapsibleSections,
    timeline,
    isStreaming,
    isSubmitted,
    stop,
  };
}

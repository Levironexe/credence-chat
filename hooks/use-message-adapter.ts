/**
 * Adapter hook to convert simple Message format from useStructuredChat
 * to complex ChatMessage format required by UI components
 */

"use client";

import { useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/types";

interface SimpleMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useMessageAdapter(
  rawMessages: SimpleMessage[],
  initialMessages: ChatMessage[],
  currentProvider?: string
): ChatMessage[] {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  useEffect(() => {
    // Only update if rawMessages has content (avoid overwriting initialMessages with empty array)
    if (rawMessages.length > 0) {
      const chatMessages: ChatMessage[] = rawMessages.map((msg) => ({
        id: msg.id || Date.now().toString(),
        role: msg.role || "assistant",
        parts: [
          {
            type: "text" as const,
            text: String(msg.content || ""), // Explicitly convert to string
          },
        ],
        metadata: {
          createdAt: new Date().toISOString(),
          provider: currentProvider,
        },
      }));
      setMessages(chatMessages);
    }
  }, [rawMessages, currentProvider]);

  return messages;
}

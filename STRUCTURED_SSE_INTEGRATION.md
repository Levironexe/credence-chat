# Structured SSE Integration Guide

This guide shows how to integrate the new `useStructuredChat` hook into the chat component to enable collapsible process views.

## Overview

The new architecture uses:
- **Backend**: FastAPI emits clean structured events (`{"type": "node_start", "node": "classify"}`)
- **Frontend**: Raw SSE reader that handles all event types without AI SDK transformation

## Quick Start

### Option 1: Replace existing useChat hook

In `components/chat.tsx`, replace:

```typescript
const {
  messages,
  setMessages,
  sendMessage,
  status,
  stop,
  // ... other methods
} = useChat<ChatMessage>({
  id,
  messages: initialMessages,
  // ... options
});
```

With:

```typescript
import { useStructuredChat } from "@/hooks/use-structured-chat";
import { ProcessViewer } from "@/components/process-viewer";

const {
  messages,
  setMessages,
  sendMessage,
  collapsibleSections,
  isStreaming,
  stop,
} = useStructuredChat();
```

### Option 2: Test with a minimal component first

Create a new file `components/structured-chat-test.tsx`:

```typescript
"use client";

import { useStructuredChat } from "@/hooks/use-structured-chat";
import { ProcessViewer } from "@/components/process-viewer";
import { useState } from "react";

export function StructuredChatTest() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, collapsibleSections, isStreaming } = useStructuredChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input, { model: "agent/loan-analyst" });
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-screen p-4">
      {/* Messages */}
      <div className="flex-1 overflow-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              msg.role === "user"
                ? "bg-blue-100 dark:bg-blue-900"
                : "bg-gray-100 dark:bg-gray-800"
            }`}
          >
            <div className="font-semibold mb-2">
              {msg.role === "user" ? "You" : "Credence AI"}
            </div>
            <div className="prose dark:prose-invert">{msg.content}</div>
          </div>
        ))}

        {/* Process viewer - collapsible sections */}
        {collapsibleSections.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">
              Internal Process
            </h3>
            <ProcessViewer sections={collapsibleSections} />
          </div>
        )}

        {isStreaming && <div className="text-sm text-gray-500">Typing...</div>}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the loan application..."
          className="flex-1 p-2 border rounded"
          disabled={isStreaming}
        />
        <button
          type="submit"
          disabled={isStreaming}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

Then create a test page at `app/test-chat/page.tsx`:

```typescript
import { StructuredChatTest } from "@/components/structured-chat-test";

export default function TestChatPage() {
  return <StructuredChatTest />;
}
```

Visit `/test-chat` to test the integration.

## Event Types

The frontend now receives these structured events:

### Process Events (Collapsible)
```json
{"type": "node_start", "node": "classify", "message": "📋 Classifying query..."}
{"type": "tool_call", "tool": "credit_score_model", "input": {...}}
{"type": "tool_result", "tool": "credit_score_model", "output": "..."}
{"type": "reasoning", "node": "planning", "content": "I will analyze..."}
{"type": "skip", "node": "counterfactual_generation", "message": "score above 670"}
```

### Text Events (Main Response)
```json
{"type": "text", "content": "Based on the analysis..."}
{"type": "text-delta", "id": "msg-123", "delta": "continuing..."}
```

## UI Layout

The recommended layout separates process from response:

```
┌─────────────────────────────────────┐
│ User Message                        │
├─────────────────────────────────────┤
│ Assistant Response (main text)      │
│                                     │
│ Based on the analysis of the       │
│ grocery store application...        │
├─────────────────────────────────────┤
│ ▼ 📋 Classifying query...          │  <- Collapsible (closed)
├─────────────────────────────────────┤
│ ▶ 🔧 credit_score_model            │  <- Collapsible (closed)
│   Input: {...}                      │
│   Output: {...}                     │
├─────────────────────────────────────┤
│ ▶ ⚖️ Running fairness validation... │  <- Collapsible (closed)
└─────────────────────────────────────┘
```

## Debugging

Enable console logging to see events:

```typescript
// The hook logs all events:
console.log("[SSE Event]", event.type, event);
```

Backend logs structured events being emitted:

```bash
DEBUG:app.routers.chat:Passing through structured event: node_start
DEBUG:app.routers.chat:Passing through structured event: tool_call
DEBUG:app.routers.chat:Passing through structured event: text
```

## Testing

Test with the grocery store query:

```
A small grocery store in Ho Chi Minh City:
- Monthly revenue: 120 million VND
- Operating margin: 18%
- Business tenure: 3 years
- Industry: retail grocery
- Loan requested: 300 million VND

Please assess this loan application.
```

Expected behavior:
1. See "📋 Classifying query..." collapsible section
2. See "🔍 Checking data completeness..." section
3. See tool calls like credit_score_model in collapsible boxes
4. See main loan assessment report as normal text
5. All process sections auto-collapse when done

## Troubleshooting

### No collapsible sections appear
- Check browser console for `[SSE Event]` logs
- Verify events have correct `type` field
- Check that ProcessViewer component is rendered

### Stream stops after a few events
- Check backend logs for errors
- Look for uncaught exceptions in _transform_event_to_sse
- Add try-catch blocks around streaming loop

### Text appears in wrong section
- Verify `type: "text"` goes to main response
- Verify `type: "reasoning"` goes to collapsible
- Check USER_FACING_NODES in langgraph_agent.py

## Migration Checklist

- [ ] Backend emits clean structured events (no `choices` wrapper)
- [ ] Router passes through events unchanged
- [ ] Frontend uses `useStructuredChat` hook
- [ ] ProcessViewer component is rendered
- [ ] Test with loan assessment query
- [ ] Verify collapsible sections appear
- [ ] Verify main text streams correctly

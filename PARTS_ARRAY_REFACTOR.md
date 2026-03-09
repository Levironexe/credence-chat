# Parts Array Refactor - Complete

## Overview
Successfully refactored the message architecture to use a unified parts array instead of storing content in two separate columns (`parts` for text + `timelineEvents` for tool calls/reasoning).

## Problem Solved
- **Content Duplication**: Previously, text content was stored in `parts` column while tool calls, reasoning, and node events were stored in `timelineEvents` column
- **Copy Function**: The copy button could only copy text from `parts`, missing tool calls and other content
- **Architecture Mismatch**: The dual-column approach didn't match the AI SDK's standard message parts pattern

## Changes Made

### 1. Type Definitions (`lib/types.ts`)
Added new data types to `CustomUIDataTypes`:
```typescript
"tool-call": { name: string; input: Record<string, any> };
"tool-result": { name: string; input: Record<string, any>; output: any; isError?: boolean };
reasoning: { content: string; node?: string };
"node-start": { title: string; node: string };
```

### 2. SSE Handler (`lib/sse-handler.ts`)
Created new `MessagePart` type union and refactored all handlers:
```typescript
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool-call"; name: string; input: Record<string, any> }
  | { type: "tool-result"; name: string; input: Record<string, any>; output: any; isError?: boolean }
  | { type: "reasoning"; content: string; node?: string }
  | { type: "node-start"; title: string; node: string };
```

**Key Changes**:
- `handleText()`: Creates or appends to text parts
- `handleReasoning()`: Creates reasoning parts
- `handleToolCall()`: Creates tool-call parts
- `handleToolResult()`: Converts tool-call to tool-result parts
- `handleNodeStart()`: Creates node-start parts
- `getState()`: Now returns `parts` array
- Maintained backwards compatibility with old timeline/sections structure

### 3. Structured Chat Hook (`hooks/use-structured-chat.ts`)
Updated to use parts array from SSE handler:
- SSE handler's `onUpdate` callback now updates messages with `parts` array
- Builds content string from text parts for backwards compatibility
- Ensures assistant message exists before passing events to handler

### 4. Message Adapter (`hooks/use-message-adapter.ts`)
Added conversion from simple MessagePart objects to AI SDK data parts:
```typescript
// Convert simple MessagePart objects to AI SDK data parts
if (part.type === "tool-call") {
  return {
    type: "data-tool-call" as const,
    data: { name: part.name, input: part.input },
  };
}
// ... similar for tool-result, reasoning, node-start
```

### 5. Message Rendering (`components/message.tsx`)
Added rendering for new part types:
```typescript
if (type === "data-tool-call" && "data" in part) {
  const toolData = part.data as { name: string; input: Record<string, any> };
  return <Tool>...</Tool>;
}
// ... similar for data-tool-result, data-node-start, data-reasoning
```

## Data Flow

### During Streaming:
1. Backend sends SSE events (tool_call, tool_result, reasoning, text, node_start)
2. `SSEEventHandler.handleChunk()` builds `MessagePart[]` array
3. `useStructuredChat` receives parts via `getState()` callback
4. `useMessageAdapter` converts simple parts to AI SDK data parts (data-tool-call, etc.)
5. UI renders parts array using type-specific components

### When Loading from Database:
1. Database stores parts in `Message_v2.parts` column (JSON)
2. `convertToUIMessages()` loads parts as-is
3. UI renders using same part-type logic

## Backwards Compatibility
- Old `timelineEvents` structure maintained in parallel
- Existing messages with `timelineEvents` still render via `TimelineRenderer`
- New messages use parts array but also populate timeline for compatibility
- Database schema unchanged (`parts` and `timelineEvents` columns both exist)

## Backend Update (COMPLETED ✅)
The backend has been updated to save unified parts arrays:

**File**: `credence-backend/app/routers/chat.py` (lines 431-443)

**Current**:
```python
assistant_message = Message(
    chatId=chat_id,
    role="assistant",
    parts=[{"type": "text", "text": full_content}],  # Only text
    timelineEvents=timeline_events,  # Separate timeline
    provider=provider,
    createdAt=datetime.now(timezone.utc),
)
```

**Needed**:
```python
# Build unified parts array from timeline events
parts = []
for event in timeline_events:
    if event['eventType'] == 'text':
        parts.append({"type": "text", "text": event['textContent']})
    elif event['section']:
        section = event['section']
        if section['type'] == 'tool':
            # Extract tool name and create tool parts
            tool_name = section['title'].strip()
            parts.append({
                "type": "tool-call",
                "name": tool_name,
                "input": {...}  # Extract from section content
            })
            if section['content']:  # Has result
                parts.append({
                    "type": "tool-result",
                    "name": tool_name,
                    "input": {...},
                    "output": {...}  # Extract from section content
                })
        elif section['type'] == 'reasoning':
            parts.append({
                "type": "reasoning",
                "content": section['content'],
                "node": section.get('node')
            })
        elif section['type'] == 'node':
            parts.append({
                "type": "node-start",
                "title": section['title'],
                "node": section.get('node', '')
            })

assistant_message = Message(
    chatId=chat_id,
    role="assistant",
    parts=parts,  # Unified parts array
    timelineEvents=timeline_events,  # Keep for backwards compatibility
    provider=provider,
    createdAt=datetime.now(timezone.utc),
)
```

## Benefits
1. **Single Source of Truth**: All content in one `parts` array
2. **Copy Function**: Will copy all content including tool calls
3. **Standard Pattern**: Matches AI SDK's recommended message structure
4. **Type Safety**: Proper TypeScript types for all part types
5. **Extensible**: Easy to add new part types in the future

## Backend Implementation Details

### Helper Function Added
**Location**: `credence-backend/app/routers/chat.py` (lines 45-133)

Created `convert_timeline_to_parts()` function that:
- Converts timeline events to unified parts array
- Merges consecutive text events into single text parts
- Parses tool input/output from markdown-formatted section content
- Handles node-start, reasoning, tool-call, and tool-result parts
- Maintains proper part ordering

### Message Saving Updated
**Location**: `credence-backend/app/routers/chat.py` (lines 565-579)

```python
# Build unified parts array from timeline events
parts = convert_timeline_to_parts(timeline_events)

# Fallback to simple text if no parts generated
if not parts and full_content:
    parts = [{"type": "text", "text": full_content}]

# Save with unified parts array
assistant_message = Message(
    chatId=chat_id,
    role="assistant",
    parts=parts,  # ✅ Unified parts array with all content
    timelineEvents=timeline_events,  # Keep for backwards compatibility
    provider=provider,
    createdAt=datetime.utcnow()
)
```

## Testing Checklist
- [ ] Test streaming with tool calls
- [ ] Test streaming with reasoning
- [ ] Test streaming with node events
- [ ] Verify copy function includes all parts
- [ ] Test page refresh persists all parts
- [ ] Verify backwards compatibility with old messages
- [ ] Test rendering of all part types
- [ ] Verify backend converts timeline to parts correctly
- [ ] Test database persistence of parts array

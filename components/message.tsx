"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import React, { useState } from "react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { chatModels } from "@/lib/ai/models";
import { ModelSelectorLogo } from "./ai-elements/model-selector";
import { useDataStream } from "./data-stream-provider";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { MessageContent } from "./elements/message";
import { Response } from "./elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "./elements/tool";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";
import { StreamingAgentDisplay } from "./streaming-agent-display";
import {
  parseAgentStream,
  hasAgentWorkflow,
} from "@/lib/parse-agent-stream";
import { TimelineRenderer } from "./timeline-renderer";
import { PipelineDisplay } from "./pipeline-display";

const PurePreviewMessage = ({
  addToolApprovalResponse,
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
  selectedModelId,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  selectedModelId: string;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  // Get provider:
  // 1) Use metadata.provider if available (from database)
  // 2) Otherwise use selectedModelId (for new/streaming messages in current session)
  const provider = message.metadata?.provider?.toLowerCase() ||
    (() => {
      const selectedModel = chatModels.find((model) => model.id === selectedModelId);
      return selectedModel?.provider.toLowerCase() || "anthropic";
    })();

  useDataStream();

  // Hide the assistant message entirely while it has no visible content.
  // Pipeline events (node-start, tool-call, etc.) count as visible content.
  const hasVisibleContent = message.role !== "assistant" || message.parts?.some(
    (p) =>
      (p.type === "text" && (p as any).text?.trim()) ||
      p.type === "reasoning" ||
      p.type === "data-node-start" ||
      p.type === "data-tool-call" ||
      p.type === "data-tool-result" ||
      p.type === "data-reasoning"
  );

  if (!hasVisibleContent && isLoading) {
    return null;
  }

  return (
    <div
      className="group/message fade-in w-full animate-in duration-200"
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn("flex w-full items-start gap-2 md:gap-3", {
          "justify-end": message.role === "user" && mode !== "edit",
          "justify-start": message.role === "assistant",
        })}
      >
        {message.role === "assistant" && (
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background border border-border">
            <ModelSelectorLogo provider={provider} className="size-6"/>
          </div>
        )}

        <div
          className={cn("flex flex-col", {
            "gap-2 md:gap-4": message.parts?.some(
              (p) => p.type === "text" && p.text?.trim()
            ),
            "w-full":
              (message.role === "assistant" &&
                (message.parts?.some(
                  (p) => p.type === "text" && p.text?.trim()
                ) ||
                  message.parts?.some((p) => p.type.startsWith("tool-")) ||
                  message.parts?.some((p) => p.type.startsWith("data-")))) ||
              mode === "edit",
            "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
              message.role === "user" && mode !== "edit",
          })}
        >
          {attachmentsFromMessage.length > 0 && (
            <div
              className="flex flex-row justify-end gap-2"
              data-testid={"message-attachments"}
            >
              {attachmentsFromMessage.map((attachment) => (
                <PreviewAttachment
                  attachment={{
                    name: attachment.filename ?? "file",
                    contentType: attachment.mediaType,
                    url: attachment.url,
                  }}
                  key={attachment.url}
                />
              ))}
            </div>
          )}

          {/* Pipeline events: stacked display in collapsible wrapper */}
          {message.role === "assistant" && (() => {
            const pipelineParts = (message.parts || []).filter(
              (p) =>
                p.type === "data-node-start" ||
                p.type === "data-tool-call" ||
                p.type === "data-tool-result" ||
                p.type === "data-reasoning"
            );
            if (pipelineParts.length > 0) {
              return (
                <PipelineDisplay
                  parts={pipelineParts}
                  isLoading={isLoading}
                />
              );
            }
            return null;
          })()}

          {message.parts?.map((part, index) => {
            const { type } = part;
            const key = `message-${message.id}-part-${index}`;

            // Pipeline parts rendered above in PipelineDisplay
            if (
              type === "data-node-start" ||
              type === "data-tool-call" ||
              type === "data-tool-result" ||
              type === "data-reasoning"
            ) {
              return null;
            }

            if (type === "reasoning") {
              const hasContent = part.text?.trim().length > 0;
              const isStreaming = "state" in part && part.state === "streaming";
              if (hasContent || isStreaming) {
                return (
                  <MessageReasoning
                    isLoading={isLoading || isStreaming}
                    key={key}
                    reasoning={part.text || ""}
                  />
                );
              }
            }

            if (type === "text") {
              if (mode === "view") {
                // Check if this is an agent workflow message
                const hasWorkflow =
                  message.role === "assistant" && hasAgentWorkflow(part.text);

                if (hasWorkflow) {
                  // Parse workflow state with ordered sections (thought -> text -> tools -> text)
                  const agentState = parseAgentStream(part.text);

                  return (
                    <div key={key} className="flex flex-col">
                      {/* Render ordered sections: boxes for thought/tools, normal text for response */}
                      <StreamingAgentDisplay state={agentState} />
                    </div>
                  );
                }

                // Regular message (no agent workflow)
                return (
                  <MessageContent
                    key={key}
                    className={cn({
                      "overflow-hidden wrap-break-word w-fit rounded-2xl px-3 py-2  text-white text-[15px]":
                        message.role === "user",
                      "bg-transparent px-0 py-0 text-left text-[15px]":
                        message.role === "assistant",
                    })}
                    data-testid="message-content"
                    style={
                      message.role === "user"
                        ? { backgroundColor: "#171717" }
                        : undefined
                    }
                  >
                    <Response>{sanitizeText(part.text)}</Response>
                  </MessageContent>
                );
              }

              if (mode === "edit") {
                return (
                  <div
                    className="flex w-full flex-row items-start gap-3"
                    key={key}
                  >
                    <div className="size-8" />
                    <div className="min-w-0 flex-1">
                      <MessageEditor
                        key={message.id}
                        message={message}
                        regenerate={regenerate}
                        setMessages={setMessages}
                        setMode={setMode}
                      />
                    </div>
                  </div>
                );
              }
            }

            if (type === "tool-getWeather") {
              const { toolCallId, state } = part;
              const approvalId = (part as { approval?: { id: string } })
                .approval?.id;
              const isDenied =
                state === "output-denied" ||
                (state === "approval-responded" &&
                  (part as { approval?: { approved?: boolean } }).approval
                    ?.approved === false);
              const widthClass = "w-[min(100%,450px)]";

              if (state === "output-available") {
                return (
                  <div className={widthClass} key={toolCallId}>
                    <Weather weatherAtLocation={part.output} />
                  </div>
                );
              }

              if (isDenied) {
                return (
                  <div className={widthClass} key={toolCallId}>
                    <Tool className="w-full" defaultOpen={true}>
                      <ToolHeader
                        state="output-denied"
                        type="tool-getWeather"
                      />
                      <ToolContent>
                        <div className="px-4 py-3 text-muted-foreground text-[15px]">
                          Weather lookup was denied.
                        </div>
                      </ToolContent>
                    </Tool>
                  </div>
                );
              }

              if (state === "approval-responded") {
                return (
                  <div className={widthClass} key={toolCallId}>
                    <Tool className="w-full" defaultOpen={true}>
                      <ToolHeader state={state} type="tool-getWeather" />
                      <ToolContent>
                        <ToolInput input={part.input} />
                      </ToolContent>
                    </Tool>
                  </div>
                );
              }

              return (
                <div className={widthClass} key={toolCallId}>
                  <Tool className="w-full" defaultOpen={true}>
                    <ToolHeader state={state} type="tool-getWeather" />
                    <ToolContent>
                      {(state === "input-available" ||
                        state === "approval-requested") && (
                        <ToolInput input={part.input} />
                      )}
                      {state === "approval-requested" && approvalId && (
                        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
                          <button
                            className="rounded-[14px] px-3 py-1.5 text-muted-foreground text-[15px] transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => {
                              addToolApprovalResponse({
                                id: approvalId,
                                approved: false,
                                reason: "User denied weather lookup",
                              });
                            }}
                            type="button"
                          >
                            Deny
                          </button>
                          <button
                            className=" bg-background px-3 py-1.5 text-primary-foreground text-[15px] transition-colors hover:bg-background/90"
                            onClick={() => {
                              addToolApprovalResponse({
                                id: approvalId,
                                approved: true,
                              });
                            }}
                            type="button"
                          >
                            Allow
                          </button>
                        </div>
                      )}
                    </ToolContent>
                  </Tool>
                </div>
              );
            }

            if (type === "tool-createDocument") {
              const { toolCallId } = part;

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error creating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <DocumentPreview
                  isReadonly={isReadonly}
                  key={toolCallId}
                  result={part.output}
                />
              );
            }

            if (type === "tool-updateDocument") {
              const { toolCallId } = part;

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error updating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <div className="relative" key={toolCallId}>
                  <DocumentPreview
                    args={{ ...part.output, isUpdate: true }}
                    isReadonly={isReadonly}
                    result={part.output}
                  />
                </div>
              );
            }

            if (type === "tool-requestSuggestions") {
              const { toolCallId, state } = part;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-requestSuggestions" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={part.input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={
                          "error" in part.output ? (
                            <div className="rounded border p-2 text-red-500">
                              Error: {String(part.output.error)}
                            </div>
                          ) : (
                            <DocumentToolResult
                              isReadonly={isReadonly}
                              result={part.output}
                              type="request-suggestions"
                            />
                          )
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            return null;
          })}

          {/* Render timeline ONLY for old messages without unified parts (backwards compatibility) */}
          {message.role === "assistant" &&
           message.metadata?.timelineEvents &&
           message.metadata.timelineEvents.length > 0 &&
           !message.parts?.some((p) =>
             p.type === "data-tool-call" ||
             p.type === "data-tool-result" ||
             p.type === "data-reasoning" ||
             p.type === "data-node-start"
           ) && (
            <TimelineRenderer timeline={message.metadata.timelineEvents as any[]} />
          )}

          {!isReadonly && (
            <MessageActions
              chatId={chatId}
              isLoading={isLoading}
              key={`action-${message.id}`}
              message={message}
              setMode={setMode}
              vote={vote}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const PreviewMessage = React.memo(PurePreviewMessage);

// Map tool/node names to user-friendly loading labels
const LOADING_LABELS: Record<string, string> = {
  credit_score_model: "Computing credit score",
  shap_explainer: "Analyzing score factors",
  fairness_validator: "Validating fairness",
  counterfactual_generator: "Generating improvement paths",
  pdf_extractor: "Extracting PDF",
  bank_statement_parser: "Parsing bank statement",
  // Node names as fallback
  classify: "Classifying query",
  data_completeness: "Checking data",
  planning: "Planning analysis",
  credit_scoring: "Computing credit score",
  explainability: "Analyzing score factors",
  fairness_check: "Validating fairness",
  counterfactual_generation: "Generating improvement paths",
  response: "Generating report",
};

/**
 * Extract the current loading label from the last assistant message parts.
 * Looks at the most recent tool_call or node_start event.
 */
export function getLoadingLabel(messages: ChatMessage[]): string {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.parts) return "Analyzing";

  // Walk parts backwards to find the most recent tool or node event
  for (let i = lastMsg.parts.length - 1; i >= 0; i--) {
    const part = lastMsg.parts[i];
    if (part.type === "data-tool-call" && part.data) {
      const name = (part.data as any).name;
      return LOADING_LABELS[name] || "Processing";
    }
    if (part.type === "data-node-start" && part.data) {
      const node = (part.data as any).node;
      return LOADING_LABELS[node] || "Processing";
    }
  }

  return "Analyzing";
}

/**
 * Check if the last assistant message has started streaming text content.
 */
export function hasTextContent(messages: ChatMessage[]): boolean {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.parts) return false;
  return lastMsg.parts.some((p) => p.type === "text" && (p as any).text?.trim());
}

/**
 * Check if the last assistant message has any pipeline events (visible in PipelineDisplay).
 */
export function hasPipelineContent(messages: ChatMessage[]): boolean {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.parts) return false;
  return lastMsg.parts.some(
    (p) =>
      p.type === "data-node-start" ||
      p.type === "data-tool-call" ||
      p.type === "data-tool-result" ||
      p.type === "data-reasoning"
  );
}

export const ThinkingMessage = ({ selectedModelId, label }: { selectedModelId: string; label?: string }) => {
  const selectedModel = chatModels.find((model) => model.id === selectedModelId);
  const provider = selectedModel?.provider.toLowerCase() || "anthropic";
  const displayLabel = label || "Analyzing";

  return (
    <div
      className="group/message fade-in w-full animate-in duration-300"
      data-role="assistant"
      data-testid="message-assistant-loading"
    >
      <div className="flex items-start justify-start gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background border border-border">
          <div className="animate-pulse">
            <ModelSelectorLogo provider={provider} className="size-6" />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 md:gap-4">
          <div className="flex items-center gap-1.5 p-0 text-muted-foreground text-[15px]">
            <span className="animate-pulse">{displayLabel}</span>
            <span className="inline-flex">
              <span className="animate-bounce [animation-delay:0ms]">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

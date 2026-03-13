"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { ChatHeader } from "@/components/chat-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Vote } from "@/lib/db/schema";
import type { Attachment, ChatMessage } from "@/lib/types";
import { fetcher, generateUUID } from "@/lib/utils";
import { getBackendUrl } from "@/lib/api/client";
import { Artifact } from "./artifact";
import { Greeting } from "./greeting";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { SuggestedActions } from "./suggested-actions";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";
import { useStructuredChat } from "@/hooks/use-structured-chat";
import { useMessageAdapter } from "@/hooks/use-message-adapter";
import { ApplicantProfilePanel, type ApplicantProfileType } from "./applicant-profile-panel";

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
}) {
  const router = useRouter();

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // When user navigates back/forward, refresh to sync with URL
      router.refresh();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);

  const [input, setInput] = useState<string>("");
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const currentModelIdRef = useRef(initialChatModel);

  // Applicant profile panel state
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ApplicantProfileType | null>(null);
  const selectedProfileRef = useRef<ApplicantProfileType | null>(null);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  useEffect(() => {
    selectedProfileRef.current = selectedProfile;
  }, [selectedProfile]);

  // Sync ref with state
  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  // Use structured chat for real-time SSE events
  const {
    messages: rawMessages,
    setMessages: setRawMessages,
    sendMessage: sendStructuredMessage,
    collapsibleSections,
    timeline: liveTimeline,
    isStreaming,
    isSubmitted,
    stop,
  } = useStructuredChat();

  // Convert simple messages to ChatMessage format
  // Pass liveTimeline to attach to streaming message
  const currentProvider = currentModelIdRef.current?.split("/")[0];
  const messages = useMessageAdapter(rawMessages, initialMessages, currentProvider, liveTimeline);

  // Wrapper to handle both string and ChatMessage inputs (async to match useChat signature)
  const sendMessage = useCallback(
    async (messageOrText?: any): Promise<void> => {
      if (!messageOrText) return;

      let text: string;

      if (typeof messageOrText === "string") {
        text = messageOrText;
      } else {
        // Extract text from ChatMessage parts (handles both full and partial ChatMessage)
        const textPart = messageOrText.parts?.find((p: any) => p.type === "text");
        text = (textPart as { text?: string })?.text || "";
      }

      if (!text.trim()) return;

      // Pass selected profile ID as a separate field (not injected into prompt)
      const profile = selectedProfileRef.current;
      const profileId = profile?.id !== "custom" ? profile?.id : undefined;

      sendStructuredMessage(text, {
        id,
        model: currentModelIdRef.current,
        selectedProfileId: profileId || null,
      });
    },
    [sendStructuredMessage, id]
  ) as any; // Type assertion to match UseChatHelpers signature

  // Stub functions for compatibility
  const regenerate = useCallback(async () => {
    console.warn("regenerate: Not implemented with useStructuredChat");
  }, []);

  const resumeStream = useCallback(async () => {
    console.warn("resumeStream: Not implemented with useStructuredChat");
  }, []);

  const addToolApprovalResponse = useCallback(async () => {
    console.warn("addToolApprovalResponse: Not implemented with useStructuredChat");
  }, []);

  const setMessages = useCallback(() => {
    console.warn("setMessages: Not implemented with useStructuredChat");
  }, []);

  // Map isStreaming/isSubmitted to status for compatibility
  const status = isSubmitted ? "submitted" : isStreaming ? "streaming" : "ready";

  // Handle onFinish equivalent - update chat history and refresh sidebar scores
  useEffect(() => {
    if (!isStreaming && rawMessages.length > 0) {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      setProfileRefreshKey((k) => k + 1);
    }
  }, [isStreaming, rawMessages.length, mutate]);

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? getBackendUrl(`/api/vote/${id}`) : null,
    fetcher
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Note: useAutoResume disabled - not compatible with useStructuredChat
  // useAutoResume({
  //   autoResume,
  //   initialMessages,
  //   resumeStream,
  //   setMessages,
  // });

  return (
    <>
      <div className={`overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background transition-all duration-300 ${isProfilePanelOpen ? "mr-80" : ""}`}>
        <ChatHeader
          chatId={id}
          isReadonly={isReadonly}
          selectedVisibilityType={initialVisibilityType}
        />

        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 px-2 pb-16 md:px-4 md:pb-28 w-full max-w-4xl mx-auto">
            <Greeting />
            {!isReadonly && (
              <SuggestedActions
                chatId={id}
                sendMessage={sendMessage}
                selectedVisibilityType={visibilityType}
                selectedProfile={selectedProfile}
              />
            )}
            <div className="w-full">
              {!isReadonly && (
                <MultimodalInput
                  attachments={attachments}
                  chatId={id}
                  input={input}
                  messages={messages}
                  onModelChange={setCurrentModelId}
                  selectedModelId={currentModelId}
                  selectedVisibilityType={visibilityType}
                  sendMessage={sendMessage}
                  setAttachments={setAttachments}
                  setInput={setInput}
                  setMessages={setMessages}
                  status={status}
                  stop={stop}
                />
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="relative flex-1 overflow-y-auto min-h-0">
              <div className="h-full">
                {/* Show all messages - each message renders its own timeline */}
                {messages.length > 0 && (
                  <Messages
                    addToolApprovalResponse={addToolApprovalResponse}
                    chatId={id}
                    isArtifactVisible={isArtifactVisible}
                    isReadonly={isReadonly}
                    messages={messages}
                    regenerate={regenerate}
                    selectedModelId={currentModelId}
                    setMessages={setMessages}
                    status={status}
                    votes={votes}
                  />
                )}
              </div>
            </div>

            <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
              {!isReadonly && (
                <MultimodalInput
                  attachments={attachments}
                  chatId={id}
                  input={input}
                  messages={messages}
                  onModelChange={setCurrentModelId}
                  selectedModelId={currentModelId}
                  selectedVisibilityType={visibilityType}
                  sendMessage={sendMessage}
                  setAttachments={setAttachments}
                  setInput={setInput}
                  setMessages={setMessages}
                  status={status}
                  stop={stop}
                />
              )}
            </div>
          </>
        )}
      </div>

      <Artifact
        addToolApprovalResponse={addToolApprovalResponse}
        attachments={attachments}
        chatId={id}
        input={input}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        selectedModelId={currentModelId}
        selectedVisibilityType={visibilityType}
        sendMessage={sendMessage}
        setAttachments={setAttachments}
        setInput={setInput}
        setMessages={setMessages}
        status={status}
        stop={stop}
        votes={votes}
      />

      <ApplicantProfilePanel
        isOpen={isProfilePanelOpen}
        onToggle={() => setIsProfilePanelOpen((prev) => !prev)}
        selectedProfile={selectedProfile}
        onProfileChange={setSelectedProfile}
        refreshKey={profileRefreshKey}
      />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = "/";
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

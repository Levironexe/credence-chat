"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo, useMemo } from "react";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "./elements/suggestion";
import type { VisibilityType } from "./visibility-selector";
import type { ApplicantProfileType } from "./applicant-profile-panel";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
  selectedProfile?: ApplicantProfileType | null;
};

function PureSuggestedActions({ chatId, sendMessage, selectedProfile }: SuggestedActionsProps) {
  const suggestedActions = useMemo(() => {
    if (selectedProfile && selectedProfile.id !== "custom") {
      return [
        `Assess this applicant's creditworthiness`,
        `What are the key risk factors?`,
        `How can this applicant improve their score?`,
        `Explain the credit scoring model`,
      ];
    }
    if (selectedProfile?.id === "custom") {
      return [
        `Run a credit assessment on this applicant`,
        `What factors most affect credit approval?`,
        `Score this applicant and explain the result`,
        `Explain how the credit scoring model works`,
      ];
    }
    // No profile selected — show general actions
    return [
      "Assess a loan application",
      "What factors most affect credit approval?",
      "Explain how the credit scoring model works",
      "How does the fairness validation work?",
    ];
  }, [selectedProfile]);

  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={`${selectedProfile?.id || "none"}-${suggestedAction}`}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal p-3 text-left"
            onClick={(suggestion) => {
              window.history.pushState({}, "", `/chat/${chatId}`);
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: suggestion }],
              });
            }}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedProfile?.id !== nextProps.selectedProfile?.id) {
      return false;
    }

    return true;
  }
);

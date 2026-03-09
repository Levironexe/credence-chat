"use client";

import { useStructuredChat } from "@/hooks/use-structured-chat";
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

  // Auto-populate grocery store example
  const loadExample = () => {
    setInput(`A small grocery store in Ho Chi Minh City:
- Monthly revenue: 120 million VND
- Operating margin: 18%
- Business tenure: 3 years
- Industry: retail grocery
- Loan requested: 300 million VND

Please assess this loan application.`);
  };

  return (
    <div className="flex flex-col h-screen p-4 max-w-4xl mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Credence AI - Loan Assessment</h1>
        <button
          onClick={loadExample}
          className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Load Example
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              msg.role === "user"
                ? "bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-600"
                : "bg-gray-100 dark:bg-gray-800/40 border-l-4 border-gray-600"
            }`}
          >
            <div className="font-semibold mb-2 text-sm uppercase tracking-wide">
              {msg.role === "user" ? "You" : "Credence AI"}
            </div>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}


        {isStreaming && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            Processing...
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t pt-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the loan application..."
          className="flex-1 p-3 border rounded-lg resize-none h-24 dark:bg-gray-800 dark:border-gray-700"
          disabled={isStreaming}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {isStreaming ? "Processing..." : "Send"}
        </button>
      </form>

      {/* Debug panel - comment out for production */}
      {/*
      <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs opacity-50">
        <div className="font-mono text-gray-600 dark:text-gray-400">
          Messages: {messages.length} | Sections: {collapsibleSections.length} |
          Streaming: {isStreaming ? "Yes" : "No"}
        </div>
      </div>
      */}
    </div>
  );
}

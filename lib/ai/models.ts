// All models run through the LangGraph agent pipeline via OpenRouter
export const DEFAULT_CHAT_MODEL = "anthropic/claude-haiku-4.5";

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  // Anthropic
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", provider: "anthropic", description: "Fast and affordable, 200K context" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "anthropic", description: "Best balance of speed and intelligence, 1M context" },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6", provider: "anthropic", description: "Latest Sonnet, 1M context" },
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5", provider: "anthropic", description: "Powerful reasoning, 200K context" },
  { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6", provider: "anthropic", description: "Most capable Claude, 1M context" },
  // OpenAI
  { id: "openai/gpt-5.4-mini", name: "GPT-5.4 Mini", provider: "openai", description: "Fast and cost-effective, 400K context" },
  { id: "openai/gpt-5.4", name: "GPT-5.4", provider: "openai", description: "Latest flagship, 1M context" },
  { id: "openai/gpt-5.2", name: "GPT-5.2", provider: "openai", description: "Strong general-purpose, 400K context" },
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "openai", description: "Budget-friendly, 128K context" },
  { id: "openai/o4-mini-deep-research", name: "o4 Mini Deep Research", provider: "openai", description: "Reasoning with research, 200K context" },
  // Google
  { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", provider: "google", description: "Latest and most capable, 1M context" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "google", description: "Powerful reasoning, 1M context" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "google", description: "Fast and capable, 1M context" },
  { id: "google/gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite", provider: "google", description: "Ultra fast, 1M context" },
  // DeepSeek
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", provider: "deepseek", description: "Strong open-source, 164K context" },
  { id: "deepseek/deepseek-v3.1-terminus", name: "DeepSeek V3.1 Terminus", provider: "deepseek", description: "Optimized for tasks, 164K context" },
  // xAI
  { id: "x-ai/grok-4.20-beta", name: "Grok 4.20", provider: "xai", description: "Latest Grok, 2M context" },
  { id: "x-ai/grok-4-fast", name: "Grok 4 Fast", provider: "xai", description: "Fast with 2M context" },
  // Mistral
  { id: "mistralai/mistral-large-2512", name: "Mistral Large 3", provider: "mistral", description: "Most capable Mistral, 262K context" },
  { id: "mistralai/mistral-medium-3.1", name: "Mistral Medium 3.1", provider: "mistral", description: "Balanced speed and quality, 131K context" },
  { id: "mistralai/mistral-small-2603", name: "Mistral Small 4", provider: "mistral", description: "Fast and affordable, 262K context" },
  // Meta
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", provider: "meta-llama", description: "Open-source from Meta" },
];

// Group models by provider for UI
export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);

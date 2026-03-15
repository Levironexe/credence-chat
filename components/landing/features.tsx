const tools = [
  {
    icon: "◈",
    name: "Credit Scoring Model",
    description:
      "XGBoost default probability prediction mapped to a familiar 300–850 FICO-style scale. Target AUC > 0.85 on held-out test data.",
    detail: "Score 300–850",
  },
  {
    icon: "⬡",
    name: "SHAP Explainer",
    description:
      "TreeSHAP computes per-feature contributions for every decision in O(TLD) time. Every score is fully transparent — no black boxes.",
    detail: "Per-decision",
  },
  {
    icon: "⟳",
    name: "Counterfactual Generator",
    description:
      "DiCE generates realistic minimal-change paths to approval. Age can't decrease; income changes bounded to ±30%. Actionable, not generic.",
    detail: "DiCE-powered",
  },
  {
    icon: "⊜",
    name: "Fairness Validator",
    description:
      "Causal fairness checks flip sensitive attributes while holding everything else constant. Demographic parity gap target < 5%.",
    detail: "Bias detection",
  },
  {
    icon: "⌖",
    name: "Data Completeness Checker",
    description:
      "Identifies missing fields, ranks them by SHAP importance, and asks the loan officer for only the inputs that would move the score most.",
    detail: "SHAP-ranked",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-x border-b border-border px-8 py-16">
        {/* Section header */}
        <div className="mb-16 ">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">
            Five autonomous tools
          </p>
          <h2 className="font-lora text-3xl sm:text-4xl font-semibold text-white max-w-lg leading-tight">
            One agent. Every capability you need.
          </h2>
          <p className="mt-4 text-white/45 text-sm max-w-md leading-relaxed">
            The Credence agent autonomously decides which tools to call and in
            what order — score → explain → suggest improvements — without manual
            configuration.
          </p>
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-border">
          {tools.map((tool, i) => (
            <div
              key={tool.name}
              className={`group relative bg-black p-6 hover:bg-white/[0.03] transition-colors duration-300 ${
                i === 4 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              {/* Icon + badge */}
              <div className="flex items-start justify-between mb-4">
                <span className="text-2xl text-white/20 group-hover:text-white/40 transition-colors">
                  {tool.icon}
                </span>
                <span className="text-[10px] text-white/25 border border-white/10 rounded-full px-2 py-0.5">
                  {tool.detail}
                </span>
              </div>

              <h3 className="text-sm font-medium text-white mb-2">
                {tool.name}
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                {tool.description}
              </p>

              {/* Hover accent line */}
              <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
          </div>
    </section>
  );
}

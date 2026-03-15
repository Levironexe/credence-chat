const rows = [
  {
    capability: "Input method",
    traditional: "Rigid forms",
    mlBased: "Structured API",
    credence: "Natural language",
  },
  {
    capability: "Explainability",
    traditional: "None",
    mlBased: "Post-hoc",
    credence: "SHAP per decision",
  },
  {
    capability: "Rejection guidance",
    traditional: "Generic letter",
    mlBased: "None",
    credence: "Counterfactual paths",
  },
  {
    capability: "Thin-file handling",
    traditional: "Decline",
    mlBased: "Limited",
    credence: "Alternative data",
  },
  {
    capability: "Interaction",
    traditional: "One-shot",
    mlBased: "One-shot",
    credence: "Multi-turn dialogue",
  },
  {
    capability: "Adaptation",
    traditional: "Manual rules",
    mlBased: "Periodic retrain",
    credence: "Drift-aware auto-retrain",
  },
];

export function LandingComparison() {
  return (
    <section
      id="compare"
      className="bg-black "
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-x border-b border-border px-8 py-16">
        <div className="mb-16">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">
            Why Credence
          </p>
          <h2 className="font-lora text-3xl sm:text-4xl font-semibold text-white max-w-lg leading-tight">
            Beyond what traditional ML offers.
          </h2>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-4 bg-white/[0.03] border-b border-border">
            <div className="px-5 py-3 text-xs text-white/30 uppercase tracking-widest">
              Capability
            </div>
            <div className="px-5 py-3 text-xs text-white/30 uppercase tracking-widest border-l border-border">
              Traditional
            </div>
            <div className="px-5 py-3 text-xs text-white/30 uppercase tracking-widest border-l border-border">
              ML-based
            </div>
            <div className="px-5 py-3 text-xs text-white/60 uppercase tracking-widest border-l border-border bg-white/[0.03]">
              Credence
            </div>
          </div>

          {rows.map((row, i) => (
            <div
              key={row.capability}
              className={`grid grid-cols-4 border-b border-white/[0.04] last:border-b-0 group hover:bg-white/[0.015] transition-colors ${
                i % 2 === 0 ? "" : "bg-white/[0.01]"
              }`}
            >
              <div className="px-5 py-3.5 text-sm text-white/50">
                {row.capability}
              </div>
              <div className="px-5 py-3.5 text-sm text-white/25 border-l border-white/[0.04]">
                {row.traditional}
              </div>
              <div className="px-5 py-3.5 text-sm text-white/25 border-l border-white/[0.04]">
                {row.mlBased}
              </div>
              <div className="px-5 py-3.5 text-sm text-white/80 font-medium border-l border-border flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-400/60 shrink-0" />
                {row.credence}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-white/25 max-w-lg leading-relaxed">
          Credence is the first to apply the ReAct agentic pattern to end-to-end credit assessment for underbanked populations — composing scoring, explanation, and improvement guidance in a single natural-language interface.
        </p>
      </div>
          </div>
    </section>
  );
}

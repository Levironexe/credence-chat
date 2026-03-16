const steps = [
  {
    index: "01",
    actor: "Loan Officer",
    message: "Assess merchant ID 4827.",
    note: null,
  },
  {
    index: "02",
    actor: "Credence",
    message:
      "Merchant 4827: coffee shop, Hanoi, 18 months active, $1,200/mo revenue, 94% activity rate. Missing: loan amount and number of dependents — highest SHAP impact among missing fields. Could you provide them?",
    note: "data_completeness_checker → 2 missing fields identified",
  },
  {
    index: "03",
    actor: "Loan Officer",
    message: "She wants $5,000, two dependents.",
    note: null,
  },
  {
    index: "04",
    actor: "Credence",
    message:
      "Score: 640 (Fair — Manual Review). Top factors: strong monthly order consistency (+55 pts), short business tenure (−42 pts), revenue-to-loan ratio (+30 pts). To reach 670 (Good): 4 more months of consistent activity, or reduce loan to $4,000.",
    note: "credit_scoring_model → shap_explainer → counterfactual_generator",
    pipeline: { label: "Analysis Pipeline", tools: 5, steps: 11 },
  },
];

const scoreBands = [
  { range: "800–850", band: "Exceptional", decision: "Auto-approve", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" },
  { range: "740–799", band: "Very Good", decision: "Approve, standard terms", color: "bg-green-500/20 text-green-400 border-green-500/20" },
  { range: "670–739", band: "Good", decision: "Approve with conditions", color: "bg-lime-500/20 text-lime-400 border-lime-500/20" },
  { range: "580–669", band: "Fair", decision: "Manual review required", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20" },
  { range: "300–579", band: "Poor", decision: "Decline + counterfactual guidance", color: "bg-red-500/20 text-red-400 border-red-500/20" },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-x border-b border-border px-8 py-16">
        <div className="mb-16">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">
            Live conversation
          </p>
          <h2 className="font-lora text-3xl sm:text-4xl font-semibold text-white max-w-lg leading-tight">
            Natural language in. Decisions out.
          </h2>
          <p className="mt-4 text-white/45 text-sm max-w-md leading-relaxed">
            Loan officers interact in plain language. The agent reasons about what's needed, chains the right tools, and returns a full assessment — score, explanation, and improvement path.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Conversation */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.index}
                className={`flex gap-4 ${step.actor === "Loan Officer" ? "flex-row-reverse" : ""}`}
              >
                <div className="shrink-0 mt-0.5">
                  <div
                    className={`w-7 h-7 rounded-full bg-white flex items-center justify-center text-[10px] font-mono font-medium border ${
                      step.actor === "Loan Officer"
                        ? "border-white/10 text-white/30 bg-white/[0.03]"
                        : "border-white/20 text-white/60 bg-white"
                    }`}
                  >
                    {step.actor === "Loan Officer" ? "LO" : 
                      <img src="/images/providers/agent.svg" alt="AI" className="w-5 h-5" />
                    }
                  </div>
                </div>
                <div
                  className={`flex-1 rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    step.actor === "Loan Officer"
                      ? "bg-white/[0.04] text-white/60 text-right"
                      : "bg-white/[0.07] text-white/80 border border-white/[0.08]"
                  }`}
                >
                  {"pipeline" in step && step.pipeline && (
                    <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/40">
                      <div className="flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        <span>{step.pipeline.label}</span>
                        <span className="text-white/20">•</span>
                        <span>{step.pipeline.tools} tools</span>
                        <span className="text-white/20">•</span>
                        <span>{step.pipeline.steps} steps</span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400/70 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                  )}
                  {step.message}
                  {step.note && (
                    <div className="mt-2 text-[10px] font-mono text-white/25 border-t border-border pt-2">
                      {step.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Score bands */}
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
              Credit score bands (300–850)
            </p>
            <div className="space-y-2">
              {scoreBands.map((band) => (
                <div
                  key={band.range}
                  className="flex items-center gap-3 rounded-lg border border-border bg-white/[0.02] px-4 py-3 hover:border-white/10 transition-colors"
                >
                  <span className="font-mono text-xs text-white/30 w-16 shrink-0">
                    {band.range}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${band.color}`}
                  >
                    {band.band}
                  </span>
                  <span className="text-xs text-white/40 ml-auto text-right">
                    {band.decision}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-white/25 leading-relaxed">
              Banks and MFIs can shift these thresholds to match their own risk appetite.
            </p>
          </div>
        </div>
      </div>
          </div>
    </section>
  );
}

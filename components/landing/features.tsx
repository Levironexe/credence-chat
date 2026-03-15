const features = [
  {
    eyebrow: "Input",
    name: "Plain language, not forms",
    description:
      "Loan officers describe the applicant in natural language. The agent extracts every field it needs — no rigid input forms, no manual data entry.",
  },
  {
    eyebrow: "Inclusion",
    name: "Works without a credit history",
    description:
      "Alternative data — POS revenue, mobile money, utility payments, order consistency — fills the gap for the 70%+ of micro-SMEs with no formal credit file.",
  },
  {
    eyebrow: "Rejection",
    name: "Every 'no' comes with a path forward",
    description:
      "Rejected applicants get a concrete counterfactual plan: what to change, by how much, and in what timeframe to reach the next score band.",
  },
  {
    eyebrow: "Speed",
    name: "Seconds, not days",
    description:
      "Score, explain, validate for fairness, and generate improvement paths — end to end in under 10 seconds. P95 latency target: 3s.",
  },
  {
    eyebrow: "Transparency",
    name: "No black boxes",
    description:
      "Every decision ships with SHAP feature attributions and a waterfall plot. Loan officers see exactly which factors drove the score — and by how much.",
  },
  {
    eyebrow: "Autonomy",
    name: "Agent picks the tools, not you",
    description:
      "The ReAct-pattern agent reasons about what the query needs, chains the right ML tools in the right order, and synthesises results — without manual configuration.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-x border-b border-border px-8 py-16">
          {/* Section header */}
          <div className="mb-16">
            <p className="text-xs text-white/50 uppercase tracking-widest mb-3">
              Why it matters
            </p>
            <h2 className="font-lora text-3xl sm:text-4xl font-semibold text-white max-w-lg leading-tight">
              Built for the borrowers other systems miss.
            </h2>
            <p className="mt-4 text-white/45 text-sm max-w-md leading-relaxed">
              30–40% of MSME rejections come from data gaps, not actual risk.
              Credence closes that gap with an agent that sees the full picture.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-border">
            {features.map((feature, i) => (
              <div
                key={feature.name}
                className={`group relative bg-black p-6 hover:bg-white/[0.03] transition-colors duration-300 ${
                  i === 5 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div className="flex items-start justify-end mb-4">
                  <span className="text-[10px] text-white/25 border border-white/10 rounded-full px-2 py-0.5">
                    {feature.eyebrow}
                  </span>
                </div>

                <h3 className="text-sm font-medium text-white mb-2">
                  {feature.name}
                </h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  {feature.description}
                </p>

                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

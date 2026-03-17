const tools = [
  {
    icon: "◈",
    name: "Credit Scoring Engine",
    description:
      "Predicts default probability and maps it to a familiar 300–850 score scale. Industry-leading accuracy ensures reliable, consistent decisions.",
    detail: "Score 300–850",
  },
  {
    icon: "⬡",
    name: "Score Factor Analysis",
    description:
      "Breaks down every score into specific factor contributions so loan officers can explain exactly why a decision was made. No black boxes.",
    detail: "Per-decision",
  },
  {
    icon: "⟳",
    name: "Improvement Path Generator",
    description:
      "Creates realistic, actionable paths to approval. Suggests concrete changes — like reducing loan amount or increasing tenure — bounded by real-world constraints.",
    detail: "Actionable paths",
  },
  {
    icon: "⊜",
    name: "Fairness Validator",
    description:
      "Checks that decisions are consistent regardless of gender, age, or other protected attributes. Ensures demographic parity gap stays below 5%.",
    detail: "Bias detection",
  },
  {
    icon: "⌖",
    name: "Data Completeness Checker",
    description:
      "Identifies missing fields and ranks them by how much they'd affect the score. Only asks for the inputs that matter most — saving time for loan officers.",
    detail: "Smart prioritization",
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

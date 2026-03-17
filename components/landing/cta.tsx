import Link from "next/link";

export function LandingCTA() {
  return (
    <section className="bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-x border-b border-border px-8 py-16">
        <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] px-8 py-16 text-center overflow-hidden">
          {/* Glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(255,255,255,0.04) 0%, transparent 70%)",
            }}
          />

          <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
            Built for Vietnamese commercial banks, MFIs, and fintech lenders
          </p>

          <h2 className="font-lora text-3xl sm:text-4xl font-semibold text-white leading-tight max-w-2xl mx-auto">
            Stop rejecting borrowers for the wrong reasons.
          </h2>

          <p className="mt-5 text-white/45 text-sm max-w-xl mx-auto leading-relaxed">
            70–80% of Vietnamese SMEs still lack formal credit access. With
            Credence, every rejection comes with a concrete counterfactual plan
            — not a generic letter.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/new"
              className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Try the Demo
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-2.5 bg-black rounded-full border border-white/10 text-white/ text-sm hover:border-white/20 hover:bg-black/70 transition-colors"
            >
              View Loan Officer Dashboard
            </Link>
          </div>

          {/* Metrics row */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
            {[
              { metric: "AUC > 0.85", label: "Model accuracy target" },
              { metric: "P95 < 3s", label: "End-to-end latency" },
              { metric: "50K+", label: "Assessments per month" },
              { metric: "62–77%", label: "Gross margin at scale" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-lg font-semibold text-white">
                  {item.metric}
                </div>
                <div className="text-xs text-white/30 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
          </div>
    </section>
  );
}
"use client";

import Link from "next/link";
import Prism from "./ui/prism";

export function LandingHero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden pt-20">
      {/* Fade edges to black */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, black 75%)",
        }}
      />

      {/* Content — max-w-6xl matches navbar */}
      <div className="relative w-full max-w-6xl mx-auto px-6">
        {/* Bordered frame with + corners */}
        <div className="relative border-y border-x border-border">
          <div className="reletive aspect-square px-8 py-20 flex flex-col items-center text-center">
            <div className=" w-full absolute bottom-0">
              <div className="grid grid-cols-12 grid-rows-2">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square border border-border/50"
                  ></div>
                ))}
              </div>
            </div>
            {/* Prism WebGL background */}
            <div className="absolute bottom-0 inset-0 pointer-events-none z-0">
              <Prism
                animationType="rotate"
                timeScale={0.2}
                height={3.5}
                baseWidth={5.5}
                scale={2}
                hueShift={0}
                colorFrequency={1.4}
                noise={0}
                glow={0.8}
                transparent={true}
              />
            </div>
            <div className="z-1 flex flex-col items-center text-center mx-auto">
              {/* Badge */}
              <div
                className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/50"
                style={{ animation: "fadeUp 0.5s ease both" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Powered by Claude
              </div>

              {/* Headline */}
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white leading-[1.05] tracking-tight max-w-3xl"
                style={{ animation: "fadeUp 0.5s 0.08s ease both" }}
              >
                Credit decisions
                <br />
                that see the full picture.
              </h1>

              {/* Subheading */}
              <p
                className="mt-6 text-base sm:text-lg text-white/75 max-w-lg leading-relaxed"
                style={{ animation: "fadeUp 0.5s 0.16s ease both" }}
              >
                Traditional models reject good borrowers. Credence doesn't — 30%
                more approvals, in under 10 seconds.
              </p>

              {/* CTAs */}
              <div
                className="mt-8 flex flex-col sm:flex-row items-center gap-3"
                style={{ animation: "fadeUp 0.5s 0.22s ease both" }}
              >
                <Link
                  href="/new"
                  className="px-6 py-2.5 rounded-full bg-white font-medium text-black text-sm hover:bg-white/90 transition-colors"
                >
                  Start Assessment
                </Link>
                <Link
                  href="/dashboard"
                  className="px-6 py-2.5 rounded-full border border-white/15 bg-black text-white text-sm font-medium hover:border-white/30 hover:bg-black/70 transition-colors"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats — flush bordered box below */}
        <div
          className="grid grid-cols-3 border border-t-0 border-border divide-x divide-white/10"
          style={{ animation: "fadeUp 0.5s 0.3s ease both" }}
        >
          {[
            { value: "30%", label: "More approvals for creditworthy SMEs" },
            { value: "<10s", label: "End-to-end assessment time" },
            { value: "$5.7T", label: "Global MSME finance gap" },
          ].map((stat) => (
            <div key={stat.label} className="px-6 py-5 text-center bg-black">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="mt-1 text-xs text-white/30 leading-tight">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

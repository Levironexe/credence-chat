"use client";
import Link from "next/link";
import { useState } from "react";
import { RollingText } from "./ui/rolling-text";
import { ArrowRight, Users, ShieldBanIcon } from "lucide-react";
const tools = [
  {
    id: "credit-scoring",
    name: "Credit Scoring Model",
    description:
      "Predicts default probability and maps it to a 300–850 FICO score.",
  },
  {
    id: "shap",
    name: "SHAP Explainer",
    description:
      "Breaks every score into per-feature contributions with a waterfall plot.",
  },
  {
    id: "counterfactual",
    name: "Counterfactual Generator",
    description: "Shows exactly what to change to reach the next score band.",
  },
  {
    id: "fairness",
    name: "Fairness Validator",
    description: "Detects demographic bias before it reaches a borrower.",
  },
  {
    id: "data-completeness",
    name: "Data Completeness Checker",
    description:
      "Asks only for the missing inputs that would move the score most.",
  },
];

export function LandingMLTools() {
  const [hoverKey, setHoverKey] = useState(0);

  return (
    <section id="tools" className="bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-x border-b border-border">
          {/* 3×3 bento grid — gap-px on bg-border gives hairline dividers */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border">
            {/* Box 1 — header */}
            <div className="aspect-[5/4] bg-black p-8 flex flex-col justify-start">
              <div>
                <h2 className="font-lora text-3xl sm:text-4xl font-medium text-white leading-tight mb-3">
                  Five tools.
                  <br />
                  One decision.
                </h2>
                <p className="text-white/45 text-base leading-relaxed">
                  Score, explain, validate, and guide — all in one response.
                </p>
              </div>
            </div>

            {/* Boxes 2–6 — tools */}
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="aspect-[5/4] bg-black p-8 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-[22px] font-medium text-white mb-2">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>
            ))}

            {/* Boxes 7–9 — reserved for user */}
            <div className="col-span-2 aspect-[10/4] bg-black flex items-center justify-center p-8">
              <img
                src="/images/landing-user-bot-tools-diagram.svg"
                alt="User to agent to tools diagram"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="col-span-2 md:col-span-1 aspect-[10/4] md:aspect-[5/4] bg-black p-8 font-medium flex flex-col items-start justify-between">
              <p className="text-[22px]">
                From merchant data to credit decision in seconds
                <span className="text-white/50 ml-1">
                  Dive into the docs to see how it all works.
                </span>
              </p>
              <Link
                href="/"
                className="flex justify-between items-center text-[22px] pl-4 pr-2 py-2 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors duration-200 overflow-visible w-full"
                onMouseEnter={() => setHoverKey((k) => k + 1)}
              >
                <RollingText key={hoverKey} text="Learn more" />
                <div className="p-2 bg-black rounded-full">
                  <ArrowRight className="w-6 h-6 text-white" />
                </div>
              </Link>
            </div>
          </div>
          <div className="py-12 text-[22px] font-medium border-t flex items-center justify-center">
            Approve
            <span className="text-sm mx-2">
              <div className="flex items-center gap-1 rounded-full py-2 px-4 bg-white/5 border border-border ">
                <Users className="w-4 h-4" />
                More Borrowers
              </div>
            </span>
            without the
            <span className="text-sm mx-2">
              <div className="flex items-center gap-1 rounded-full py-2 px-4 bg-white/5 border border-border ">
                <ShieldBanIcon className="w-4 h-4" />
                Extra Risk
              </div>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { CreditScoreCard } from "@/components/dashboard-elements/credit-score-card";
import { ApprovalProbabilityCard } from "@/components/dashboard-elements/approval-probability-card";
import { CreditFactorsList } from "@/components/dashboard-elements/credit-factors-list";
import { ImprovementSuggestions } from "@/components/dashboard-elements/improvement-suggestions";
import type { BusinessApplication, CreditFactor, ImprovementSuggestion } from "@/lib/dashboard/mockData";
import Navbar from "@/components/dashboard-elements/navbar";
import { useRouter } from "next/navigation";
import { getBackendUrl } from "@/lib/api/client";

// ── data mappers ──────────────────────────────────────────────────────────────

function shapToFactors(shap: any): CreditFactor[] {
  return (shap?.explanations ?? []).map((exp: any, i: number) => ({
    id: `shap-${i}`,
    name: exp.label,
    value: typeof exp.value === "number" ? exp.value.toFixed(3) : String(exp.value),
    impact: exp.direction === "Increases risk" ? "negative" : "positive",
    severity:
      Math.abs(exp.shap_value) > 0.2
        ? "high"
        : Math.abs(exp.shap_value) > 0.1
        ? "medium"
        : "low",
    description: `${exp.label} ${exp.direction.toLowerCase()} your credit assessment.`,
    icon: exp.direction === "Increases risk" ? "⚠️" : "✓",
  }));
}

function cfToSuggestions(cfs: any[]): ImprovementSuggestion[] {
  const diffMap: Record<string, ImprovementSuggestion["difficulty"]> = {
    Easiest: "easy",
    Moderate: "medium",
    "Requires time": "hard",
  };
  return (cfs ?? []).map((cf: any) => {
    const primary = cf.changes.find((c: any) => !c.is_derived) ?? cf.changes[0];
    const changesText = cf.changes
      .filter((c: any) => !c.is_derived)
      .map((c: any) => `${c.label}: ${c.current} → ${c.suggested}`)
      .join(", ");
    return {
      id: `cf-${cf.path_number}`,
      action: changesText || cf.effort_level,
      category: cf.effort_level,
      currentValue: primary?.current ?? "-",
      targetValue: primary?.suggested ?? "-",
      projectedScoreIncrease: cf.score_improvement ?? 0,
      difficulty: diffMap[cf.effort_level] ?? "medium",
      timeframe: cf.effort_level,
      description: `After these changes your score would reach ${cf.new_score} (${cf.new_band}), new approval probability: ${((1 - cf.new_probability) * 100).toFixed(0)}%.`,
    };
  });
}

function riskToStatus(risk: string): BusinessApplication["approvalStatus"] {
  if (risk === "low") return "pre-approved";
  if (risk === "medium") return "good-standing";
  return "at-risk";
}

function scoreToRisk(score: number | null): string {
  if (!score) return "high";
  if (score >= 670) return "low";
  if (score >= 580) return "medium";
  return "high";
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const BACKEND = getBackendUrl("");

  // ── applicant list state ────────────────────────────────────────────────────
  const [applicants, setApplicants] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ── selected applicant + assessment state ───────────────────────────────────
  const [selectedApplicant, setSelectedApplicant] = useState<any | null>(null);
  const [assessment, setAssessment] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── fetch all applicants on mount ───────────────────────────────────────────
  useEffect(() => {
    fetch(`${BACKEND}/api/applicants/samples`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.applicants ?? [];
        setApplicants(list);
        if (list.length > 0) setSelectedApplicant(list[0]);
      })
      .finally(() => setListLoading(false));
  }, []);

  // ── fetch assessment when selected applicant changes ────────────────────────
  useEffect(() => {
    if (!selectedApplicant) return;
    setAssessment(null);
    setDetailLoading(true);
    fetch(`${BACKEND}/api/applicants/${selectedApplicant.id}/last-assessment`)
      .then((r) => r.json())
      .then(setAssessment)
      .finally(() => setDetailLoading(false));
  }, [selectedApplicant?.id]);

  // ── filtered list ───────────────────────────────────────────────────────────
  const filteredApplicants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applicants;
    return applicants.filter((a) =>
      String(a.label ?? a.id).toLowerCase().includes(q)
    );
  }, [applicants, search]);

  // ── derive detail panel data from selected applicant ────────────────────────
  const application: BusinessApplication | null = useMemo(() => {
    if (!selectedApplicant) return null;
    const score: number | null = selectedApplicant.score ?? null;
    const defaultProb: number | null = selectedApplicant.default_probability ?? null;
    const riskLevel = scoreToRisk(score);
    const approvalStatus = riskToStatus(riskLevel);
    const approvalProbability =
      defaultProb != null ? Math.round((1 - defaultProb) * 100) : 0;
    const requestedLoan =
      (selectedApplicant.fields ?? []).find((f: any) => f.key === "amt_credit")
        ?.value ?? 0;
    return {
      businessName: `Applicant #${selectedApplicant.label ?? selectedApplicant.id}`,
      industry: "N/A",
      yearsInOperation: 0,
      approvalProbability,
      creditScore: score ?? 0,
      creditScoreMax: 850,
      approvalStatus,
      requestedLoanAmount: requestedLoan,
      recommendedLoanAmount:
        approvalStatus === "pre-approved" ? requestedLoan : Math.round(requestedLoan * 0.7),
    };
  }, [selectedApplicant]);

  const hasAssessment = assessment?.success === true;
  const creditFactors: CreditFactor[] | null = hasAssessment
    ? shapToFactors(assessment.shap_explanations)
    : null;
  const improvementSuggestions: ImprovementSuggestion[] | null = hasAssessment
    ? cfToSuggestions(assessment.counterfactuals ?? [])
    : null;

  // ── score badge helpers ─────────────────────────────────────────────────────
  function scoreBadgeColor(score: number | null) {
    if (!score) return "bg-red-500/15 text-red-400";
    if (score >= 670) return "bg-green-500/15 text-green-400";
    if (score >= 580) return "bg-yellow-500/15 text-yellow-400";
    return "bg-red-500/15 text-red-400";
  }

  function riskPillColor(risk: string) {
    if (risk === "low") return "bg-green-500/15 text-green-400";
    if (risk === "medium") return "bg-yellow-500/15 text-yellow-400";
    return "bg-red-500/15 text-red-400";
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Navbar */}
      <div className="border-b border-border shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Navbar />
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* ── Left: Applicant List ──────────────────────────────────────────── */}
        <aside className="w-[280px] shrink-0 border-r-2 border-border/60 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-3 py-3 shrink-0">
            <input
              type="text"
              placeholder="Search applicant ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[10px] bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="animate-pulse">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="px-3 py-3 border-b border-border space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-5 w-14 bg-muted rounded-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-10 bg-muted rounded-md" />
                      <div className="h-3 w-16 bg-muted/60 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredApplicants.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">No applicants found</p>
              </div>
            ) : (
              filteredApplicants.map((applicant) => {
                const score: number | null = applicant.score ?? null;
                const risk = scoreToRisk(score);
                const isSelected = selectedApplicant?.id === applicant.id;
                return (
                  <button
                    key={applicant.id}
                    onClick={() => setSelectedApplicant(applicant)}
                    className={`w-full text-left px-3 py-3 transition-colors border-b border-border last:border-b-0 ${
                      isSelected
                        ? "bg-muted/50 text-foreground"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {applicant.label ?? applicant.id}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${riskPillColor(risk)}`}
                      >
                        {risk}
                      </span>
                    </div>
                    {score != null && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${scoreBadgeColor(score)}`}
                        >
                          {score}
                        </span>
                        {applicant.score_band && (
                          <span className="text-xs text-muted-foreground">
                            {applicant.score_band}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Right: Detail Panel ───────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {!selectedApplicant && !listLoading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <p className="text-muted-foreground text-sm">
                Select an applicant from the list
              </p>
            </div>
          ) : listLoading || detailLoading ? (
            <div className="px-6 py-6 space-y-6 animate-pulse">
              {/* Header skeleton */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-7 w-48 bg-muted rounded-lg" />
                  <div className="h-4 w-32 bg-muted/60 rounded-md" />
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-3 w-16 bg-muted/60 rounded ml-auto" />
                  <div className="h-5 w-20 bg-muted rounded ml-auto" />
                </div>
              </div>

              {/* Score cards skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Credit score card */}
                <div className="bg-card rounded-[14px] border border-border p-8 flex flex-col items-center gap-4">
                  <div className="w-40 h-40 rounded-full bg-muted" />
                  <div className="h-6 w-32 bg-muted rounded-lg" />
                  <div className="h-4 w-48 bg-muted/60 rounded-md" />
                  <div className="w-full pt-4 border-t border-border space-y-2">
                    <div className="h-3 w-24 bg-muted/60 rounded mx-auto" />
                    <div className="h-5 w-16 bg-muted rounded mx-auto" />
                  </div>
                </div>
                {/* Approval card */}
                <div className="bg-card rounded-[14px] border border-border p-8 space-y-5">
                  <div className="h-8 w-32 bg-muted rounded-lg" />
                  <div className="space-y-2">
                    <div className="h-3 w-40 bg-muted/60 rounded" />
                    <div className="h-10 w-28 bg-muted rounded-lg" />
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full" />
                  <div className="h-4 w-56 bg-muted/60 rounded" />
                  <div className="pt-4 border-t border-border space-y-4">
                    <div className="h-3 w-36 bg-muted/60 rounded" />
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <div className="h-4 w-20 bg-muted/60 rounded" />
                          <div className="h-4 w-12 bg-muted rounded" />
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <div className="h-4 w-24 bg-muted/60 rounded" />
                          <div className="h-4 w-12 bg-muted rounded" />
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Applicant details grid skeleton */}
              <div className="space-y-3">
                <div className="h-6 w-36 bg-muted rounded-lg" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border rounded-[14px] overflow-hidden border border-border">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className="bg-card px-4 py-3 space-y-1.5">
                      <div className="h-3 w-20 bg-muted/60 rounded" />
                      <div className="h-4 w-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-6 space-y-6">
              {/* Detail header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground font-lora">
                    {application?.businessName}
                  </h1>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    Loan Readiness Assessment
                  </p>
                </div>
                {application && application.requestedLoanAmount > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Requested</p>
                    <p className="text-lg font-semibold text-foreground">
                      ${(application.requestedLoanAmount / 1000).toFixed(0)}k
                    </p>
                  </div>
                )}
              </div>

              {/* No score yet */}
              {!application?.creditScore ? (
                <div className="bg-card border border-border rounded-[14px] p-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    Score not computed yet for this applicant.
                  </p>
                </div>
              ) : (
                <>
                  {/* Score cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <CreditScoreCard
                      score={application.creditScore}
                      maxScore={application.creditScoreMax}
                    />
                    <ApprovalProbabilityCard
                      probability={application.approvalProbability}
                      status={application.approvalStatus}
                      recommendedAmount={application.recommendedLoanAmount}
                      requestedAmount={application.requestedLoanAmount}
                    />
                  </div>

                  {/* Applicant fields */}
                  {selectedApplicant?.fields?.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-lg font-bold text-foreground">Applicant Details</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border rounded-[14px] overflow-hidden border border-border">
                        {selectedApplicant.fields.map((f: any) => (
                          <div key={f.key} className="bg-card px-4 py-3">
                            <p className="text-xs text-muted-foreground mb-0.5">{f.label}</p>
                            <p className="text-sm font-semibold text-foreground">
                              {f.display ?? (f.value != null ? String(f.value) : "—")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No-assessment CTA */}
                  {!hasAssessment && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-[14px] px-5 py-4 flex items-center justify-between gap-4">
                      <p className="text-sm text-foreground">
                        No chat assessment found. Run an assessment in the chat to unlock
                        credit factor analysis and improvement suggestions.
                      </p>
                      <button
                        onClick={() => router.push("/")}
                        className="shrink-0 px-4 py-2 bg-accent text-white rounded-[14px] hover:bg-accent/90 transition-colors text-sm font-medium"
                      >
                        Start Assessment
                      </button>
                    </div>
                  )}

                  {/* Credit factors */}
                  {hasAssessment && creditFactors && creditFactors.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          What's Affecting the Score
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Key factors identified from SHAP analysis.
                        </p>
                      </div>
                      <CreditFactorsList factors={creditFactors} />
                    </div>
                  )}

                  {/* Improvement suggestions */}
                  {hasAssessment && improvementSuggestions && improvementSuggestions.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          Path to Approval
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Counterfactual changes that would most improve this applicant's
                          approval odds.
                        </p>
                      </div>
                      <ImprovementSuggestions
                        suggestions={improvementSuggestions}
                        baseScore={application.creditScore}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

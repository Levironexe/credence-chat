"use client";

import { CreditScoreCard } from "@/components/dashboard-elements/credit-score-card";
import { ApprovalProbabilityCard } from "@/components/dashboard-elements/approval-probability-card";
import { CreditFactorsList } from "@/components/dashboard-elements/credit-factors-list";
import { ImprovementSuggestions } from "@/components/dashboard-elements/improvement-suggestions";
import { ArrowLeft } from "lucide-react";
import { GridLayout } from "@/components/dashboard-elements/grid-layout";
import {
  businessApplication,
  creditFactors,
  improvementSuggestions,
} from "@/lib/dashboard/mockData";
import Navbar from "@/components/dashboard-elements/navbar";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-7xl  mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Navbar />
        </div>
      </div>

      {/* Header */}
      <header className="">
        <div className="border-x border-border max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground font-lora">
                {businessApplication.businessName}
              </h1>
              <p className="text-muted-foreground mt-1">
                Loan Readiness Dashboard
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                Your Loan Application
              </p>
              <p className="text-lg font-semibold text-accent mt-1">
                ${(businessApplication.requestedLoanAmount / 1000).toFixed(0)}k
                requested
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <GridLayout
        header={
          <div className="">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Your Credit Metrics
            </h2>
            <p className="text-muted-foreground">
              Here's a snapshot of your creditworthiness and loan approval
              status.
            </p>
          </div>
        }
        content={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ">
            <CreditScoreCard
              score={businessApplication.creditScore}
              maxScore={businessApplication.creditScoreMax}
            />
            <ApprovalProbabilityCard
              probability={businessApplication.approvalProbability}
              status={businessApplication.approvalStatus}
              recommendedAmount={businessApplication.recommendedLoanAmount}
              requestedAmount={businessApplication.requestedLoanAmount}
            />
          </div>
        }
      />

      {/* Section 2: Credit Factors */}
      <GridLayout
        header={
          <div className="">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              What's Affecting Your Score
            </h2>
            <p className="text-muted-foreground">
              Understanding these factors will help you improve your
              creditworthiness and increase your chances of loan approval.
            </p>
          </div>
        }
        content={<CreditFactorsList factors={creditFactors} />}
      />

      {/* Section 3: Improvement Suggestions */}

      <GridLayout
      header={
        <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Your Path to Approval</h2>
        <p className="text-muted-foreground">
          Based on counterfactual analysis, these are the changes that would most improve your chances of loan approval.
        </p>
      </div>
      }
        content={
          <ImprovementSuggestions
            suggestions={improvementSuggestions}
            baseScore={businessApplication.creditScore}
          />
        }
      />

      {/* Section 4.5: Blank space to relax */}
      <div className="h-[500px] border-x border-border max-w-7xl mx-auto border-t px-4 sm:px-6 lg:px-8 py-6 "></div>

      {/* Section 4: Additional Information */}
      <section className="bg border border-border max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border-r border-border  p-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
              Your Business
            </h3>
            <p className="text-xl font-bold text-foreground">
              {businessApplication.industry}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {businessApplication.yearsInOperation} years in operation
            </p>
          </div>

          <div className="border-r border-border  p-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
              About This Dashboard
            </h3>
            <p className="text-sm text-foreground leading-relaxed">
              This dashboard uses advanced machine learning to analyze your
              creditworthiness and identify the most impactful improvements.
            </p>
          </div>

          <div className="p-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
              Need Help?
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Our loan officers are here to help guide you through the process.
            </p>
            <button onClick={() => router.push("mailto:levironforwork@gmail.com")} className="px-4 py-2 bg-accent text-white rounded-[14px] hover:bg-accent/90 transition-colors text-sm font-medium">
              Contact Support
            </button>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 border-x border-border max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs text-muted-foreground text-center">
          This credit analysis is generated using our proprietary ML model.
          Actual approval decisions are made by our lending committee after a
          comprehensive review. This dashboard is for informational purposes and
          does not constitute a loan offer or guarantee.
        </p>
      </section>
 {/* Footer */}
      <footer className="border-t border-border bg-card/50 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto ">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-3xl font-lora font-semibold text-foreground mb-4">Credence</h4>
              <p className="text-sm text-muted-foreground">
                Helping SMEs understand their creditworthiness.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4 text-sm">
                Product
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4 text-sm">
                Company
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Careers
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4 text-sm">
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-accent transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              © 2026 Credence. All rights reserved.
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <a href="#" className="hover:text-accent transition-colors">
                X
              </a>
              <a href="#" className="hover:text-accent transition-colors">
                LinkedIn
              </a>
              <a href="https://github.com/Levironexe?tab=repositories" className="hover:text-accent transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
     
    </div>
  );
}

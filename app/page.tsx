import { LandingNav } from "@/components/landing/nav";
import { LandingHero } from "@/components/landing/hero";
import { LandingFeatures } from "@/components/landing/features";
import { LandingHowItWorks } from "@/components/landing/how-it-works";
import { LandingMLTools } from "@/components/landing/ml-tools";
import { LandingComparison } from "@/components/landing/comparison";
import { LandingCTA } from "@/components/landing/cta";
import { LandingFooter } from "@/components/landing/footer";

export default function Page() {
  return (
    <div className="bg-black min-h-screen">
      <LandingNav />
      {/* Single border-x container — all sections live inside the two vertical rails */}
      <div className="max-w-6xl mx-auto">
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingMLTools />
        <LandingComparison />
        <LandingCTA />
        <LandingFooter />
      </div>
    </div>
  );
}

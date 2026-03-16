'use client';

import type { CreditFactor } from '@/lib/dashboard/mockData';

interface CreditFactorsListProps {
  factors: CreditFactor[];
}

export function CreditFactorsList({ factors }: CreditFactorsListProps) {
  const positiveFactors = factors.filter((f) => f.impact === 'positive');
  const negativeFactors = factors.filter((f) => f.impact === 'negative');

  const FactorCard = ({ factor }: { factor: CreditFactor }) => {
    const severityColors = {
      high: 'text-red-400',
      medium: 'text-yellow-400',
      low: 'text-green-400',
    };

    const severityBg = {
      high: 'bg-red-500/20',
      medium: 'bg-yellow-500/20',
      low: 'bg-green-500/20',
    };

    return (
      <div className="p-4">
        <div className="flex items-start gap-3">
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-semibold text-foreground text-sm">{factor.name}</h4>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${severityBg[factor.severity]} ${severityColors[factor.severity]}`}
              >
                {factor.severity.charAt(0).toUpperCase() + factor.severity.slice(1)}
              </span>
            </div>
            
            <p className="text-sm font-mono text-accent mb-2">{factor.value}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{factor.description}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Positive Factors */}
      <div className=''> 
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            Positive Factors
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            These factors are working in your favor and supporting your creditworthiness.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-[14px] border-border divide-x border ">
          {positiveFactors.map((factor) => (
            <FactorCard key={factor.id} factor={factor} />
          ))}
        </div>
      </div>

      {/* Negative Factors */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 ">
            Areas for Improvement
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            These factors are currently impacting your credit score. See suggestions below to improve them.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-[14px] border-border divide-x divide-y border">
          {negativeFactors.map((factor) => (
            <FactorCard key={factor.id} factor={factor} />
          ))}
        </div>
      </div>
    </div>
  );
}

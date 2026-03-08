'use client';

interface ApprovalProbabilityCardProps {
  probability: number;
  status: 'at-risk' | 'fair-standing' | 'good-standing' | 'pre-approved';
  recommendedAmount: number;
  requestedAmount: number;
}

export function ApprovalProbabilityCard({
  probability,
  status,
  recommendedAmount,
  requestedAmount,
}: ApprovalProbabilityCardProps) {
  // Determine status badge styling
  const statusConfig = {
    'at-risk': {
      label: 'At Risk',
      bgClass: 'bg-red-500/20',
      textClass: 'text-red-400',
      description: 'Your application is currently at risk of rejection.',
    },
    'fair-standing': {
      label: 'Fair Standing',
      bgClass: 'bg-orange-500/20',
      textClass: 'text-orange-400',
      description: 'Your application has a moderate chance of approval.',
    },
    'good-standing': {
      label: 'Good Standing',
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-400',
      description: 'Your application is in good condition.',
    },
    'pre-approved': {
      label: 'Pre-Approved',
      bgClass: 'bg-green-500/20',
      textClass: 'text-green-400',
      description: 'Congratulations! Your application is pre-approved.',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="relative w-full bg-card  rounded-lg p-8">
      <div className="space-y-6">
        {/* Status Badge */}
        <div>
          <div className={`inline-block ${config.bgClass} ${config.textClass} rounded-lg px-4 py-2 text-sm font-semibold`}>
            {config.label}
          </div>
        </div>

        {/* Approval Probability */}
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">LOAN APPROVAL PROBABILITY</p>
          <div className="flex items-baseline gap-2">
            <div className="text-5xl font-bold text-accent">{probability}%</div>
            <span className="text-muted-foreground">chance of approval</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-accent h-full rounded-full transition-all duration-500"
              style={{ width: `${probability}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Status description */}
        <p className="text-sm text-muted-foreground pt-2">{config.description}</p>

        {/* Loan Amount Comparison */}
        <div className="pt-4 border-t border-border space-y-4">
          <p className="text-xs text-muted-foreground font-semibold">LOAN AMOUNT ANALYSIS</p>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Requested</span>
                <span className="font-semibold text-foreground">${(requestedAmount / 1000).toFixed(0)}k</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-red-500 h-full rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recommended</span>
                <span className="font-semibold text-accent">${(recommendedAmount / 1000).toFixed(0)}k</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-accent h-full rounded-full" style={{ width: `${(recommendedAmount / requestedAmount) * 100}%` }} />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Requesting a lower amount can significantly improve your approval chances.
          </p>
        </div>
      </div>
    </div>
  );
}

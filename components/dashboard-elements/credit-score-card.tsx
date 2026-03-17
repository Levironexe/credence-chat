'use client';

interface CreditScoreCardProps {
  score: number;
  maxScore: number;
}

export function CreditScoreCard({ score, maxScore }: CreditScoreCardProps) {
  const percentage = (score / maxScore) * 100;
  
  // Determine score interpretation and color
  let interpretation = 'Poor';
  let colorClass = 'text-red-500';
  
  if (score >= 740) {
    interpretation = 'Excellent';
    colorClass = 'text-green-500';
  } else if (score >= 670) {
    interpretation = 'Good';
    colorClass = 'text-yellow-500';
  } else if (score >= 580) {
    interpretation = 'Fair';
    colorClass = 'text-orange-500';
  }

  return (
    <div className="relative w-full bg-card rounded-[14px] border border-border p-8">
      <div className="flex flex-col items-center justify-center">
        {/* Circular Progress */}
        <div className="relative w-40 h-40 mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${(percentage / 100) * 440} 440`}
              className={`${colorClass} transition-all duration-500`}
              strokeLinecap="round"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-foreground">{score}</div>
            <div className="text-sm text-muted-foreground">out of {maxScore}</div>
          </div>
        </div>

        {/* Score Interpretation */}
        <div className={`text-2xl font-semibold ${colorClass} mb-2`}>
          {interpretation} Credit
        </div>
        
        {/* Description */}
        <p className="text-center text-muted-foreground text-sm max-w-xs">
          Based on your business financial profile and credit history
        </p>

        {/* Average comparison */}
        <div className="mt-6 pt-6 w-full text-center">
          <p className="text-xs text-muted-foreground mb-2">AVERAGE SME SCORE</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg font-semibold text-foreground">710</span>
            <span className={`text-xs font-medium ${score > 710 ? 'text-green-500' : 'text-red-500'}`}>
              {score > 710 ? '↑' : '↓'} {Math.abs(score - 710)} points
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

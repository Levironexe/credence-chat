// Mock data for Credence Loan Readiness Dashboard
// Scenario: Small restaurant supply business (SME)

export interface BusinessApplication {
  businessName: string;
  industry: string;
  yearsInOperation: number;
  approvalProbability: number;
  creditScore: number;
  creditScoreMax: number;
  approvalStatus: 'at-risk' | 'fair-standing' | 'good-standing' | 'pre-approved';
  recommendedLoanAmount: number;
  requestedLoanAmount: number;
}

export interface CreditFactor {
  id: string;
  name: string;
  value: string | number;
  impact: 'positive' | 'negative';
  severity: 'high' | 'medium' | 'low';
  description: string;
  icon: string;
}

export interface ImprovementSuggestion {
  id: string;
  action: string;
  category: string;
  currentValue: string | number;
  targetValue: string | number;
  projectedScoreIncrease: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  description: string;
}

// Main business application data
export const businessApplication: BusinessApplication = {
  businessName: "Marco's Fresh Restaurant Supplies",
  industry: "Restaurant Supply & Distribution",
  yearsInOperation: 3,
  approvalProbability: 42,
  creditScore: 680,
  creditScoreMax: 850,
  approvalStatus: 'at-risk',
  recommendedLoanAmount: 35000,
  requestedLoanAmount: 50000,
};

// Credit factors affecting the score
export const creditFactors: CreditFactor[] = [
  // Positive factors
  {
    id: 'positive-1',
    name: 'Payment History',
    value: '95% on-time',
    impact: 'positive',
    severity: 'high',
    description:
      'Strong track record of timely payments. This is the most important factor in credit scoring.',
    icon: '✓',
  },
  {
    id: 'positive-2',
    name: 'Business Duration',
    value: '3 years',
    impact: 'positive',
    severity: 'medium',
    description:
      'Your business has been operating for 3 years, demonstrating stability and commitment.',
    icon: '📅',
  },
  {
    id: 'positive-3',
    name: 'Credit Utilization',
    value: '32%',
    impact: 'positive',
    severity: 'medium',
    description:
      'You are using 32% of available credit, which shows responsible credit management.',
    icon: '💳',
  },
  // Negative factors
  {
    id: 'negative-1',
    name: 'Revenue Volatility',
    value: '±28% variance',
    impact: 'negative',
    severity: 'high',
    description:
      'Monthly revenue fluctuates significantly, making it harder to predict repayment capacity.',
    icon: '📊',
  },
  {
    id: 'negative-2',
    name: 'Debt-to-Income Ratio',
    value: '45%',
    impact: 'negative',
    severity: 'high',
    description:
      'Current debt obligations consume 45% of monthly income, limiting borrowing capacity.',
    icon: '⚠️',
  },
  {
    id: 'negative-3',
    name: 'Recent Missed Payment',
    value: '1 month late',
    impact: 'negative',
    severity: 'high',
    description:
      'A payment was 30 days late in the past 6 months. This impacts creditworthiness significantly.',
    icon: '',
  },
  {
    id: 'negative-4',
    name: 'Limited Business Credit History',
    value: '3 accounts',
    impact: 'negative',
    severity: 'medium',
    description:
      'Limited number of business credit accounts. More credit history improves scores.',
    icon: '📋',
  },
];

// Improvement suggestions based on counterfactual analysis
export const improvementSuggestions: ImprovementSuggestion[] = [
  {
    id: 'improve-1',
    action: 'Increase Monthly Revenue',
    category: 'Revenue Growth',
    currentValue: '$42,000/month',
    targetValue: '$48,500/month',
    projectedScoreIncrease: 42,
    difficulty: 'hard',
    timeframe: '3-4 months',
    description:
      'Growing revenue to $48,500/month would reduce your debt-to-income ratio from 45% to 38%, significantly improving your approval chances.',
  },
  {
    id: 'improve-2',
    action: 'Reduce Requested Loan Amount',
    category: 'Loan Adjustment',
    currentValue: '$50,000',
    targetValue: '$35,000',
    projectedScoreIncrease: 55,
    difficulty: 'easy',
    timeframe: 'Immediate',
    description:
      'Lowering your loan request to $35,000 would improve your approval probability to 78% immediately. This is the fastest path to approval.',
  },
  {
    id: 'improve-3',
    action: 'Establish Consistent Payment Pattern',
    category: 'Payment History',
    currentValue: '95% on-time',
    targetValue: '100% for 6 months',
    projectedScoreIncrease: 28,
    difficulty: 'medium',
    timeframe: '6 months',
    description:
      'Maintaining 100% on-time payments for the next 6 months would remove the recent missed payment impact and increase your score.',
  },
  {
    id: 'improve-4',
    action: 'Stabilize Revenue Pattern',
    category: 'Business Stability',
    currentValue: '±28% variance',
    targetValue: '±10% variance',
    projectedScoreIncrease: 38,
    difficulty: 'medium',
    timeframe: '2-3 months',
    description:
      'Reducing revenue volatility to ±10% would demonstrate more predictable cash flow, making you a lower-risk borrower.',
  },
  {
    id: 'improve-5',
    action: 'Pay Down Existing Debt',
    category: 'Debt Reduction',
    currentValue: 'Current debt: $18,900/month',
    targetValue: 'Reduce to: $15,000/month',
    projectedScoreIncrease: 35,
    difficulty: 'hard',
    timeframe: '2-3 months',
    description:
      'Paying down $3,900 in monthly debt obligations would improve your debt-to-income ratio to 36%, making you more attractive to lenders.',
  },
  {
    id: 'improve-6',
    action: 'Combine Strategies for Maximum Impact',
    category: 'Combination Plan',
    currentValue: 'Current score: 680',
    targetValue: 'Target score: 750+',
    projectedScoreIncrease: 85,
    difficulty: 'medium',
    timeframe: '3-4 months',
    description:
      'Combining revenue growth, consistent payments, and slight debt reduction would move you to 750+ score and 92% approval probability.',
  },
];

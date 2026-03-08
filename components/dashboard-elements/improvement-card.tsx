'use client';

import type { ImprovementSuggestion } from '@/lib/mockData';

interface ImprovementCardProps {
  suggestion: ImprovementSuggestion;
  baseScore: number;
}

export function ImprovementCard({ suggestion, baseScore }: ImprovementCardProps) {
  const newScore = Math.min(baseScore + suggestion.projectedScoreIncrease, 850);
  const scoreIncrease = newScore - baseScore;
  const scoreIncreasePercent = (scoreIncrease / (850 - baseScore)) * 100;

  const difficultyConfig = {
    easy: {
      label: 'Easy',
      color: 'bg-green-500/20 text-green-400 border border-green-500/30',
      icon: '⚡',
    },
    medium: {
      label: 'Medium',
      color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      icon: '⏱',
    },
    hard: {
      label: 'Hard',
      color: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      icon: '💪',
    },
  };

  const config = difficultyConfig[suggestion.difficulty];

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-accent transition-colors">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-foreground mb-1">{suggestion.action}</h4>
            <p className="text-xs text-accent font-medium uppercase tracking-wide">
              {suggestion.category}
            </p>
          </div>
          <div className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${config.color}`}>
            {config.icon} {config.label}
          </div>
        </div>

        {/* Value comparison */}
        <div className="grid grid-cols-2 gap-4 py-3 border-y border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <p className="text-sm font-semibold text-foreground">{suggestion.currentValue}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Target</p>
            <p className="text-sm font-semibold text-accent">{suggestion.targetValue}</p>
          </div>
        </div>

        {/* Score Impact Visualization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">PROJECTED SCORE INCREASE</span>
            <span className="text-sm font-bold text-accent">
              +{suggestion.projectedScoreIncrease} points
            </span>
          </div>

          {/* Score bars */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground min-w-12">Current:</span>
              <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-yellow-500/60 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(baseScore / 850) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground min-w-12 text-right">
                {baseScore}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground min-w-12">With change:</span>
              <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-accent h-full rounded-full transition-all duration-500"
                  style={{ width: `${(newScore / 850) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-accent min-w-12 text-right">
                {newScore}
              </span>
            </div>
          </div>

          {/* Impact indicator */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-1 bg-accent/20 text-accent px-2 py-1 rounded text-xs font-medium">
              <span>↑</span>
              <span>
                {scoreIncreasePercent > 0 ? '+' : ''}
                {scoreIncreasePercent.toFixed(1)}%{' '}
                {scoreIncreasePercent > 25 ? 'significant' : 'moderate'} improvement
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">{suggestion.description}</p>

        {/* Timeframe */}
        <div className="pt-2 border-t border-border flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">⏰ Timeline:</span>
          <span className="font-semibold text-foreground">{suggestion.timeframe}</span>
        </div>
      </div>
    </div>
  );
}

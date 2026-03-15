'use client';

import { useState } from 'react';
import type { ImprovementSuggestion } from '@/lib/dashboard/mockData';
import { ImprovementCard } from './improvement-card';

interface ImprovementSuggestionsProps {
  suggestions: ImprovementSuggestion[];
  baseScore: number;
}

type FilterType = 'all' | 'easy' | 'medium' | 'hard' | 'quick';

export function ImprovementSuggestions({ suggestions, baseScore }: ImprovementSuggestionsProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const quickWinSuggestions = suggestions.filter((s) => s.difficulty === 'easy' || s.timeframe.includes('Immediate'));

  const filteredSuggestions = {
    all: suggestions,
    easy: suggestions.filter((s) => s.difficulty === 'easy'),
    medium: suggestions.filter((s) => s.difficulty === 'medium'),
    hard: suggestions.filter((s) => s.difficulty === 'hard'),
    quick: quickWinSuggestions,
  };

  const displaySuggestions = filteredSuggestions[activeFilter];

  const maxPotentialScore = Math.min(
    baseScore + suggestions.reduce((sum, s) => sum + s.projectedScoreIncrease, 0),
    850
  );
  const maxIncrease = suggestions.reduce((sum, s) => sum + s.projectedScoreIncrease, 0);

  return (
    <div className="space-y-6">
      

      {/* Potential Score Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-accent/20 border border-accent/30  rounded-[14px] p-4">
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Current Score</p>
          <p className="text-3xl font-bold text-foreground">{baseScore}</p>
        </div>

        <div className="bg-muted border border-border  rounded-[14px] p-4">
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Possible Increase</p>
          <p className="text-3xl font-bold text-foreground">+{maxIncrease}</p>
        </div>

        <div className="bg-accent/20 border border-accent/30 rounded-[14px] p-4">
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Potential Max</p>
          <p className="text-3xl font-bold text-foreground">{maxPotentialScore}</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 ">
        {[
          { value: 'all' as const, label: 'All Suggestions', count: suggestions.length },
          { value: 'quick' as const, label: 'Quick Wins', count: quickWinSuggestions.length },
          { value: 'easy' as const, label: 'Easy', count: suggestions.filter((s) => s.difficulty === 'easy').length },
          { value: 'medium' as const, label: 'Medium', count: suggestions.filter((s) => s.difficulty === 'medium').length },
          { value: 'hard' as const, label: 'Hard', count: suggestions.filter((s) => s.difficulty === 'hard').length },
        ].map(({ value, label, count }) => (
          <button
            key={value}
            onClick={() => setActiveFilter(value)}
            className={`px-4 py-2 rounded-[14px] text-sm font-medium transition-colors ${
              activeFilter === value
                ? 'bg-accent text-white'
                : 'bg-card border border-border text-foreground hover:border-accent'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Suggestions Grid */}
      {displaySuggestions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displaySuggestions.map((suggestion) => (
            <ImprovementCard
              key={suggestion.id}
              suggestion={suggestion}
              baseScore={baseScore}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border  p-8 text-center">
          <p className="text-muted-foreground">No suggestions match the selected filter.</p>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-accent/10 border border-accent/30 rounded-[14px] p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Next Steps</h3>
        <ol className="space-y-3 text-sm text-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/30 text-accent flex items-center justify-center font-semibold">
              1
            </span>
            <span>Review the suggestions above and identify which changes align with your business goals.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/30 text-accent flex items-center justify-center font-semibold">
              2
            </span>
            <span>Start with "Quick Wins" for the fastest impact, or tackle "Hard" changes for maximum score improvement.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/30 text-accent flex items-center justify-center font-semibold">
              3
            </span>
            <span>Work with your account manager to resubmit your application once you've made changes.</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

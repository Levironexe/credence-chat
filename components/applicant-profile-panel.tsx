"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import {
  ChevronRight,
  ChevronLeft,
  UserCircle,
  Edit3,
  Save,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getBackendUrl } from "@/lib/api/client";

// SWR fetcher for applicant samples
const samplesFetcher = (url: string) =>
  fetch(url, { credentials: "include" })
    .then((res) => res.json())
    .then((data) => (data.success && data.applicants ? data.applicants : []));

// Types matching backend response
interface DisplayField {
  key: string;
  label: string;
  value: number | string | null;
  display: string;
  format: string;
}

export interface ApplicantProfile {
  id: string;
  label: string;
  fields: DisplayField[];
  score?: number | null;
  score_band?: string | null;
  default_probability?: number | null;
  actual_default?: number | null;
  band_category?: string;
}

interface ApplicantProfilePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedProfile: ApplicantProfile | null;
  onProfileChange: (profile: ApplicantProfile) => void;
  refreshKey?: number;
}

const SCORE_COLORS: Record<string, string> = {
  Exceptional: "text-emerald-500",
  "Very Good": "text-green-500",
  Good: "text-lime-500",
  Fair: "text-amber-500",
  Poor: "text-red-500",
};

const BAND_ICONS: Record<string, typeof ShieldCheck> = {
  Exceptional: ShieldCheck,
  "Very Good": ShieldCheck,
  Good: ShieldCheck,
  Fair: ShieldQuestion,
  Poor: ShieldAlert,
};

function ScoreBadge({ score, band }: { score?: number | null; band?: string | null }) {
  if (!score || !band) return null;
  const color = SCORE_COLORS[band] || "text-muted-foreground";
  const Icon = BAND_ICONS[band] || ShieldQuestion;

  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-bold">{score}</span>
      <span className="text-xs opacity-75">/ 850</span>
      <span className="text-xs font-medium ml-1">({band})</span>
    </div>
  );
}

function PureApplicantProfilePanel({
  isOpen,
  onToggle,
  selectedProfile,
  onProfileChange,
  refreshKey,
}: ApplicantProfilePanelProps) {
  // SWR: globally cached applicant samples — persists across navigations/remounts
  const { data: samples = [], isLoading: isLoadingSamples, mutate: mutateSamples } = useSWR<ApplicantProfile[]>(
    getBackendUrl("/api/applicants/samples"),
    samplesFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 60s dedup — won't refetch within 60s
    }
  );

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [editingFields, setEditingFields] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Refresh samples when refreshKey changes (e.g. after chat analysis saves a score)
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      mutateSamples().then((updated) => {
        if (updated && selectedProfile && selectedProfile.id !== "custom") {
          const match = updated.find((a) => a.id === selectedProfile.id);
          if (match && match.score && match.score !== selectedProfile.score) {
            onProfileChange({ ...selectedProfile, score: match.score, score_band: match.score_band, default_probability: match.default_probability });
          }
        }
      });
    }
  }, [refreshKey]);

  // Load full profile when selected
  const handleProfileSelect = useCallback(
    (value: string) => {
      if (value === "custom") {
        onProfileChange({
          id: "custom",
          label: "Custom Applicant",
          fields: [
            { key: "age", label: "Age", value: 35, display: "35", format: "years" },
            { key: "income", label: "Annual Income", value: 60000, display: "$60,000", format: "currency" },
            { key: "loan_amount", label: "Loan Amount", value: 150000, display: "$150,000", format: "currency" },
            { key: "employment_years", label: "Employment", value: 5, display: "5", format: "years" },
            { key: "goods_price", label: "Goods Price", value: 120000, display: "$120,000", format: "currency" },
            { key: "monthly_payment", label: "Monthly Payment", value: 5000, display: "$5,000", format: "currency" },
          ],
        });
        setIsEditing(false);
        return;
      }

      // Check if already in samples list (has full data)
      const cached = samples.find((s) => s.id === value);
      if (cached && cached.fields.length > 0) {
        onProfileChange(cached);
        setIsEditing(false);
        return;
      }

      // Fetch from backend
      setIsLoadingProfile(true);
      fetch(getBackendUrl(`/api/applicants/${value}`), { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            const profile: ApplicantProfile = {
              id: data.id,
              label: data.label,
              fields: data.fields,
              score: data.score,
              score_band: data.score_band,
              default_probability: data.default_probability,
            };
            onProfileChange(profile);
          }
        })
        .catch((err) => console.error("Failed to load profile:", err))
        .finally(() => setIsLoadingProfile(false));
      setIsEditing(false);
    },
    [onProfileChange, samples]
  );

  // Score the selected applicant
  const handleScore = useCallback(async () => {
    if (!selectedProfile || selectedProfile.id === "custom") return;

    setIsScoring(true);
    try {
      const res = await fetch(
        getBackendUrl(`/api/applicants/${selectedProfile.id}/score`),
        { method: "POST", credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        // Update selected profile with score
        const updated: ApplicantProfile = {
          ...selectedProfile,
          score: data.credit_score,
          score_band: data.score_band,
          default_probability: data.default_probability,
        };
        onProfileChange(updated);

        // Also update in SWR cache
        mutateSamples(
          (prev) => prev?.map((s) =>
            s.id === selectedProfile.id
              ? { ...s, score: data.credit_score, score_band: data.score_band, default_probability: data.default_probability }
              : s
          ),
          { revalidate: false }
        );
      }
    } catch (err) {
      console.error("Failed to score applicant:", err);
    } finally {
      setIsScoring(false);
    }
  }, [selectedProfile, onProfileChange]);

  const handleFieldEdit = useCallback((key: string, value: string) => {
    setEditingFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!selectedProfile) return;

    // Build updated fields locally
    const updatedFields = selectedProfile.fields.map((f) => {
      if (f.key in editingFields) {
        const newVal = editingFields[f.key];
        const numVal = Number(newVal);
        return {
          ...f,
          value: isNaN(numVal) ? newVal : numVal,
          display: newVal,
        };
      }
      return f;
    });

    // For DB applicants, persist to backend
    if (selectedProfile.id !== "custom") {
      setIsSaving(true);
      try {
        const fieldsPayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(editingFields)) {
          fieldsPayload[key] = val === "" ? null : val;
        }

        const res = await fetch(
          getBackendUrl(`/api/applicants/${selectedProfile.id}`),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ fields: fieldsPayload }),
          }
        );
        const data = await res.json();
        if (data.success && data.fields) {
          // Use server-returned fields (includes recomputed ratios)
          const profile: ApplicantProfile = {
            ...selectedProfile,
            fields: data.fields,
            score: null,
            score_band: null,
            default_probability: null,
          };
          onProfileChange(profile);
          mutateSamples(
            (prev) => prev?.map((s) =>
              s.id === selectedProfile.id
                ? { ...s, fields: data.fields, score: null, score_band: null, default_probability: null }
                : s
            ),
            { revalidate: false }
          );
        } else {
          // Fallback to local update
          onProfileChange({ ...selectedProfile, fields: updatedFields });
        }
      } catch (err) {
        console.error("Failed to save profile:", err);
        onProfileChange({ ...selectedProfile, fields: updatedFields });
      } finally {
        setIsSaving(false);
      }
    } else {
      onProfileChange({ ...selectedProfile, fields: updatedFields });
    }

    setIsEditing(false);
    setEditingFields({});
  }, [selectedProfile, editingFields, onProfileChange]);

  const startEditing = useCallback(() => {
    if (!selectedProfile) return;
    const fields: Record<string, string> = {};
    for (const f of selectedProfile.fields) {
      fields[f.key] = f.value != null ? String(f.value) : "";
    }
    setEditingFields(fields);
    setIsEditing(true);
  }, [selectedProfile]);

  const isCustom = selectedProfile?.id === "custom";
  const hasScore = selectedProfile?.score != null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-80 bg-primary text-primary-foreground p-2 rounded-l-lg shadow-lg hover:bg-primary/90 transition-colors"
        aria-label={isOpen ? "Close applicant panel" : "Open applicant panel"}
      >
        {isOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <div className="flex items-center gap-1">
            <UserCircle className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4" />
          </div>
        )}
      </button>

      {/* Backdrop — click outside to close */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-60"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-dvh w-80 bg-background border-l border-border shadow-xl z-70 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <UserCircle className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Applicant Profile</h2>
              </div>

              {/* Profile selector */}
              <Select
                value={selectedProfile?.id || ""}
                onValueChange={handleProfileSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingSamples ? "Loading..." : "Select an applicant..."} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingSamples ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading applicants...</span>
                    </div>
                  ) : (
                    <>
                      {samples.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>#{s.id}</span>
                            {s.score && (
                              <span className={`text-xs font-medium ${SCORE_COLORS[s.score_band || ""] || ""}`}>
                                {s.score}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      <Separator className="my-1" />
                      <SelectItem value="custom">
                        <span className="text-muted-foreground">+ Custom Applicant</span>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Score summary — show if score exists */}
            {selectedProfile && hasScore && (
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <ScoreBadge score={selectedProfile.score} band={selectedProfile.score_band} />
                <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                  {selectedProfile.default_probability != null && (
                    <span>Default prob: {(selectedProfile.default_probability * 100).toFixed(1)}%</span>
                  )}
                </div>
              </div>
            )}

            {/* Score button — show if no score yet and not custom */}
            {selectedProfile && !hasScore && !isCustom && (
              <div className="px-4 py-3 border-b border-border">
                <Button
                  onClick={handleScore}
                  disabled={isScoring}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  {isScoring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Scoring...
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4 mr-2" />
                      Score Profile
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                {isLoadingProfile && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Loading profile...</span>
                  </div>
                )}

                {!selectedProfile && !isLoadingProfile && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select an applicant to view their profile and run assessments.
                  </p>
                )}

                {selectedProfile && !isLoadingProfile && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {isCustom ? "Custom Fields" : "Applicant Details"}
                      </p>
                      {isEditing ? (
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleSave} disabled={isSaving}>
                          {isSaving ? (
                            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving</>
                          ) : (
                            <><Save className="h-3 w-3 mr-1" /> Save</>
                          )}
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={startEditing}>
                          <Edit3 className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      )}
                    </div>

                    {selectedProfile.fields.map((field) => (
                      <div
                        key={field.key}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {field.label}
                        </span>
                        {isEditing ? (
                          <Input
                            className="h-6 w-28 text-xs text-right"
                            value={editingFields[field.key] ?? String(field.value ?? "")}
                            onChange={(e) => handleFieldEdit(field.key, e.target.value)}
                          />
                        ) : (
                          <span className="text-xs font-medium tabular-nums">
                            {field.display}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            {selectedProfile && (
              <div className="p-3 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  {selectedProfile.id !== "custom"
                    ? `Applicant #${selectedProfile.id} — send a message to assess`
                    : "Custom profile — send a message to assess"}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export const ApplicantProfilePanel = memo(PureApplicantProfilePanel);
export type { ApplicantProfile as ApplicantProfileType };

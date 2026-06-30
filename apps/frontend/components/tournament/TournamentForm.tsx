"use client";

import { useState } from "react";
import type { CreateTournamentDto } from "@/types/tournament.types";
import {
  SportType,
  TournamentFormat,
  ParticipantType,
  ScoringMode,
  SchedulingMode,
} from "@/types/tournament.types";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import FormSection from "@/components/ui/FormSection";
import Label from "@/components/ui/Label";
import { Save, X } from "lucide-react";

interface TournamentFormProps {
  initialData?: Partial<CreateTournamentDto>;
  onSubmit: (data: Partial<CreateTournamentDto>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const sportOptions = Object.values(SportType).map((v) => ({ value: v, label: v }));
const formatOptions = Object.values(TournamentFormat).map((v) => ({ value: v, label: v }));
const participantOptions = Object.values(ParticipantType).map((v) => ({ value: v, label: v }));
const scoringOptions = Object.values(ScoringMode).map((v) => ({ value: v, label: v }));

export function TournamentForm({ initialData, onSubmit, onCancel, isLoading }: TournamentFormProps) {
  const [formData, setFormData] = useState<CreateTournamentDto>({
    name: initialData?.name || "",
    sportType: initialData?.sportType || SportType.OTHER,
    formatType: initialData?.formatType || TournamentFormat.SINGLE_ELIM,
    participantType: initialData?.participantType || ParticipantType.TEAM,
    scoringMode: initialData?.scoringMode || ScoringMode.SIMPLE,
    scoringConfig: initialData?.scoringConfig || { maxSets: 3, targetPoints: 21 },
    schedulingMode: initialData?.schedulingMode || SchedulingMode.MANUAL,
    courtCount: initialData?.courtCount || 1,
    startDate: initialData?.startDate || undefined,
    endDate: initialData?.endDate || undefined,
    eventId: initialData?.eventId || undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = <K extends keyof CreateTournamentDto>(key: K, value: CreateTournamentDto[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) nextErrors.name = "Name is required";
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      nextErrors.endDate = "End date must be after start date";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setErrors({ submit: err.message || "Failed to save tournament" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Basic Information">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="mb-2 block">Tournament Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Enter tournament name"
            />
            {errors.name && <p className="mt-1 text-sm text-brand-danger">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sportType" className="mb-2 block">Sport Type</Label>
              <Select
                id="sportType"
                value={formData.sportType}
                onChange={(e) => updateField("sportType", e.target.value as SportType)}
              >
                {sportOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="participantType" className="mb-2 block">Participant Type</Label>
              <Select
                id="participantType"
                value={formData.participantType}
                onChange={(e) => updateField("participantType", e.target.value as ParticipantType)}
              >
                {participantOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Format Settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="formatType" className="mb-2 block">Format</Label>
            <Select
              id="formatType"
              value={formData.formatType}
              onChange={(e) => updateField("formatType", e.target.value as TournamentFormat)}
            >
              {formatOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="scoringMode" className="mb-2 block">Scoring Mode</Label>
            <Select
              id="scoringMode"
              value={formData.scoringMode}
              onChange={(e) => updateField("scoringMode", e.target.value as ScoringMode)}
            >
              {scoringOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          {formData.scoringMode === ScoringMode.SETS && (
            <>
              <div>
                <Label htmlFor="maxSets" className="mb-2 block">Max Sets</Label>
                <Input
                  id="maxSets"
                  type="number"
                  value={formData.scoringConfig?.maxSets ?? 3}
                  onChange={(e) =>
                    updateField("scoringConfig", {
                      ...formData.scoringConfig,
                      maxSets: parseInt(e.target.value, 10),
                    })
                  }
                  min={1}
                />
              </div>
              <div>
                <Label htmlFor="targetPoints" className="mb-2 block">Target Points</Label>
                <Input
                  id="targetPoints"
                  type="number"
                  value={formData.scoringConfig?.targetPoints ?? 21}
                  onChange={(e) =>
                    updateField("scoringConfig", {
                      ...formData.scoringConfig,
                      targetPoints: parseInt(e.target.value, 10),
                    })
                  }
                  min={1}
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="schedulingMode" className="mb-2 block">Scheduling</Label>
            <Select
              id="schedulingMode"
              value={formData.schedulingMode}
              onChange={(e) => updateField("schedulingMode", e.target.value as SchedulingMode)}
            >
              <option value={SchedulingMode.MANUAL}>Manual</option>
              <option value={SchedulingMode.AUTO}>Automatic</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="courtCount" className="mb-2 block">Courts / Fields</Label>
            <Input
              id="courtCount"
              type="number"
              value={formData.courtCount}
              onChange={(e) => updateField("courtCount", parseInt(e.target.value, 10))}
              min={1}
              max={20}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Schedule">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" className="mb-2 block">Start Date</Label>
            <Input
              id="startDate"
              type="datetime-local"
              value={formData.startDate?.slice(0, 16) || ""}
              onChange={(e) => updateField("startDate", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate" className="mb-2 block">End Date</Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={formData.endDate?.slice(0, 16) || ""}
              onChange={(e) => updateField("endDate", e.target.value)}
            />
            {errors.endDate && <p className="mt-1 text-sm text-brand-danger">{errors.endDate}</p>}
          </div>
        </div>
      </FormSection>

      {errors.submit && (
        <div className="p-3 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm">
          {errors.submit}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            <X size={16} /> Cancel
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          <Save size={16} /> Save Tournament
        </Button>
      </div>
    </form>
  );
}

export default TournamentForm;

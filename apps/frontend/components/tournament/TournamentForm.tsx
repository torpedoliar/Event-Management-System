"use client";

import React, { useState } from 'react';
import type { CreateTournamentDto, UpdateTournamentDto } from '@/types/tournament.types';
import {
  TournamentFormat,
  TournamentStatus,
  ScoringMode,
  SportType,
  ParticipantType,
  SchedulingMode,
} from '@/types/tournament.types';
import { Trophy, Calendar, Users, Clock, Save, X } from 'lucide-react';

interface TournamentFormProps {
  initialData?: Partial<CreateTournamentDto>;
  onSubmit: (data: Partial<CreateTournamentDto>) => Promise<void>;
  onCancel?: () => void;
  isDarkMode?: boolean;
  isLoading?: boolean;
}

const sportOptions: { value: SportType; label: string }[] = [
  { value: SportType.FUTSAL, label: 'Futsal' },
  { value: SportType.BASKET, label: 'Basketball' },
  { value: SportType.VOLLEY, label: 'Volleyball' },
  { value: SportType.BADMINTON, label: 'Badminton' },
  { value: SportType.CHESS, label: 'Chess' },
  { value: SportType.ESPORTS, label: 'Esports' },
  { value: SportType.OTHER, label: 'Other' },
];

const formatOptions: { value: TournamentFormat; label: string }[] = [
  { value: TournamentFormat.SINGLE_ELIM, label: 'Single Elimination' },
  { value: TournamentFormat.DOUBLE_ELIM, label: 'Double Elimination' },
  { value: TournamentFormat.ROUND_ROBIN, label: 'Round Robin' },
  { value: TournamentFormat.SWISS, label: 'Swiss System' },
  { value: TournamentFormat.GROUP_KNOCKOUT, label: 'Group + Knockout' },
];

const participantOptions: { value: ParticipantType; label: string }[] = [
  { value: ParticipantType.TEAM, label: 'Team' },
  { value: ParticipantType.INDIVIDUAL, label: 'Individual' },
];

const scoringOptions: { value: ScoringMode; label: string }[] = [
  { value: ScoringMode.SIMPLE, label: 'Simple (Win/Loss)' },
  { value: ScoringMode.SETS, label: 'Sets (Best of X)' },
  { value: ScoringMode.POINTS, label: 'Points (Score Based)' },
];

const inputClasses = (isDarkMode: boolean) => `
  w-full px-3 py-2 rounded-lg border
  ${isDarkMode
    ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500'
    : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'}
  focus:outline-none focus:ring-2 focus:border-transparent
`;

const labelClasses = (isDarkMode: boolean) => `
  block text-sm font-medium mb-1
  ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}
`;

export function TournamentForm({
  initialData,
  onSubmit,
  onCancel,
  isDarkMode = false,
  isLoading = false,
}: TournamentFormProps) {
  const [formData, setFormData] = useState<CreateTournamentDto>({
    name: initialData?.name || '',
    sportType: initialData?.sportType || SportType.OTHER,
    formatType: initialData?.formatType || TournamentFormat.SINGLE_ELIM,
    participantType: initialData?.participantType || ParticipantType.TEAM,
    scoringMode: initialData?.scoringMode || ScoringMode.SIMPLE,
    scoringConfig: initialData?.scoringConfig || undefined,
    schedulingMode: initialData?.schedulingMode || SchedulingMode.MANUAL,
    courtCount: initialData?.courtCount || 1,
    startDate: initialData?.startDate || undefined,
    endDate: initialData?.endDate || undefined,
    eventId: initialData?.eventId || undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to save tournament' });
    }
  };

  const sectionClasses = `
    p-4 rounded-lg mb-4
    ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}
  `;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic Info */}
      <div className={sectionClasses}>
        <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <Trophy className="w-4 h-4 inline mr-2" />
          Basic Information
        </h3>

        <div className="space-y-3">
          <div>
            <label htmlFor="name" className={labelClasses(isDarkMode)}>
              Tournament Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={inputClasses(isDarkMode)}
              placeholder="Enter tournament name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sportType" className={labelClasses(isDarkMode)}>
                Sport Type
              </label>
              <select
                id="sportType"
                name="sportType"
                value={formData.sportType}
                onChange={handleChange}
                className={inputClasses(isDarkMode)}
              >
                {sportOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="participantType" className={labelClasses(isDarkMode)}>
                Participant Type
              </label>
              <select
                id="participantType"
                name="participantType"
                value={formData.participantType}
                onChange={handleChange}
                className={inputClasses(isDarkMode)}
              >
                {participantOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Format Settings */}
      <div className={sectionClasses}>
        <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <Calendar className="w-4 h-4 inline mr-2" />
          Format Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="formatType" className={labelClasses(isDarkMode)}>
              Tournament Format
            </label>
            <select
              id="formatType"
              name="formatType"
              value={formData.formatType}
              onChange={handleChange}
              className={inputClasses(isDarkMode)}
            >
              {formatOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="scoringMode" className={labelClasses(isDarkMode)}>
              Scoring Mode
            </label>
            <select
              id="scoringMode"
              name="scoringMode"
              value={formData.scoringMode}
              onChange={handleChange}
              className={inputClasses(isDarkMode)}
            >
              {scoringOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="schedulingMode" className={labelClasses(isDarkMode)}>
              Scheduling Mode
            </label>
            <select
              id="schedulingMode"
              name="schedulingMode"
              value={formData.schedulingMode}
              onChange={handleChange}
              className={inputClasses(isDarkMode)}
            >
              <option value={SchedulingMode.MANUAL}>Manual</option>
              <option value={SchedulingMode.AUTO}>Automatic</option>
            </select>
          </div>

          <div>
            <label htmlFor="courtCount" className={labelClasses(isDarkMode)}>
              Number of Courts/Fields
            </label>
            <input
              type="number"
              id="courtCount"
              name="courtCount"
              value={formData.courtCount}
              onChange={handleChange}
              min={1}
              max={20}
              className={inputClasses(isDarkMode)}
            />
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className={sectionClasses}>
        <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <Clock className="w-4 h-4 inline mr-2" />
          Schedule
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="startDate" className={labelClasses(isDarkMode)}>
              Start Date
            </label>
            <input
              type="datetime-local"
              id="startDate"
              name="startDate"
              value={formData.startDate?.slice(0, 16) || ''}
              onChange={handleChange}
              className={inputClasses(isDarkMode)}
            />
          </div>

          <div>
            <label htmlFor="endDate" className={labelClasses(isDarkMode)}>
              End Date
            </label>
            <input
              type="datetime-local"
              id="endDate"
              name="endDate"
              value={formData.endDate?.slice(0, 16) || ''}
              onChange={handleChange}
              className={inputClasses(isDarkMode)}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {errors.submit && (
        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
          {errors.submit}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium
              ${isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
            `}
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white
            bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save Tournament'}
        </button>
      </div>
    </form>
  );
}

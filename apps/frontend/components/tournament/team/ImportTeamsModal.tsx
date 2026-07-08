"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { importApi } from "@/lib/tournament-api";
import type { ImportTeamsResult } from "@/types/tournament.types";
import { Upload, FileJson, CheckCircle, AlertCircle } from "lucide-react";

interface ImportTeamsModalProps {
  tournamentId: string;
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function ImportTeamsModal({
  tournamentId,
  open,
  onClose,
  onImported,
}: ImportTeamsModalProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportTeamsResult | null>(null);

  const handleImport = async () => {
    setError(null);
    setResult(null);

    let teams: any[];
    try {
      teams = JSON.parse(jsonInput);
      if (!Array.isArray(teams)) {
        setError("Input must be a JSON array of teams");
        return;
      }
    } catch {
      setError("Invalid JSON format");
      return;
    }

    setImporting(true);
    try {
      const res = await importApi.importTeams(tournamentId, { teams });
      setResult(res);
      if (res.imported > 0) {
        onImported();
      }
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;

      if (file.name.endsWith('.json')) {
        setJsonInput(text);
      } else if (file.name.endsWith('.csv')) {
        // Parse CSV: name,seed (header row optional)
        const lines = text.split('\n').filter((l) => l.trim());
        const teams = [];
        for (const line of lines) {
          const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
          if (parts[0] === 'name' || !parts[0]) continue; // skip header or empty
          teams.push({
            name: parts[0],
            seed: parts[1] ? parseInt(parts[1]) : undefined,
          });
        }
        setJsonInput(JSON.stringify(teams, null, 2));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  const handleClose = () => {
    setJsonInput("");
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Teams">
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-brand-danger bg-brand-danger/10 p-3 rounded-lg border border-brand-danger/20">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {result && (
          <div className="text-sm bg-brand-success/10 p-3 rounded-lg border border-brand-success/20">
            <div className="flex items-center gap-2 text-brand-success font-medium mb-1">
              <CheckCircle size={16} />
              Import Complete
            </div>
            <p className="text-brand-textMuted">
              Imported: {result.imported} | Skipped: {result.skipped} | Errors: {result.errors.length}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-xs text-brand-danger list-disc list-inside">
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errors.length > 5 && <li>...and {result.errors.length - 5} more</li>}
              </ul>
            )}
          </div>
        )}

        {/* File upload */}
        <div>
          <label className="block text-xs text-brand-textMuted mb-2">
            Upload CSV or JSON file
          </label>
          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-brand-border rounded-xl cursor-pointer hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-colors">
            <Upload size={18} className="text-brand-textMuted" />
            <span className="text-sm text-brand-textMuted">Choose file (.csv or .json)</span>
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <p className="text-xs text-brand-textMuted mt-1">
            CSV format: name,seed (one team per line)
          </p>
        </div>

        {/* JSON input */}
        <div>
          <label className="flex items-center gap-1 text-xs text-brand-textMuted mb-2">
            <FileJson size={14} />
            Or paste JSON directly
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`[
  { "name": "Team A", "seed": 1 },
  { "name": "Team B", "seed": 2 }
]`}
            rows={8}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleImport} loading={importing} disabled={!jsonInput.trim()}>
              <Upload size={16} className="mr-1" /> Import
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

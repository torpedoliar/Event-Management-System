"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { matchApi } from "@/lib/tournament-api";
import { LiveMatchDisplay } from "@/components/tournament/match/LiveMatchDisplay";
import type { Match } from "@/types/tournament.types";

export default function LiveMatchPage() {
  const params = useParams();
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (params.matchId) {
      matchApi.getById(params.matchId as string)
        .then(setMatch)
        .catch(console.error);
    }
  }, [params.matchId]);

  if (!match) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black">
      <LiveMatchDisplay match={match} />
    </div>
  );
}

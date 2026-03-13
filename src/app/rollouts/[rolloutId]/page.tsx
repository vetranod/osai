"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import RolloutDashboardClient from "./RolloutDashboardClient";

export default function RolloutDashboardPage() {
  const params = useParams<{ rolloutId: string }>();
  const rolloutId = useMemo(
    () => (typeof params?.rolloutId === "string" ? params.rolloutId : ""),
    [params]
  );

  if (!rolloutId) {
    return null;
  }

  return (
    <RolloutDashboardClient
      rolloutId={rolloutId}
      initialMilestones={[]}
      initialArtifacts={[]}
      initialRolloutMeta={null}
      initialReclassifications={[]}
    />
  );
}

import { useEffect, useState } from "react";

export interface ResultReleaseCycle {
  project_id: string;
  status: "pending" | "completed" | "failed";
  processingDate: string;
}

export function useResultReleaseCycle(project_ids: string[]) {
  const [cycles, setCycles] = useState<Record<string, ResultReleaseCycle>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!project_ids.length) return;
    setLoading(true);
    setError(null);
    fetch("/api/result-release-cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fetch", project_ids }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.cycles) {
          const map: Record<string, ResultReleaseCycle> = {};
          for (const cycle of data.cycles) {
            const key = cycle.project_id && typeof cycle.project_id === 'object' && cycle.project_id._id
              ? String(cycle.project_id._id)
              : String(cycle.project_id);
            map[key] = cycle;
          }
          setCycles(map);
        } else {
          setError(data.message || "Failed to fetch cycles");
        }
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, [project_ids]);

  return { cycles, loading, error };
}

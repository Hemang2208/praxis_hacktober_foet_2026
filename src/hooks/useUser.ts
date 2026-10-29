import useSWR from "swr";

export function useUser() {
  const { data, error } = useSWR("/api/auth/current-user", async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  });
  return {
    mongoUser: data?.user || null,
    isLoaded: Boolean(data),
    error,
  };
}

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function GitHubOAuthHandler() {
  // const isSignedIn = true; // Always true if user is authenticated via JWT
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only run if GitHub OAuth params exist (user is assumed authenticated via JWT)
    if (searchParams.get("github_oauth") === "true") {
      const githubToken = searchParams.get("github_token");
      const githubUsername = searchParams.get("github_username");
      const githubUrl = searchParams.get("github_url");
      const redirectUrl = searchParams.get("redirect_url");

      if (githubToken && githubUsername && githubUrl) {
        // Complete the GitHub OAuth process
        fetch("/api/github/oauth/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            githubToken,
            githubUsername,
            githubUrl,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              toast.success("GitHub account linked successfully!");
              // Redirect to the original destination or dashboard
              const finalRedirect = redirectUrl || "/dashboard/github";
              router.push(finalRedirect);
            } else {
              toast.error("Failed to link GitHub account");
              router.push("/user");
            }
          })
          .catch((error) => {
            console.error("GitHub OAuth completion error:", error);
            toast.error("Failed to link GitHub account");
            router.push("/user");
          });
      }
    }
  }, [searchParams, router]);

  return null; // This component doesn't render anything
}

export default GitHubOAuthHandler;

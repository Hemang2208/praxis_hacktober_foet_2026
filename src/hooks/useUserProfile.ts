import { useEffect, useState } from "react";

interface UserProfile {
  profile_picture?: string;
  education?: {
    degree?: string;
    fieldOfStudy?: string;
    institution?: string;
    graduationYear?: string;
    gpa?: string;
  };
  _id: string;
  full_name: string;
  email: string;
  username: string;
  image_url: string;
  headline: string;
  bio: string;
  skills: string[];
  socialLinks: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  phoneNumber: string;
  address: string;
  resume: string;
  role: "student" | "admin" | "org" | "company" | "college";
  subrole?: "owner" | "admin" | "manager" | "trainee";
  members?: Array<{
    email?: string;
    status?: string;
    subrole?: "owner" | "admin" | "manager" | "trainee";
    user_id?: string;
  }>;
  created_at: string;
  updated_at: string;
  experience?: {
    level?: "fresher" | "1-2 years" | "2-5 years" | "5+ years";
    previousInternships?: Array<{
      id: string;
      companyName: string;
      position: string;
      duration: string;
      description?: string;
      skills?: string[];
      addedDate: string;
    }>;
    projects?: Array<{
      id: string;
      title: string;
      description: string;
      technologies: string[];
      link?: string;
      githubLink?: string;
      status: "completed" | "in-progress" | "planned";
      addedDate: string;
    }>;
  };
}

let userProfileCache: UserProfile | null = null;
let userProfileFetchPromise: Promise<void> | null = null;

// Export function to clear the profile cache (useful when profile changes on backend)
export function clearUserProfileCache() {
  console.log("[useUserProfile] Clearing profile cache");
  userProfileCache = null;
  userProfileFetchPromise = null;
}

export default function useUserProfile(options?: { forceRefresh?: boolean }) {
  const [mongoUser, setMongoUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async (options?: { forceRefresh?: boolean }) => {
    // If forceRefresh is true, skip the cache check and fetch fresh data
    if (!options?.forceRefresh && userProfileCache) {
      setMongoUser(userProfileCache);
      setLoading(false);
      return;
    }

    if (!options?.forceRefresh && userProfileFetchPromise) {
      await userProfileFetchPromise;
      if (userProfileCache) {
        setMongoUser(userProfileCache);
      }
      return;
    }

    userProfileFetchPromise = (async () => {
      try {
        setLoading(true);
        // Add timestamp query param to bypass browser cache when forcing refresh
        const cacheBuster = options?.forceRefresh ? `?t=${Date.now()}` : "";
        const response = await fetch(`/api/auth/profile${cacheBuster}`);
        if (response.ok) {
          const data = await response.json();
          userProfileCache = data.user;
          setMongoUser(data.user);
          setError(null);
        } else {
          setError("Failed to fetch user profile");
        }
      } catch {
        setError("An error occurred while fetching profile");
      } finally {
        setLoading(false);
        userProfileFetchPromise = null;
      }
    })();

    await userProfileFetchPromise;
  };

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      // If forceRefresh is requested, always bypass cache
      if (options?.forceRefresh && mounted) {
        await fetchUserProfile({ forceRefresh: true });
        return;
      }

      if (userProfileCache) {
        setMongoUser(userProfileCache);
        setLoading(false);
        return;
      }

      if (!mounted) return;
      await fetchUserProfile();
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [options?.forceRefresh]);

  const updateProfile = async (updated_ata: Partial<UserProfile>) => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updated_ata),
      });
      if (response.ok) {
        const data = await response.json();
        userProfileCache = data.user;
        setMongoUser(data.user);
        return { success: true, user: data.user };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error };
      }
    } catch {
      return {
        success: false,
        error: "An error occurred while updating profile",
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    mongoUser,
    loading,
    error,
    updateProfile,
    refetch: fetchUserProfile,
  };
}

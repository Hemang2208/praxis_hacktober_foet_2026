import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { IStudent } from "@/models/User";
import { fetchWithAuth } from "@/lib/api-client";
import { clearUserProfileCache } from "@/hooks/useUserProfile";
import { markDetailItemFetched, invalidatePageCache, invalidateDetailItemCache } from "@/redux/slice/cache.slice";


// Helper types for better type safety
type DocumentKeys =
  | "collection"
  | "db"
  | "$assertPopulated"
  | "$ignore"
  | "$isNew"
  | "$set"
  | "$session"
  | "delete"
  | "deleteOne"
  | "directModifiedPaths"
  | "getChanges"
  | "increment"
  | "invalidate"
  | "isDirectSelected"
  | "isInit"
  | "modifiedPaths"
  | "overwrite"
  | "postValidate"
  | "preValidate"
  | "replaceOne"
  | "unmarkModified"
  | "updateOne"
  | "save"
  | "isNew"
  | "schema"
  | "$isValid"
  | "toObject"
  | "toJSON"
  | "markModified"
  | "validate"
  | "validateSync"
  | "errors"
  | "$locals"
  | "$op"
  | "$where"
  | "get"
  | "set"
  | "isDirectModified"
  | "isModified"
  | "isSelected"
  | "populate"
  | "populated"
  | "execPopulate"
  | "depopulate"
  | "equals"
  | "id"
  | "__v";

export type UserProfileData = Omit<IStudent, DocumentKeys> & {
  // Override experience to use string dates instead of Date objects for Redux serialization
  experience?: {
    level?: "fresher" | "1-2 years" | "2-5 years" | "5+ years";
    previousInternships?: {
      id: string;
      companyName: string;
      position: string;
      duration: string;
      description?: string;
      skills?: string[];
      addedDate: string; // ISO string instead of Date
    }[];
    projects?: {
      id: string;
      title: string;
      description: string;
      technologies: string[];
      link?: string;
      githubLink?: string;
      status: "completed" | "in-progress" | "planned";
      addedDate: string; // ISO string instead of Date
    }[];
  };
};

// Types for the slice
export interface UserState {
  // User Profile
  userProfile: UserProfileData | null;
  isAuthenticated: boolean;

  // Loading States
  loading: {
    fetchProfile: boolean;
    updateProfile: boolean;
    uploadImage: boolean;
    uploadResume: boolean;
  };

  // Error States
  error: {
    fetchProfile: string | null;
    updateProfile: string | null;
    uploadImage: string | null;
    uploadResume: string | null;
  };

  // UI States
  ui: {
    profileCompleted: number; // percentage of profile completion
    lastUpdated: string | null;
    isDirty: boolean; // tracks if there are unsaved changes
  };
}

// Initial state
const initialState: UserState = {
  userProfile: null,
  isAuthenticated: false,
  loading: {
    fetchProfile: false,
    updateProfile: false,
    uploadImage: false,
    uploadResume: false,
  },
  error: {
    fetchProfile: null,
    updateProfile: null,
    uploadImage: null,
    uploadResume: null,
  },
  ui: {
    profileCompleted: 0,
    lastUpdated: null,
    isDirty: false,
  },
};

// Async Thunks
export const fetchUserProfile = createAsyncThunk<
  { user: UserProfileData },
  void,
  { rejectValue: string }
>("user/fetchProfile", async (_, { rejectWithValue }) => {
  try {
    const response = await fetchWithAuth("/api/auth/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.message || "Failed to fetch user profile",
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch user profile",
    );
  }
});

export const updateUserProfile = createAsyncThunk<
  { user: UserProfileData },
  Partial<UserProfileData>,
  { rejectValue: string }
>("user/updateProfile", async (updatedData, { rejectWithValue, dispatch }) => {
  try {
    // Process experience data if it exists to ensure proper format
    const processedData = { ...updatedData };

    if (processedData.experience) {
      // Handle projects array
      if (processedData.experience.projects) {
        // Ensure each project has the correct format and handle type conversion
        // Use type assertion to avoid TypeScript errors
        processedData.experience.projects =
          processedData.experience.projects.map((project) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            technologies: Array.isArray(project.technologies)
              ? project.technologies
              : [],
            link: project.link || "",
            githubLink: project.githubLink || "",
            status: project.status || "completed",
            // Convert string dates to Date objects for MongoDB
            addedDate: new Date(
              typeof project.addedDate === "string"
                ? project.addedDate
                : project.addedDate instanceof Date
                  ? project.addedDate.toISOString()
                  : new Date().toISOString(),
            ),
          })) as unknown as UserProfileData["experience"]["projects"];
      }

      // Handle previousInternships array
      if (processedData.experience.previousInternships) {
        processedData.experience.previousInternships =
          processedData.experience.previousInternships.map((internship) => ({
            id: internship.id,
            companyName: internship.companyName,
            position: internship.position,
            duration: internship.duration,
            description: internship.description || "",
            skills: Array.isArray(internship.skills) ? internship.skills : [],
            // Convert string dates to Date objects for MongoDB
            addedDate: new Date(
              typeof internship.addedDate === "string"
                ? internship.addedDate
                : internship.addedDate instanceof Date
                  ? internship.addedDate.toISOString()
                  : new Date().toISOString(),
            ),
          })) as unknown as UserProfileData["experience"]["previousInternships"];
      }
    }

    const response = await fetchWithAuth("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(processedData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(errorData.message || "Failed to update profile");
    }

    const data = await response.json();

    dispatch(markDetailItemFetched({ resource: "user", id: "profile" }));
    dispatch(invalidatePageCache({ resource: "user" }));

    try {
      const { mutate } = await import("swr");
      void mutate("/api/auth/profile");
      void mutate("/api/auth/current-user");
    } catch {
      // SWR not available in this context
    }

    return data;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update profile",
    );
  }
});

export const uploadFile = createAsyncThunk<
  { secure_url: string },
  { file: File; type: "image" | "pdf" },
  { rejectValue: string }
>("user/uploadFile", async ({ file, type }, { rejectWithValue, dispatch }) => {
  try {
    // Convert file to base64
    const toBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    const base64 = await toBase64(file);
    const payload =
      type === "image"
        ? { image: { file: base64, fileType: file.type } }
        : { pdf: { file: base64, fileType: file.type } };

    const response = await fetchWithAuth("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.errors?.[type] || `Failed to upload ${type}`,
      );
    }

    const data = await response.json();
    const url = data.results?.[type]?.secure_url;

    if (!url) {
      return rejectWithValue(`No URL returned for ${type} upload`);
    }

    dispatch(invalidatePageCache({ resource: "user" }));
    return { secure_url: url };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : `Failed to upload ${type}`,
    );
  }
});

// Helper function to calculate profile completion percentage
const calculateProfileCompletion = (user: UserProfileData): number => {
  const fields = [
    user.full_name,
    user.email,
    user.headline,
    user.bio,
    user.phoneNumber,
    user.profile_picture,
    user.skills && user.skills.length > 0,
    user.education?.degree,
    user.education?.institution,
    user.experience?.level,
    user.experience?.projects && user.experience.projects.length > 0,
    user.socialLinks?.github || user.socialLinks?.linkedin,
    user.careerGoals?.preferredRole,
  ];

  const completedFields = fields.filter(Boolean).length;
  return Math.round((completedFields / fields.length) * 100);
};

// Helper function to serialize date objects to strings for Redux
const serializeUserData = (
  user: IStudent | UserProfileData,
): UserProfileData => {
  const serialized = { ...user } as UserProfileData;

  // Convert date fields to ISO strings
  if (serialized.experience?.projects) {
    serialized.experience.projects = serialized.experience.projects.map(
      (project) => ({
        ...project,
        addedDate:
          typeof project.addedDate === "string"
            ? project.addedDate
            : project.addedDate instanceof Date
              ? project.addedDate.toISOString()
              : new Date().toISOString(),
      }),
    ) as UserProfileData["experience"]["projects"];
  }

  if (serialized.experience?.previousInternships) {
    serialized.experience.previousInternships =
      serialized.experience.previousInternships.map((internship) => ({
        ...internship,
        addedDate:
          typeof internship.addedDate === "string"
            ? internship.addedDate
            : internship.addedDate instanceof Date
              ? internship.addedDate.toISOString()
              : new Date().toISOString(),
      })) as UserProfileData["experience"]["previousInternships"];
  }

  return serialized;
};

// User Slice
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // Synchronous actions for immediate state updates
    clearUser: (state) => {
      state.userProfile = null;
      state.isAuthenticated = false;
      state.ui.profileCompleted = 0;
      state.ui.lastUpdated = null;
      state.ui.isDirty = false;
    },

    setUser: (state, action: PayloadAction<UserProfileData>) => {
      state.userProfile = serializeUserData(action.payload);
      state.isAuthenticated = true;
      state.ui.profileCompleted = calculateProfileCompletion(state.userProfile);
      state.ui.lastUpdated = new Date().toISOString();
      state.ui.isDirty = false;
    },

    /** Seed profile from SSR only when Redux has no profile yet. */
    seedUserProfile: (state, action: PayloadAction<UserProfileData>) => {
      if (state.userProfile) return;
      state.userProfile = serializeUserData(action.payload);
      state.isAuthenticated = true;
      state.ui.profileCompleted = calculateProfileCompletion(state.userProfile);
      state.ui.lastUpdated = new Date().toISOString();
      state.ui.isDirty = false;
    },

    clearErrors: (state) => {
      state.error = {
        fetchProfile: null,
        updateProfile: null,
        uploadImage: null,
        uploadResume: null,
      };
    },

    clearError: (state, action: PayloadAction<keyof UserState["error"]>) => {
      state.error[action.payload] = null;
    },

    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },

    setDirty: (state, action: PayloadAction<boolean>) => {
      state.ui.isDirty = action.payload;
    },

    // Optimistic updates for better UX
    updateUserField: (
      state,
      action: PayloadAction<{ field: string; value: unknown }>,
    ) => {
      if (state.userProfile) {
        // Type assertion since we know the field exists on the user object
        (state.userProfile as Record<string, unknown>)[action.payload.field] =
          action.payload.value;
        state.ui.profileCompleted = calculateProfileCompletion(
          state.userProfile,
        );
        state.ui.lastUpdated = new Date().toISOString();
        state.ui.isDirty = true;
      }
    },

    addSkill: (state, action: PayloadAction<string>) => {
      if (state.userProfile && state.userProfile.skills) {
        if (!state.userProfile.skills.includes(action.payload)) {
          state.userProfile.skills.push(action.payload);
          state.ui.profileCompleted = calculateProfileCompletion(
            state.userProfile,
          );
          state.ui.isDirty = true;
        }
      }
    },

    removeSkill: (state, action: PayloadAction<string>) => {
      if (state.userProfile && state.userProfile.skills) {
        state.userProfile.skills = state.userProfile.skills.filter(
          (skill) => skill !== action.payload,
        );
        state.ui.profileCompleted = calculateProfileCompletion(
          state.userProfile,
        );
        state.ui.isDirty = true;
      }
    },

    updateSocialLink: (
      state,
      action: PayloadAction<{ platform: string; url: string }>,
    ) => {
      if (state.userProfile) {
        if (!state.userProfile.socialLinks) {
          state.userProfile.socialLinks = {};
        }
        (state.userProfile.socialLinks as Record<string, string>)[
          action.payload.platform
        ] = action.payload.url;
        state.ui.profileCompleted = calculateProfileCompletion(
          state.userProfile,
        );
        state.ui.isDirty = true;
      }
    },

    updateEducation: (
      state,
      action: PayloadAction<Partial<UserProfileData["education"]>>,
    ) => {
      if (state.userProfile) {
        state.userProfile.education = {
          ...state.userProfile.education,
          ...action.payload,
        };
        state.ui.profileCompleted = calculateProfileCompletion(
          state.userProfile,
        );
        state.ui.isDirty = true;
      }
    },

    updateExperience: (
      state,
      action: PayloadAction<Partial<UserProfileData["experience"]>>,
    ) => {
      if (state.userProfile) {
        state.userProfile.experience = {
          ...state.userProfile.experience,
          ...action.payload,
        };
        state.ui.profileCompleted = calculateProfileCompletion(
          state.userProfile,
        );
        state.ui.isDirty = true;
      }
    },

    updateCareerGoals: (
      state,
      action: PayloadAction<Partial<UserProfileData["careerGoals"]>>,
    ) => {
      if (state.userProfile) {
        state.userProfile.careerGoals = {
          ...state.userProfile.careerGoals,
          ...action.payload,
        };
        state.ui.profileCompleted = calculateProfileCompletion(
          state.userProfile,
        );
        state.ui.isDirty = true;
      }
    },

    updatePreferences: (
      state,
      action: PayloadAction<Partial<UserProfileData["preferences"]>>,
    ) => {
      if (state.userProfile) {
        state.userProfile.preferences = {
          ...state.userProfile.preferences,
          ...action.payload,
        };
        state.ui.isDirty = true;
      }
    },

    updateNotificationPreferences: (
      state,
      action: PayloadAction<{
        email?: boolean;
        taskEmails?: boolean;
        reviewEmails?: boolean;
        projectEmails?: boolean;
        assessmentEmails?: boolean;
      }>,
    ) => {
      if (state.userProfile) {
        state.userProfile.notificationPreferences = {
          ...(state.userProfile.notificationPreferences || {
            email: true,
            taskEmails: true,
            reviewEmails: true,
            projectEmails: true,
            assessmentEmails: true,
          }),
          ...action.payload,
        };
        state.ui.isDirty = true;
      }
    },

    addProject: (
      state,
      action: PayloadAction<{
        id: string;
        title: string;
        description: string;
        technologies: string[];
        link?: string;
        githubLink?: string;
        status: "completed" | "in-progress" | "planned";
      }>,
    ) => {
      if (state.userProfile?.experience) {
        if (!state.userProfile.experience.projects) {
          state.userProfile.experience.projects = [];
        }
        const newProject = {
          ...action.payload,
          addedDate: new Date().toISOString(),
        };
        state.userProfile.experience.projects.push(newProject);
        state.ui.isDirty = true;
      }
    },

    updateProject: (
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<{
          title: string;
          description: string;
          technologies: string[];
          link: string;
          githubLink: string;
          status: "completed" | "in-progress" | "planned";
        }>;
      }>,
    ) => {
      if (state.userProfile?.experience?.projects) {
        const projectIndex = state.userProfile.experience.projects.findIndex(
          (project) => project.id === action.payload.id,
        );
        if (projectIndex !== -1) {
          state.userProfile.experience.projects[projectIndex] = {
            ...state.userProfile.experience.projects[projectIndex],
            ...action.payload.updates,
          };
          state.ui.isDirty = true;
        }
      }
    },

    removeProject: (state, action: PayloadAction<string>) => {
      if (state.userProfile?.experience?.projects) {
        const filteredProjects = state.userProfile.experience.projects.filter(
          (project) => project.id !== action.payload,
        );
        state.userProfile.experience.projects =
          filteredProjects as typeof state.userProfile.experience.projects;
        state.ui.isDirty = true;
      }
    },

    addInternship: (
      state,
      action: PayloadAction<{
        id: string;
        companyName: string;
        position: string;
        duration: string;
        description?: string;
        skills?: string[];
      }>,
    ) => {
      if (state.userProfile?.experience) {
        if (!state.userProfile.experience.previousInternships) {
          state.userProfile.experience.previousInternships = [];
        }
        const newInternship = {
          ...action.payload,
          description: action.payload.description || "",
          skills: action.payload.skills || [],
          addedDate: new Date().toISOString(),
        };
        state.userProfile.experience.previousInternships.push(newInternship);
        state.ui.isDirty = true;
      }
    },

    updateInternship: (
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<{
          companyName: string;
          position: string;
          duration: string;
          description: string;
          skills: string[];
        }>;
      }>,
    ) => {
      if (state.userProfile?.experience?.previousInternships) {
        const internshipIndex =
          state.userProfile.experience.previousInternships.findIndex(
            (internship) => internship.id === action.payload.id,
          );
        if (internshipIndex !== -1) {
          state.userProfile.experience.previousInternships[internshipIndex] = {
            ...state.userProfile.experience.previousInternships[
              internshipIndex
            ],
            ...action.payload.updates,
          };
          state.ui.isDirty = true;
        }
      }
    },

    removeInternship: (state, action: PayloadAction<string>) => {
      if (state.userProfile?.experience?.previousInternships) {
        const filteredInternships =
          state.userProfile.experience.previousInternships.filter(
            (internship) => internship.id !== action.payload,
          );
        state.userProfile.experience.previousInternships =
          filteredInternships as typeof state.userProfile.experience.previousInternships;
        state.ui.isDirty = true;
      }
    },

    addIndustry: (state, action: PayloadAction<string>) => {
      if (state.userProfile?.careerGoals) {
        if (!state.userProfile.careerGoals.industries) {
          state.userProfile.careerGoals.industries = [];
        }
        if (
          !state.userProfile.careerGoals.industries.includes(action.payload)
        ) {
          state.userProfile.careerGoals.industries.push(action.payload);
          state.ui.isDirty = true;
        }
      }
    },

    removeIndustry: (state, action: PayloadAction<string>) => {
      if (state.userProfile?.careerGoals?.industries) {
        state.userProfile.careerGoals.industries =
          state.userProfile.careerGoals.industries.filter(
            (industry) => industry !== action.payload,
          );
        state.ui.isDirty = true;
      }
    },
  },

  extraReducers: (builder) => {
    // Fetch User Profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading.fetchProfile = true;
        state.error.fetchProfile = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading.fetchProfile = false;
        state.userProfile = serializeUserData(action.payload.user);
        state.isAuthenticated = true;
        state.ui.profileCompleted = calculateProfileCompletion(
          state.userProfile,
        );
        state.ui.lastUpdated = new Date().toISOString();
        state.ui.isDirty = false;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading.fetchProfile = false;
        state.error.fetchProfile = action.payload || "Failed to fetch profile";
        state.isAuthenticated = false;
      });

    // Update User Profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.loading.updateProfile = true;
        state.error.updateProfile = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading.updateProfile = false;
        state.userProfile = serializeUserData(action.payload.user);
        state.ui.profileCompleted = calculateProfileCompletion(
          state.userProfile,
        );
        state.ui.lastUpdated = new Date().toISOString();
        state.ui.isDirty = false;
        clearUserProfileCache();
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading.updateProfile = false;
        state.error.updateProfile =
          action.payload || "Failed to update profile";
      });

    // Upload File
    builder
      .addCase(uploadFile.pending, (state, action) => {
        const fileType = action.meta.arg.type;
        if (fileType === "image") {
          state.loading.uploadImage = true;
          state.error.uploadImage = null;
        } else {
          state.loading.uploadResume = true;
          state.error.uploadResume = null;
        }
      })
      .addCase(uploadFile.fulfilled, (state, action) => {
        const fileType = action.meta.arg.type;
        if (fileType === "image") {
          state.loading.uploadImage = false;
          if (state.userProfile) {
            state.userProfile.profile_picture = action.payload.secure_url;
            state.ui.profileCompleted = calculateProfileCompletion(
              state.userProfile,
            );
            state.ui.isDirty = true;
          }
        } else {
          state.loading.uploadResume = false;
          if (state.userProfile) {
            state.userProfile.resume = action.payload.secure_url;
            state.ui.isDirty = true;
          }
        }
        clearUserProfileCache();
      })
      .addCase(uploadFile.rejected, (state, action) => {
        const fileType = action.meta.arg.type;
        if (fileType === "image") {
          state.loading.uploadImage = false;
          state.error.uploadImage = action.payload || "Failed to upload image";
        } else {
          state.loading.uploadResume = false;
          state.error.uploadResume =
            action.payload || "Failed to upload resume";
        }
      });
  },
});

// Export actions
export const {
  clearUser,
  setUser,
  seedUserProfile,
  clearErrors,
  clearError,
  setAuthenticated,
  setDirty,
  updateUserField,
  addSkill,
  removeSkill,
  updateSocialLink,
  updateEducation,
  updateExperience,
  updateCareerGoals,
  updatePreferences,
  addProject,
  updateProject,
  removeProject,
  addInternship,
  updateInternship,
  removeInternship,
  addIndustry,
  removeIndustry,
  updateNotificationPreferences,
} = userSlice.actions;

// Export selectors
export const selectUser = (state: { user: UserState }) =>
  state.user.userProfile;
export const selectIsAuthenticated = (state: { user: UserState }) =>
  state.user.isAuthenticated;
export const selectUserLoading = (state: { user: UserState }) =>
  state.user.loading;
export const selectUserErrors = (state: { user: UserState }) =>
  state.user.error;
export const selectProfileCompletion = (state: { user: UserState }) =>
  state.user.ui.profileCompleted;
export const selectLastUpdated = (state: { user: UserState }) =>
  state.user.ui.lastUpdated;
export const selectIsDirty = (state: { user: UserState }) =>
  state.user.ui.isDirty;

// Derived selectors
export const selectUserEducation = (state: { user: UserState }) =>
  state.user.userProfile?.education;
export const selectUserExperience = (state: { user: UserState }) =>
  state.user.userProfile?.experience;
export const selectUserCareerGoals = (state: { user: UserState }) =>
  state.user.userProfile?.careerGoals;
export const selectUserPreferences = (state: { user: UserState }) =>
  state.user.userProfile?.preferences;
export const selectUserSocialLinks = (state: { user: UserState }) =>
  state.user.userProfile?.socialLinks;
export const selectUserSkills = (state: { user: UserState }) =>
  state.user.userProfile?.skills;
export const selectNotificationPreferences = (state: { user: UserState }) =>
  state.user.userProfile?.notificationPreferences;

// Export reducer
export default userSlice.reducer;

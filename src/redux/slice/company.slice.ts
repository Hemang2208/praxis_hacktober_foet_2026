import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { ICompany } from "@/models/User";
import { fetchWithAuth } from "@/lib/api-client";
import {
  invalidateDetailItemCache,
  invalidatePageCache,
} from "@/redux/slice/cache.slice";

// Helper function to serialize Mongoose documents to plain objects
function serializePlainData(data: any): PlainCompanyProfileData {
  return JSON.parse(JSON.stringify(data)) as PlainCompanyProfileData;
}

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

export type CompanyProfileData = Omit<ICompany, DocumentKeys>;

// Plain serializable version for Redux state (strips readonly properties)
export type PlainCompanyProfileData = {
  [K in keyof CompanyProfileData]: CompanyProfileData[K];
};

// Types for the slice
export interface CompanyState {
  // Company Profile
  companyProfile: PlainCompanyProfileData | null;
  isAuthenticated: boolean;

  // Loading States
  loading: {
    fetchProfile: boolean;
    updateProfile: boolean;
    uploadImage: boolean;
  };

  // Error States
  error: {
    fetchProfile: string | null;
    updateProfile: string | null;
    uploadImage: string | null;
  };

  // UI States
  ui: {
    profileFormDirty: boolean;
    lastUpdated: string | null;
    isDirty: boolean;
  };
}

const initialState: CompanyState = {
  companyProfile: null,
  isAuthenticated: false,

  loading: {
    fetchProfile: false,
    updateProfile: false,
    uploadImage: false,
  },

  error: {
    fetchProfile: null,
    updateProfile: null,
    uploadImage: null,
  },

  ui: {
    profileFormDirty: false,
    lastUpdated: null,
    isDirty: false,
  },
};

// Async Thunks
export const fetchCompanyProfile = createAsyncThunk<
  { company: PlainCompanyProfileData },
  void,
  { rejectValue: string }
>("company/fetchProfile", async (_, { rejectWithValue }) => {
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
        errorData.message || "Failed to fetch company profile",
      );
    }

    const data = await response.json();
    return { company: serializePlainData(data.user) };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to fetch company profile",
    );
  }
});

export const inviteCompanyMember = createAsyncThunk<
  void,
  { companyId: string; email: string; subrole: string },
  { rejectValue: string }
>("company/inviteMember", async (payload, { rejectWithValue, dispatch }) => {
  try {
    const userRes = await fetch("/api/user/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: payload.email }),
    });
    const userData = await userRes.json();
    if (!userData.exists) {
      return rejectWithValue(`User with email ${payload.email} does not exist.`);
    }

    const response = await fetch("/api/company/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: payload.companyId, email: payload.email, subrole: payload.subrole }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return rejectWithValue(
        (err as Record<string, unknown>)?.error as string || `Failed to send invite (status ${response.status})`,
      );
    }

    dispatch(invalidatePageCache({ resource: "companies" }));
    return;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to invite member",
    );
  }
});

export const updateCompanyMemberRole = createAsyncThunk<
  void,
  { companyId: string; email: string; subrole: string },
  { rejectValue: string }
>("company/updateMemberRole", async (payload, { rejectWithValue, dispatch }) => {
  try {
    const response = await fetch("/api/company/member", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: payload.companyId,
        email: payload.email,
        action: "changeRole",
        subrole: payload.subrole,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return rejectWithValue(
        (err as Record<string, unknown>)?.error as string || "Failed to change role",
      );
    }

    dispatch(invalidatePageCache({ resource: "companies" }));
    return;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to change member role",
    );
  }
});

export const removeCompanyMember = createAsyncThunk<
  void,
  { companyId: string; email: string },
  { rejectValue: string }
>("company/removeMember", async (payload, { rejectWithValue, dispatch }) => {
  try {
    const response = await fetch("/api/company/member", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: payload.companyId,
        email: payload.email,
        action: "remove",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return rejectWithValue(
        (err as Record<string, unknown>)?.error as string || "Failed to remove member",
      );
    }

    dispatch(invalidatePageCache({ resource: "companies" }));
    return;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to remove member",
    );
  }
});

export const updateCompanyProfile = createAsyncThunk<
  { company: PlainCompanyProfileData },
  Partial<CompanyProfileData>,
  { rejectValue: string }
>("company/updateProfile", async (updatedData, { rejectWithValue, dispatch }) => {
  try {
    const response = await fetchWithAuth("/api/dashboard/profile/company", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.message ||
          errorData.error ||
          "Failed to update company profile",
      );
    }

    const data = await response.json();

    // Also fetch updated profile to ensure consistency
    const profileResponse = await fetchWithAuth("/api/auth/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    dispatch(invalidatePageCache({ resource: "companies" }));

    // Invalidate SWR auth profile cache so sidebar/header refreshes
    try {
      const { mutate } = await import("swr");
      mutate("/api/auth/profile");
      mutate("/api/auth/current-user");
    } catch {
      // swr import non-critical
    }

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      return { company: serializePlainData(profileData.user) };
    }

    return { company: serializePlainData(data.company) };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to update company profile",
    );
  }
});

export const uploadCompanyImage = createAsyncThunk<
  { company: PlainCompanyProfileData },
  FormData,
  { rejectValue: string }
>("company/uploadImage", async (formData, { rejectWithValue, dispatch }) => {
  try {
    const response = await fetchWithAuth("/api/upload/company-image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.message || "Failed to upload company image",
      );
    }

    const data = await response.json();
    dispatch(invalidatePageCache({ resource: "companies" }));
    return { company: serializePlainData(data.company) };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to upload company image",
    );
  }
});

// Slice
const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    // Local state management
    setProfileFormDirty: (state, action: PayloadAction<boolean>) => {
      state.ui.profileFormDirty = action.payload;
      state.ui.isDirty = action.payload;
    },

    updateLocalProfile: (
      state,
      action: PayloadAction<Partial<CompanyProfileData>>,
    ) => {
      if (state.companyProfile) {
        state.companyProfile = { ...state.companyProfile, ...action.payload };
        state.ui.isDirty = true;
      }
    },

    clearCompanyProfile: (state) => {
      state.companyProfile = null;
      state.isAuthenticated = false;
    },

    clearErrors: (state) => {
      state.error = {
        fetchProfile: null,
        updateProfile: null,
        uploadImage: null,
      };
    },

    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },

    resetUI: (state) => {
      state.ui = {
        profileFormDirty: false,
        lastUpdated: null,
        isDirty: false,
      };
    },
  },
  extraReducers: (builder) => {
    // Fetch Company Profile
    builder
      .addCase(fetchCompanyProfile.pending, (state) => {
        state.loading.fetchProfile = true;
        state.error.fetchProfile = null;
      })
      .addCase(fetchCompanyProfile.fulfilled, (state, action) => {
        state.loading.fetchProfile = false;
        state.companyProfile = action.payload.company;
        state.isAuthenticated = true;
        state.ui.lastUpdated = new Date().toISOString();
        state.ui.isDirty = false;
      })
      .addCase(fetchCompanyProfile.rejected, (state, action) => {
        state.loading.fetchProfile = false;
        state.error.fetchProfile =
          action.payload || "Failed to fetch company profile";
        state.isAuthenticated = false;
      });

    // Update Company Profile
    builder
      .addCase(updateCompanyProfile.pending, (state) => {
        state.loading.updateProfile = true;
        state.error.updateProfile = null;
      })
      .addCase(updateCompanyProfile.fulfilled, (state, action) => {
        state.loading.updateProfile = false;
        state.companyProfile = action.payload.company;
        state.ui.lastUpdated = new Date().toISOString();
        state.ui.isDirty = false;
        state.ui.profileFormDirty = false;
      })
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.loading.updateProfile = false;
        state.error.updateProfile =
          action.payload || "Failed to update company profile";
      });

    // Upload Company Image
    builder
      .addCase(uploadCompanyImage.pending, (state) => {
        state.loading.uploadImage = true;
        state.error.uploadImage = null;
      })
      .addCase(uploadCompanyImage.fulfilled, (state, action) => {
        state.loading.uploadImage = false;
        if (action.payload.company) {
          state.companyProfile = action.payload.company;
        }
        state.ui.lastUpdated = new Date().toISOString();
      })
      .addCase(uploadCompanyImage.rejected, (state, action) => {
        state.loading.uploadImage = false;
        state.error.uploadImage =
          action.payload || "Failed to upload company image";
      });
  },
});

// Export actions
export const {
  setProfileFormDirty,
  updateLocalProfile,
  clearCompanyProfile,
  clearErrors,
  setAuthenticated,
  resetUI,
} = companySlice.actions;

// Export selectors
export const selectCompanyProfile = (state: { company: CompanyState }) =>
  state.company.companyProfile;

export const selectCompanyLoading = (state: { company: CompanyState }) =>
  state.company.loading;

export const selectCompanyErrors = (state: { company: CompanyState }) =>
  state.company.error;

export const selectCompanyUI = (state: { company: CompanyState }) =>
  state.company.ui;

export const selectIsCompanyAuthenticated = (state: {
  company: CompanyState;
}) => state.company.isAuthenticated;

// Export reducer
export default companySlice.reducer;

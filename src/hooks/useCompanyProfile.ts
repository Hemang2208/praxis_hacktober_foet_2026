import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import {
  fetchCompanyProfile,
  updateCompanyProfile,
  uploadCompanyImage,
  clearErrors,
  setProfileFormDirty,
  updateLocalProfile,
  selectCompanyProfile,
  selectCompanyLoading,
  selectCompanyErrors,
  selectCompanyUI,
  selectIsCompanyAuthenticated,
  CompanyProfileData,
} from '@/redux/slice/company.slice';

interface UseCompanyProfileReturn {
  // Data
  profile: CompanyProfileData | null;
  isAuthenticated: boolean;
  
  // Loading states
  loading: {
    fetchProfile: boolean;
    updateProfile: boolean;
    uploadImage: boolean;
  };
  
  // Error states
  errors: {
    fetchProfile: string | null;
    updateProfile: string | null;
    uploadImage: string | null;
  };
  
  // UI states
  ui: {
    profileFormDirty: boolean;
    lastUpdated: string | null;
    isDirty: boolean;
  };
  
  // Actions
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<CompanyProfileData>) => Promise<void>;
  uploadImage: (file: File) => Promise<void>;
  updateLocalProfileData: (data: Partial<CompanyProfileData>) => void;
  setFormDirty: (dirty: boolean) => void;
  clearAllErrors: () => void;
  
  // Utilities
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  hasErrors: boolean;
}

export const useCompanyProfile = (): UseCompanyProfileReturn => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Selectors
  const profile = useSelector((state: RootState) => selectCompanyProfile(state));
  const loading = useSelector((state: RootState) => selectCompanyLoading(state));
  const errors = useSelector((state: RootState) => selectCompanyErrors(state));
  const ui = useSelector((state: RootState) => selectCompanyUI(state));
  const isAuthenticated = useSelector((state: RootState) => selectIsCompanyAuthenticated(state));
  
  // Computed values
  const hasUnsavedChanges = ui.isDirty || ui.profileFormDirty;
  const isLoading = loading.fetchProfile || loading.updateProfile || loading.uploadImage;
  const hasErrors = Boolean(errors.fetchProfile || errors.updateProfile || errors.uploadImage);
  
  // Actions
  const fetchProfile = useCallback(async () => {
    try {
      await dispatch(fetchCompanyProfile()).unwrap();
    } catch (error) {
      console.error('Failed to fetch company profile:', error);
      throw error;
    }
  }, [dispatch]);
  
  const updateProfile = useCallback(async (data: Partial<CompanyProfileData>) => {
    try {
      await dispatch(updateCompanyProfile(data)).unwrap();
    } catch (error) {
      console.error('Failed to update company profile:', error);
      throw error;
    }
  }, [dispatch]);
  
  const uploadImage = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      await dispatch(uploadCompanyImage(formData)).unwrap();
    } catch (error) {
      console.error('Failed to upload company image:', error);
      throw error;
    }
  }, [dispatch]);
  
  const updateLocalProfileData = useCallback((data: Partial<CompanyProfileData>) => {
    dispatch(updateLocalProfile(data));
  }, [dispatch]);
  
  const setFormDirty = useCallback((dirty: boolean) => {
    dispatch(setProfileFormDirty(dirty));
  }, [dispatch]);
  
  const clearAllErrors = useCallback(() => {
    dispatch(clearErrors());
  }, [dispatch]);
  
  // Auto-fetch profile on mount if authenticated but no profile
  useEffect(() => {
    if (isAuthenticated && !profile && !loading.fetchProfile) {
      fetchProfile().catch(() => {
        // Error already handled in the thunk
      });
    }
  }, [isAuthenticated, profile, loading.fetchProfile, fetchProfile]);
  
  return {
    // Data
    profile,
    isAuthenticated,
    
    // Loading states
    loading,
    
    // Error states
    errors,
    
    // UI states
    ui,
    
    // Actions
    fetchProfile,
    updateProfile,
    uploadImage,
    updateLocalProfileData,
    setFormDirty,
    clearAllErrors,
    
    // Utilities
    hasUnsavedChanges,
    isLoading,
    hasErrors,
  };
};

export default useCompanyProfile;
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import certificatesData from "@/components/mock/certificates.json";

// Certificate Types
export type Certificate = {
  id: string;
  title: string;
  description: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
  credentialId: string;
  verificationUrl: string;
  skills: string[];
  pathId?: string;
  status: "earned" | "in-progress" | "expired";
};

export interface CertificatesState {
  certificates: Certificate[];
  loading: boolean;
  error: string | null;
}

const initialState: CertificatesState = {
  certificates: certificatesData as Certificate[],
  loading: false,
  error: null,
};

const certificatesSlice = createSlice({
  name: "certificates",
  initialState,
  reducers: {
    setCertificates: (state, action: PayloadAction<Certificate[]>) => {
      state.certificates = action.payload;
    },
    addCertificate: (state, action: PayloadAction<Certificate>) => {
      state.certificates.push(action.payload);
    },
    updateCertificate: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Certificate> }>,
    ) => {
      const { id, updates } = action.payload;
      const index = state.certificates.findIndex((cert) => cert.id === id);
      if (index !== -1) {
        state.certificates[index] = {
          ...state.certificates[index],
          ...updates,
        };
      }
    },
    removeCertificate: (state, action: PayloadAction<string>) => {
      state.certificates = state.certificates.filter(
        (cert) => cert.id !== action.payload,
      );
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCertificates,
  addCertificate,
  updateCertificate,
  removeCertificate,
  setLoading,
  setError,
} = certificatesSlice.actions;

export default certificatesSlice.reducer;

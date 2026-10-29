"use client";

import React, { createContext, useContext } from "react";

const CloudinaryContext = createContext({
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
});

export function CloudinaryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CloudinaryContext.Provider
      value={{ cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME }}
    >
      {children}
    </CloudinaryContext.Provider>
  );
}

export function useCloudinary() {
  return useContext(CloudinaryContext);
}

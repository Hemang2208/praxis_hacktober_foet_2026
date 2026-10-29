"use client";

import React, { createContext, useContext } from "react";
import AppShell from "@/components/layout/AppShell";
import { IUser } from "@/models/User";

// Create user context
const UserContext = createContext<IUser | null>(null);

export const useCurrentUser = () => {
  const user = useContext(UserContext);
  return user;
};

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: IUser;
}

export default function DashboardLayoutClient({
  children,
  user,
}: DashboardLayoutClientProps) {
  return (
    <UserContext.Provider value={user}>
      <AppShell>{children}</AppShell>
    </UserContext.Provider>
  );
}

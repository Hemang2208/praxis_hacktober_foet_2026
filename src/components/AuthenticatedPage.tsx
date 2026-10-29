import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IUser } from "@/models/User";

interface AuthenticatedPageProps {
  children: (user: IUser) => React.ReactNode;
}

export default async function AuthenticatedPage({ children }: AuthenticatedPageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  return children(user);
}
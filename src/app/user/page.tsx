import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserPageClient from "./UserPageClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Convert Mongoose document to plain object for Client Component
  const plainUser = JSON.parse(JSON.stringify(user));

  return <UserPageClient user={plainUser} />;
}

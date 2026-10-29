import { redirect } from "next/navigation";

export default function CompanyRootRedirectPage() {
  redirect("/company/login");
  return null;
}

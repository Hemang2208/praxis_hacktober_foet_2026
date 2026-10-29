import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";
import useSWR from "swr";
import Image from "next/image";

export function UserButton() {
  const router = useRouter();
  const { data } = useSWR("/api/auth/profile", async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch user profile");
    return res.json();
  });
  const user = data?.user;
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "GET" });
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="relative inline-block text-left">
      <button
        className="w-9 h-9 rounded-full border border-slate-200 bg-white shadow hover:ring-2 hover:ring-indigo-500 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
      >
        {user.profile_picture ? (
          <Image
            src={user.profile_picture}
            alt={user.full_name || "User"}
            className="w-9 h-9 rounded-full object-cover"
            width={36}
            height={36}
          />
        ) : user.image_url ? (
          <Image
            src={user.image_url}
            alt={user.full_name || "User"}
            className="w-9 h-9 rounded-full object-cover"
            width={36}
            height={36}
          />
        ) : (
          <Menu className="w-6 h-6 mx-auto text-slate-500" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          <div className="px-4 py-2 text-sm text-slate-700">
            {user.full_name}
          </div>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-start px-4 py-2 text-sm text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      )}
    </div>
  );
}

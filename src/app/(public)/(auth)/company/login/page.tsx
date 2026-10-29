"use client";
import { useState } from "react";
import Preloader from "@/components/ui/Preloader";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { encrypt } from "@/lib/crypto";

export default function CompanyLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    let bodyPayload: Record<string, unknown> = {
      email: form.email,
      password: form.password,
    };

    try {
      const encryptedData = encrypt(JSON.stringify(form));
      if (encryptedData) {
        bodyPayload = { encryptedData };
      }
    } catch (e) {
      console.warn("Client encryption fallback:", e);
    }

    try {
      const res = await fetch("/api/company/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
        credentials: "include",
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Login failed");
        toast.error(data.error || "Login failed");
      } else {
        setSuccess("Login successful!");
        toast.success("Login successful! Redirecting to dashboard...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
    } catch {
      setLoading(false);
      setError("Network error");
      toast.error("Network error");
    }
  };

  return (
    <>
      <Preloader />
      <main className="w-full max-w-md rounded-2xl border border-white/40 bg-white/70 p-8 backdrop-blur-xl shadow-sm mx-auto mt-24">
      <div className="flex items-center justify-center mb-4">
        <Image
          src="/logo.png"
          alt="Praxis Logo"
          width={48}
          height={48}
          className="cursor-pointer object-contain"
          priority
        />
      </div>
      <h2 className="text-center text-3xl font-semibold tracking-tight">
        Company Login
      </h2>
      <form className="space-y-5 mt-6" onSubmit={handleSubmit}>
        {error && (
          <div className="text-destructive text-sm mb-2">{error}</div>
        )}
        {success && (
          <div className="text-green-600 text-sm mb-2">{success}</div>
        )}
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            placeholder="hr@company.com"
            value={form.email}
            onChange={handleChange}
            required
            autoFocus
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <Eye className="h-5 w-5" />
              ) : (
                <EyeOff className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <div className="mt-4 text-center">
        <Link href="/reset-password" className="text-sm text-blue-600 hover:underline">
          Forgot Password?
        </Link>
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">
        New company?{" "}
        <Link
          href="/company/signup"
          className="font-medium text-slate-900 hover:underline"
        >
          Register
        </Link>
      </p>
    </main>
    </>
  );
}

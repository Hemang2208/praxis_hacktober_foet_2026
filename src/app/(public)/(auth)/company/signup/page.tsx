"use client";

import Link from "next/link";
import Preloader from "@/components/ui/Preloader";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { encrypt } from "@/lib/crypto";

export default function CompanySignup() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    contactPersonName: "",
    designation: "HR",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setWarning("");
    setSuccess("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    const encryptedData = encrypt(JSON.stringify(form));
    try {
      const res = await fetch("/api/company/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.warning) {
        setWarning(data.warning);
        toast.error(data.warning);
      }
      if (!res.ok) {
        setError(data.error || "Signup failed");
        toast.error(data.error || "Signup failed");
      } else if (!data.warning) {
        setSuccess("Signup successful! Please verify your email.");
        toast.success("Signup successful! Please verify your email.");
        // Store email in localStorage for verify page
        if (typeof window !== "undefined") {
          localStorage.setItem("userEmail", form.email);
          localStorage.setItem("userRole", "company");
        }
        setTimeout(() => {
          router.push(`/verify?email=${encodeURIComponent(form.email)}`);
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
          onClick={() => router.push("/")}
          src="/logo.png"
          alt="Praxis Logo"
          width={48}
          height={48}
          className="cursor-pointer"
          priority
        />
      </div>
      <h2 className="text-center text-3xl font-semibold tracking-tight">
        Register your Company
      </h2>
      <p className="mt-2 text-center text-sm text-slate-600">
        Manage jobs, hiring, and placement activities
      </p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="text-destructive text-sm mb-2">{error}</div>
        )}
        {warning && (
          <div className="text-yellow-600 text-sm mb-2">{warning}</div>
        )}
        {success && (
          <div className="text-green-600 text-sm mb-2">{success}</div>
        )}
        <div>
          <label className="text-sm font-medium">Company Name</label>
          <input
            type="text"
            name="companyName"
            placeholder="ABC Pvt Ltd"
                  value={form.companyName}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Industry</label>
                <input
                  type="text"
                  name="industry"
                  placeholder="IT, Finance, etc."
                  value={form.industry}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Hiring Contact (Full Name)
                </label>
                <input
                  type="text"
                  name="contactPersonName"
                  placeholder="Authorized person name"
                  value={form.contactPersonName}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Designation</label>
                <select
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  aria-label="Designation"
                >
                  <option>HR</option>
                  <option>Recruiter</option>
                  <option>Founder</option>
                  <option>Manager</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Official Work Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="hr@company.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-900"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-900"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full cursor-pointer rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                disabled={loading}
              >
                {loading ? "Signing up..." : "Create Company Account"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
              Already registered?{" "}
              <Link
                href="/company/login"
                className="font-medium text-slate-900 hover:underline"
              >
                Log in
              </Link>
            </p>
            <p className="mt-4 text-center text-xs text-slate-500">
              Accounts are verified before approval
            </p>
        </main>
    </>
  );
}

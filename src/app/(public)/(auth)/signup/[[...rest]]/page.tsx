"use client";

import { useState, useEffect, Suspense } from "react";
import Preloader from "@/components/ui/Preloader";
import { encrypt } from "../encrypt";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import { OAuthButtons, OAuthDivider } from "@/components/auth/OAuthButtons";

function StudentSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle OAuth errors from URL params
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      const errorMessages: Record<string, string> = {
        oauth_failed: "OAuth authentication failed. Please try again.",
        oauth_signup_required:
          "Please complete signup with email first, then link your social account.",
      };
      setError(errorMessages[oauthError] || "Authentication failed.");
      toast.error(errorMessages[oauthError] || "Authentication failed.");
    }
    // Pre-fill email if provided from OAuth
    const email = searchParams.get("email");
    if (email) {
      setForm((prev) => ({ ...prev, email }));
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: encrypt(form.full_name),
          email: encrypt(form.email),
          password: encrypt(form.password),
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Signup failed");
        toast.error(data.error || "Signup failed");
      } else {
        setSuccess("Signup successful! Please verify your email.");
        toast.success("Signup successful! Please verify your email.");
        // Store email in localStorage for verify page
        if (typeof window !== "undefined") {
          localStorage.setItem("userEmail", form.email);
          localStorage.setItem("userRole", "student");
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
      <main className="w-full max-w-md rounded-2xl border border-white/40 bg-white/70 p-6 sm:p-8 backdrop-blur-xl shadow-sm mx-auto">
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
        Create your user account
      </h2>
      <p className="mt-2 text-center text-sm text-slate-600">
        Join Praxis as a user
      </p>

      {/* OAuth Buttons */}
      <div className="mt-6">
        <OAuthButtons userType="student" redirect="/user" />
        <OAuthDivider className="my-6" />
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <div className="text-destructive text-sm mb-2">{error}</div>}
        {success && (
          <div className="text-green-600 text-sm mb-2">{success}</div>
        )}
        <div>
          <label className="text-sm font-medium">Full Name</label>
          <input
            type="text"
            name="full_name"
            placeholder="Your full name"
            value={form.full_name}
            onChange={handleChange}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            placeholder="you@email.com"
            value={form.email}
            onChange={handleChange}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            name="password"
            placeholder="Create a strong password"
            value={form.password}
            onChange={handleChange}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          disabled={loading}
        >
          {loading ? "Signing up..." : "Create User Account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link
          href="/login"
          className="font-medium text-slate-900 hover:underline"
        >
          Log in
        </Link>
      </p>
    </main>
    </>
  );
}

export default function StudentSignup() {
  return (
    <Suspense
      fallback={
        <main className="w-full max-w-md rounded-2xl border border-white/40 bg-white/70 p-8 backdrop-blur-xl shadow-sm mx-auto">
          <div className="animate-pulse text-center">Loading...</div>
        </main>
      }
    >
      <StudentSignupContent />
    </Suspense>
  );
}

"use client";
import { useState } from "react";
import Preloader from "@/components/ui/Preloader";
import { useRouter } from "next/navigation";

import Link from "next/link";
import Image from "next/image";

const COLLEGE_TYPES = [
  "Engineering College",
  "University",
  "Polytechnic",
  "School / Other",
];
const DESIGNATIONS = ["TPO / Placement Officer", "Faculty", "Admin"];

export default function CollegeSignup() {
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");
      setSuccess("");
      setLoading(true);
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/college/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Signup failed");
        } else {
          setSuccess("Signup successful! Please verify your email.");
          // Store email and role in localStorage for verify page
          if (typeof window !== "undefined") {
            localStorage.setItem("userEmail", form.email);
            localStorage.setItem("userRole", "college");
          }
          setTimeout(() => {
            router.push(`/verify?email=${encodeURIComponent(form.email)}`);
          }, 1500);
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };
  const router = useRouter();
  const [form, setForm] = useState({
    collegeName: "",
    collegeType: COLLEGE_TYPES[0],
    contactPersonName: "",
    designation: DESIGNATIONS[0],
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
        Register your college on Praxis
      </h2>
      <p className="mt-2 text-center text-sm text-slate-600">
        Bring your campus activities to Praxis
      </p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="text-destructive text-sm mb-2">{error}</div>
        )}
        {success && (
          <div className="text-green-600 text-sm mb-2">{success}</div>
        )}
        <div>
          <label className="text-sm font-medium">College Name</label>
          <input
            type="text"
            name="collegeName"
            placeholder="ABC Institute of Technology"
            value={form.collegeName}
            onChange={handleChange}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium">College Type</label>
          <select
            name="collegeType"
            value={form.collegeType}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
            aria-label="College Type"
          >
            {COLLEGE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Your Full Name</label>
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
            {DESIGNATIONS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Official College Email</label>
          <input
            type="email"
            name="email"
            placeholder="tpo@college.edu"
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
          {loading ? "Signing up..." : "Create College Account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link
          href="/college/login"
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

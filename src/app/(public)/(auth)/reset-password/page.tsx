"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function ResetPasswordPage() {
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(2);
        setMessage("OTP sent to your email.");
      } else {
        setMessage(data.error || "Failed to send OTP");
      }
    } catch {
      setMessage("Network error");
    }
    setLoading(false);
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(3);
        setMessage("OTP verified. Set your new password.");
      } else {
        setMessage(data.error || "Invalid OTP");
      }
    } catch {
      setMessage("Network error");
    }
    setLoading(false);
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });
      const data = await res.json();
      if (res.ok) {
        // Fetch the role for this email
        const roleRes = await fetch("/api/auth/get-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const roleData = await roleRes.json();
        let redirectPath = "/login";
        if (roleData.role === "college") redirectPath = "/college/login";
        else if (roleData.role === "company") redirectPath = "/company/login";
        setMessage("Password reset successful! Redirecting to login...");
        setTimeout(() => router.push(redirectPath), 2000);
      } else {
        setMessage(data.error || "Failed to reset password");
      }
    } catch {
      setMessage("Network error");
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="relative min-h-screen flex items-center justify-center bg-slate-50 px-6 pt-32 overflow-hidden">
        <div className="fixed inset-0 w-full h-full pointer-events-none select-none z-0 grid-bg" />
        <main className="relative z-10 w-full max-w-md rounded-2xl border border-white/40 bg-white/70 p-8 backdrop-blur-xl shadow-sm">
          <h2 className="text-center text-2xl font-semibold mb-6">Reset Password</h2>
          {message && <div className="mb-4 text-center text-sm text-blue-600">{message}</div>}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="Enter your email"
                  title="Email"
                />
              </div>
              <button type="submit" className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800" disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="text-sm font-medium">Enter OTP</label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  required
                  autoFocus
                  placeholder="Enter OTP"
                  title="OTP"
                />
              </div>
              <button type="submit" className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="text-sm font-medium">New Password</label>
                <input
                  type="password"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="New password"
                  title="New Password"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Confirm Password</label>
                <input
                  type="password"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  title="Confirm Password"
                />
              </div>
              <button type="submit" className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
          <div className="mt-6 text-center">
            <Link href="/login" className="text-slate-600 hover:underline text-sm">Back to Login</Link>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}

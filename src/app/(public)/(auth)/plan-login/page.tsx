"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const allowedProviders = [
  "gmail",
  "hotmail",
  "yahoo",
  "outlook",
  "live",
  "icloud",
  "aol",
  "protonmail",
];

function isAllowedEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return false;
  }

  const domain = normalized.split("@")[1] || "";
  const provider = domain.split(".")[0] || "";
  return allowedProviders.includes(provider);
}

type PlannerStep = "email" | "passwordLogin" | "otpVerify" | "setPassword";

export default function PlannerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<PlannerStep>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Email is required.");
      setLoading(false);
      return;
    }

    if (!isAllowedEmail(normalizedEmail)) {
      setError(
        "Please use a Gmail, Hotmail, Yahoo, Outlook, Live, iCloud, AOL, or ProtonMail email.",
      );
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/plan/auth/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to check email.");
      }

      if (data.hasPassword) {
        setStep("passwordLogin");
        setInfo(
          "This email is already registered. Enter your password to login.",
        );
      } else {
        const otpResponse = await fetch("/api/plan/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: normalizedEmail }),
        });

        const otpData = await otpResponse.json();
        if (!otpResponse.ok) {
          throw new Error(otpData.error || "Failed to send OTP.");
        }

        setStep("otpVerify");
        setInfo("OTP sent to your email. Please enter the code to continue.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process email.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/plan/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password: password.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed.");
      }

      router.push("/plan");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter the 6-digit OTP sent to your email.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/plan/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail, otp: otp.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "OTP verification failed.",
        );
      }

      setStep("setPassword");
      setInfo("OTP verified. Set your password to use this login in future.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (!password.trim() || password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (password.trim() !== confirmPassword.trim()) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/plan/auth/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to set password.");
      }

      router.push("/plan");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch("/api/plan/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to resend OTP.");
      }

      setInfo("OTP resent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-10">
      <div className="w-full rounded border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Planner Login</h1>
        <p className="mt-2 text-sm text-gray-600">
          {step === "email"
            ? "Enter your email to continue. If this is your first time, you'll verify with OTP and set a password."
            : step === "passwordLogin"
              ? "Enter your password to login with your existing planner account."
              : step === "otpVerify"
                ? "Enter the OTP sent to your email to verify your account."
                : "Set your planner password to use email and password login in future."}
        </p>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="you@gmail.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Checking email..." : "Continue"}
            </button>

            <p className="text-xs text-muted-foreground">
              If this is your first time, you will verify via OTP and then set a
              password. Later, you can login directly with email and password.
            </p>
          </form>
        ) : step === "passwordLogin" ? (
          <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <button
              type="button"
              onClick={() => {
                setPassword("");
                setStep("email");
                setInfo(null);
                setError(null);
              }}
              disabled={loading}
              className="w-full rounded border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
            >
              Use a different email
            </button>
          </form>
        ) : step === "otpVerify" ? (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div>
              <label htmlFor="otp" className="mb-1 block text-sm font-medium">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={resendOtp}
              disabled={loading}
              className="w-full rounded border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
            >
              Resend OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleSetPassword} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium"
              >
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Create a new password"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Saving password..." : "Set Password"}
            </button>
          </form>
        )}

        {info ? <p className="mt-4 text-sm text-green-700">{info}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </div>
    </main>
  );
}

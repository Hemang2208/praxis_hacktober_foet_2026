"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import Image from "next/image";
import { Check, Loader2 } from "lucide-react";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [otp, setOtp] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState<string | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedEmail = localStorage.getItem("userEmail");
      if (!storedEmail) {
        toast.error("Session expired. Please sign up again.");
        router.push("/signup");
        localStorage.removeItem("userEmail");
        return;
      }
      setEmail(storedEmail);
      setIsReady(true);
    }
  }, [router]);

  if (!isReady) {
    return null;
  }

  if (!email) {
    toast.error("Session expired. Please sign up again.");
    router.push("/signup");
    localStorage.removeItem("userEmail");
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (otp.length !== 6) {
        toast.error("Please enter valid OTP.");
        setIsLoading(false);
        return;
      }
      // Call backend OTP verify API
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Email verified! You can now log in.");
        // Read role before removing from localStorage
        const role = localStorage.getItem("userRole");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        localStorage.removeItem("userPassword");
        localStorage.removeItem("userRole");
        setTimeout(() => {
          if (role === "college") {
            router.push("/college/login");
          } else if (role === "company") {
            router.push("/company/login");
          } else {
            router.push("/login");
          }
        }, 1200);
      } else {
        toast.error(data.message || "Invalid or expired OTP.");
      }
    } catch {
      toast.error("An error occurred during verification.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-4">
      <div className="flex justify-center mt-6 mb-6">
        <Image
          onClick={() => router.push("/")}
          src="/logo.png"
          alt="Logo"
          width={48}
          height={48}
          className="cursor-pointer"
        />
      </div>

      <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
        Verify your Email
      </h2>
      <p className="text-center text-gray-600 mb-8">
        We&apos;ve sent a 6-digit code to{" "}
        <span className="font-semibold text-black">{email}</span>
      </p>

      <form onSubmit={handleVerify} className="space-y-6">
        <div className="flex justify-center gap-3 mb-6">
          {[...Array(6)].map((_, i: number) => (
            <input
              key={i}
              type="text"
              maxLength={1}
              value={otp[i] || ""}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, ""); // Only allow digits
                const newOtp = otp.split("");
                newOtp[i] = value;
                setOtp(newOtp.join(""));

                // Auto-advance to next input when digit is entered
                if (value && i < 5) {
                  const nextInput = document.querySelector(
                    `input[title="OTP digit ${i + 2}"]`,
                  ) as HTMLInputElement;
                  if (nextInput) {
                    nextInput.focus();
                  }
                }
              }}
              onKeyDown={(e) => {
                // Handle backspace to move to previous input
                if (e.key === "Backspace" && !otp[i] && i > 0) {
                  const prevInput = document.querySelector(
                    `input[title="OTP digit ${i}"]`,
                  ) as HTMLInputElement;
                  if (prevInput) {
                    prevInput.focus();
                  }
                }

                // Handle paste
                if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  navigator.clipboard.readText().then((clipboardData) => {
                    const pastedData = clipboardData
                      .replace(/[^0-9]/g, "")
                      .slice(0, 6);
                    if (pastedData) {
                      setOtp(pastedData.padEnd(6, ""));
                      // Focus the last filled input or the next empty one
                      const targetIndex = Math.min(pastedData.length, 5);
                      const targetInput = document.querySelector(
                        `input[title="OTP digit ${targetIndex + 1}"]`,
                      ) as HTMLInputElement;
                      if (targetInput) {
                        setTimeout(() => targetInput.focus(), 0);
                      }
                    }
                  });
                }

                // Allow only digits and navigation keys
                if (
                  !/[0-9]/.test(e.key) &&
                  ![
                    "Backspace",
                    "Delete",
                    "ArrowLeft",
                    "ArrowRight",
                    "Tab",
                  ].includes(e.key) &&
                  !(e.key === "v" && (e.ctrlKey || e.metaKey))
                ) {
                  e.preventDefault();
                }
              }}
              onFocus={(e) => e.target.select()} // Select all text when focused
              className="w-12 h-16 bg-gray-50 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold text-gray-900 placeholder-gray-400 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200"
              pattern="\d"
              required
              title={`OTP digit ${i + 1}`}
              placeholder="•"
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={isLoading || otp.length !== 6}
          className="w-full flex mb-4 items-center cursor-pointer justify-center gap-2 bg-black text-white py-3 px-4 rounded-lg  disabled:opacity-50 transition-colors duration-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              Verify Email
            </>
          )}
        </button>
      </form>
    </div>
  );
}

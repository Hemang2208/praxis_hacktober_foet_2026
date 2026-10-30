"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Mail,
  Phone,
  User,
  Shield,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import Link from "next/link";

export default function PreRegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    otp: "",
    role: "student", // default
  });

  const [location, setLocation] = useState<string | null>("");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(
            `https://www.google.com/maps/@${position.coords.latitude},${position.coords.longitude},15z`
          );
        },
        (err) => setError(err.message)
      );
    } else {
      setError("Geolocation not supported in this browser.");
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (name === "phone") {
      let phoneValue = value;
      if (phoneValue.startsWith("+")) {
        phoneValue = phoneValue.replace(/[^\d+]/g, "").slice(0, 14);
      } else {
        phoneValue = phoneValue.replace(/\D/g, "");
        if (phoneValue.startsWith("0")) {
          phoneValue = phoneValue.slice(0, 11);
        } else {
          phoneValue = phoneValue.slice(0, 10);
        }
      }
      setFormData({ ...formData, [name]: phoneValue });
    } else if (name === "otp") {
      const otpValue = value.replace(/\D/g, "").slice(0, 6);
      setFormData({ ...formData, [name]: otpValue });
    } else if (name === "role" && type === "radio") {
      setFormData({ ...formData, role: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const sendOtp = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.organization || !formData.role) {
      setError("All fields are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (formData.phone.startsWith("+")) {
      if (formData.phone.length < 2 || formData.phone.length > 14) {
        setError("Please enter a valid phone number: up to 14 digits if starting with +");
        return;
      }
    } else if (formData.phone.startsWith("0")) {
      if (formData.phone.length !== 11) {
        setError("Please enter a valid phone number: 11 digits if starting with 0");
        return;
      }
    } else {
      if (formData.phone.length !== 10) {
        setError("Please enter a valid phone number: 10 digits");
        return;
      }
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/nodemailer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setStep(2);
        toast.success("Verification code sent to your email!");
      } else if (response.status === 202) {
        setOtpSent(true);
        setStep(2);
        toast(data.message);
      } else if (response.status === 409) {
        setError("User already registered.");
      } else {
        setError(data.message || "Failed to send verification code");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError("Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!formData.otp || formData.otp.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const otpResponse = await fetch("/api/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
          isPreRegister: true,
        }),
      });

      const otpData = await otpResponse.json();

      if (!otpResponse.ok) {
        setError(otpData.message || "Invalid verification code");
        return;
      }

      const preRegisterResponse = await fetch("/api/preregister", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          organization: formData.organization,
          location: location || "Not Provided",
          role: formData.role,
        }),
      });

      const preRegisterData = await preRegisterResponse.json();

      if (preRegisterResponse.ok) {
        toast.success("🎉 Pre-registration successful!");
        setSuccess(true);
        setStep(3);
      } else if (preRegisterResponse.status === 202) {
        toast(preRegisterData.message);
        setSuccess(true);
        setStep(3);
      } else {
        setError(
          preRegisterData.error || "Registration failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Error during verification:", error);
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 pt-24">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl border shadow-xl overflow-hidden">
          <div className="bg-black text-white p-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Join Praxis 
            </h1>
            <p className="text-gray-300 text-sm mt-1">
              Get early access to your AI Project Manager 🚀
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <Input
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    name="phone"
                    type="tel"
                    placeholder="10-digit phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    Organization/City
                  </Label>
                  <Input
                    name="organization"
                    placeholder="Your organization or city"
                    value={formData.organization}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    Role
                  </Label>
                  <div className="flex gap-6 mt-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        value="student"
                        checked={formData.role === "student"}
                        onChange={handleChange}
                      />
                      User
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        value="college"
                        checked={formData.role === "college"}
                        onChange={handleChange}
                      />
                      College
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        value="company"
                        checked={formData.role === "company"}
                        onChange={handleChange}
                      />
                      Company
                    </label>
                  </div>
                </div>

                <Separator className="my-4" />

                <Button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full bg-black text-white hover:bg-black/90"
                >
                  {loading ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </motion.div>
            )}

            {step === 2 && otpSent && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <Shield className="w-12 h-12 text-black mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Verify Your Email
                  </h3>
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code sent to{" "}
                    <span className="font-medium text-black">
                      {formData.email}
                    </span>
                  </p>
                </div>

                <Input
                  name="otp"
                  placeholder="______"
                  maxLength={6}
                  value={formData.otp}
                  onChange={handleChange}
                  className="text-center text-lg font-mono tracking-[0.5rem]"
                />

                <Button
                  onClick={verifyOtp}
                  disabled={loading}
                  className="w-full bg-black text-white hover:bg-black/90"
                >
                  {loading ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    "Verify & Complete Registration"
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full border border-black text-black hover:bg-black hover:text-white"
                  onClick={async () => {
                    setResendLoading(true);
                    setError("");

                    try {
                      const response = await fetch("/api/nodemailer", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          email: formData.email,
                          name: formData.name,
                        }),
                      });

                      const data = await response.json();

                      if (response.ok || response.status === 202) {
                        toast.success("Verification code resent!");
                      } else {
                        setError(data.message || "Failed to resend code");
                      }
                    } catch (error) {
                      console.error("Error resending OTP:", error);
                      setError("Failed to resend code. Please try again.");
                    } finally {
                      setResendLoading(false);
                    }
                  }}
                  disabled={resendLoading}
                >
                  {resendLoading ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    "Resend Code"
                  )}
                </Button>

                <button
                  onClick={() => {
                    setStep(1);
                    setOtpSent(false);
                    setFormData({ ...formData, otp: "" });
                  }}
                  className="block w-full text-sm text-gray-500 mt-2 hover:text-gray-700"
                >
                  ← Back to edit details
                </button>
              </motion.div>
            )}

            {step === 3 && success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  You&apos;re on the list!
                </h3>
                <p className="text-gray-600">
                  Thank you for pre-registering. We&apos;ll notify you when Praxis
                  is ready for you.
                </p>
              </motion.div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            By pre-registering, you agree to our{" "}
            <Link href="/terms-and-conditions" className="underline hover:text-black">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="underline hover:text-black">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  School,
  Linkedin,
  FileText,
  Globe,
  Send,
} from "lucide-react";
import IInternApplication from "@/components/intern";
import { encrypt } from "@/lib/crypto";
import toast from "react-hot-toast";

// 1. Zod schema: all fields are strings (including URLs)
const formSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, { message: "Full name must be at least 2 characters long." })
    .max(100, { message: "Full name must be less than 100 characters." }),

  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email address." }),

  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, {
      message: "Phone number must be 10 digits.",
    }),

  college: z
    .string()
    .trim()
    .min(20, { message: "Must be at least 20 characters." })
    .max(150, { message: "Must be less than 150 characters." }),

  experience: z
    .string()
    .trim()
    .max(500, { message: "Experience must be less than 500 characters." })
    .optional(),

  linkedin: z
    .string()
    .trim()
    .url({ message: "Please enter a valid LinkedIn profile URL." })
    .refine((url) => url.includes("linkedin.com"), {
      message: "URL must be a valid LinkedIn profile link.",
    }),

  resumeLink: z
    .string()
    .trim()
    .max(500, { message: "Resume link must be less than 500 characters." })
    .url({ message: "Resume link must be a valid URL." }),

  portfolioLink: z
    .string()
    .trim()
    .max(500, { message: "Portfolio link must be less than 500 characters." })
    .optional(),

  message: z
    .string()
    .trim()
    .min(10, { message: "Message must be more than 10 characters." })
    .max(1000, { message: "Message must be under 1000 characters." }),

  privacyConsent: z.boolean().refine((val) => val === true, {
    message: "You must agree to the privacy policy",
  }),
});

export default function ApplyPage() {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      college: "",
      experience: "",
      linkedin: "",
      resumeLink: "",
      portfolioLink: "",
      message: "",
      privacyConsent: false,
    },
  });

  const convertToIInternApplication = (
    data: z.infer<typeof formSchema>
  ): Partial<IInternApplication> => {
    return {
      full_name: data.full_name,
      college: data.college,
      contactInfo: {
        email: data.email,
        phone: data.phone,
      },
      information: {
        experience: data.experience || undefined,
        message: data.message,
      },
      links: {
        linkedin: data.linkedin,
        resumeLink: data.resumeLink,
        portfolioLink: data.portfolioLink || undefined,
      },
      privacyConsent: data.privacyConsent,
    };
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    console.log("Form submitted with values:", values);
    try {
      const internApplicationData = convertToIInternApplication(values);

      const encryptedData = encrypt(JSON.stringify(internApplicationData));

      const response = await fetch(`/api/careers/intern`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ encryptedData }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Server Error Response:", responseData);
        toast.error(responseData.message || "Failed to submit application");
        return;
      }

      toast.success(
        responseData.message || "Internship Application Submitted Successfully!"
      );

      // Reset form after successful submission
      form.reset();
    } catch (error) {
      toast.error("Failed to submit application. Please try again.");
      console.error("Error submitting internship application:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-full mx-auto min-h-screen bg-background">

      <div className="mx-auto container py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto mt-20"
        >
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-4">
              Apply for Internship at KIYO
            </h1>
            <p className="text-muted-foreground">
              We&apos;re excited to welcome passionate students. Fill the form
              below.
            </p>
          </div>

          <div className="w-full mx-auto bg-white rounded-lg shadow-md p-6 md:p-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Personal Info */}
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Full Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Your Full Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="9988776655" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="college"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <School className="h-4 w-4" />
                          College Details
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="B.Tech CSE , First Year , IIT Delhi"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-1 gap-6">
                  {/* Links */}
                  <FormField
                    control={form.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Linkedin className="h-4 w-4" />
                          LinkedIn Profile
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://linkedin.com/in/username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="resumeLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Resume Link (Google Drive / Notion)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://drive.google.com/resume"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="portfolioLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Portfolio / Project Link (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://your-portfolio.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Exp in Months (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="3 Months of Freelance"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Cover Letter */}
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why do you want to join us .. ?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us why you're a great fit... what makes you stand out as an intern ?"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Privacy Consent */}
                <FormField
                  control={form.control}
                  name="privacyConsent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I agree to the{" "}
                          <Link
                            href="/privacy"
                            className="text-primary hover:underline"
                          >
                            Privacy Policy
                          </Link>{" "}
                          and{" "}
                          <Link
                            href="/terms"
                            className="text-primary hover:underline"
                          >
                            Terms of Service
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                {/* Submit */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll review your application and get back to you
                    within 5-7 business days.
                  </p>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 cursor-pointer"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {loading ? "Submitting..." : "Submit Application"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </motion.div>
      </div>

    </div>
  );
}

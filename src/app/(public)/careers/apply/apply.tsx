"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Mail,
  User,
  FileText,
  Phone,
  Send,
  Github,
  Link as LinkIcon,
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  PieChart,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import Link from "next/link";
import IApplication from "@/components/application";
import { encrypt } from "@/lib/crypto";
import toast from "react-hot-toast";

type ExperienceLevel = "entry" | "mid" | "senior" | "executive";
type EmploymentStatus =
  | "employed"
  | "unemployed"
  | "student"
  | "freelancer"
  | "other";

interface FormData {
  // Personal Information
  full_name: string;
  email: string;
  phone: string;
  location: string;

  // Professional Information
  position: string;
  experienceLevel: ExperienceLevel | "";
  yearsOfExperience: string;
  currentEmploymentStatus: EmploymentStatus | "";
  noticePeriod: string;
  expectedPackage: string;

  // Links and Documents
  resumeURL: string;
  githubURL: string;
  showcaseURL: string;
  portfolioURL: string;
  linkedinURL: string;

  // Detailed Information
  skills: string;
  achievements: string;
  coverLetter: string;
  message: string;

  // Legal
  privacyConsent: boolean;
}

export default function ApplyPage() {
  const searchParams = useSearchParams();
  const positionParam = searchParams.get("position");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    position: positionParam || "",
    experienceLevel: "",
    yearsOfExperience: "",
    currentEmploymentStatus: "",
    noticePeriod: "",
    expectedPackage: "",
    resumeURL: "",
    githubURL: "",
    showcaseURL: "",
    portfolioURL: "",
    linkedinURL: "",
    skills: "",
    achievements: "",
    coverLetter: "",
    message: "",
    privacyConsent: false,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof FormData | "form", string>>
  >({});

  useEffect(() => {
    if (positionParam) {
      setFormData((prev) => ({ ...prev, position: positionParam }));
    }
  }, [positionParam]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error when user types
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Personal Information validations
    if (!formData.full_name) newErrors.full_name = "Name is required";
    else if (formData.full_name.length < 2)
      newErrors.full_name = "Name must be at least 2 characters";
    else if (!/^[a-zA-Z\s'-]+$/.test(formData.full_name)) {
      newErrors.full_name =
        "Name can only contain letters, spaces, hyphens, and apostrophes";
    }

    if (!formData.email) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email))
      newErrors.email = "Please enter a valid email";

    if (!formData.phone) newErrors.phone = "Phone is required";
    else if (!/^[0-9+\s()-]+$/.test(formData.phone))
      newErrors.phone = "Please enter a valid phone number";

    if (!formData.location) newErrors.location = "Location is required";

    // Professional Information validations
    if (!formData.position) newErrors.position = "Position is required";

    if (!formData.experienceLevel)
      newErrors.experienceLevel = "Please select experience level";

    if (!formData.yearsOfExperience) {
      newErrors.yearsOfExperience = "Years of experience is required";
    } else {
      const years = parseInt(formData.yearsOfExperience);
      if (isNaN(years) || years < 0 || years > 50) {
        newErrors.yearsOfExperience =
          "Years of experience must be between 0-50";
      }
    }

    if (formData.noticePeriod) {
      const noticePeriod = parseInt(formData.noticePeriod);
      if (isNaN(noticePeriod) || noticePeriod < 0 || noticePeriod > 12) {
        newErrors.noticePeriod = "Notice period must be between 0-12 months";
      }
    }

    // if (formData.expectedPackage && formData.expectedPackage.trim()) {
    //   if (formData.expectedPackage.length < 1) {
    //     newErrors.expectedPackage = "Please provide expected package";
    //   }
    // }

    // Links validations
    if (!formData.resumeURL) newErrors.resumeURL = "Resume URL is required";
    else if (!/^(https?:\/\/)/.test(formData.resumeURL))
      newErrors.resumeURL = "Please enter a valid URL";

    if (formData.githubURL && !/github\.com/.test(formData.githubURL)) {
      newErrors.githubURL = "Please provide a valid GitHub URL";
    }

    if (!formData.linkedinURL)
      newErrors.linkedinURL = "LinkedIn URL is required";
    else if (!/linkedin\.com/.test(formData.linkedinURL))
      newErrors.linkedinURL = "Please provide a valid LinkedIn URL";

    // Detailed Information validations
    if (!formData.skills) newErrors.skills = "Skills are required";
    else if (formData.skills.length < 10)
      newErrors.skills = "Please list at least 3 skills";

    if (!formData.coverLetter)
      newErrors.coverLetter = "Cover letter is required";
    else if (formData.coverLetter.length < 50)
      newErrors.coverLetter = "Cover letter should be at least 50 characters";

    // Legal validation
    if (!formData.privacyConsent)
      newErrors.privacyConsent = "You must agree to the privacy policy";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const convertToIApplication = (data: FormData): Partial<IApplication> => {
    return {
      full_name: data.full_name,
      position: data.position,
      expectedPackage: data.expectedPackage || "",
      area: data.location,
      contactInfo: {
        email: data.email,
        phone: data.phone,
      },
      information: {
        position: data.position,
        experienceLevel: data.experienceLevel,
        yearsOfExperience: data.yearsOfExperience,
        expectedPackage: data.expectedPackage || "",
        currentEmploymentStatus: data.currentEmploymentStatus || undefined,
        noticePeriod: data.noticePeriod || undefined,
      },
      links: {
        resumeURL: data.resumeURL,
        linkedinURL: data.linkedinURL,
        githubURL: data.githubURL || undefined,
        portfolioURL: data.portfolioURL || undefined,
        showcaseURL: data.showcaseURL || undefined,
      },
      job: {
        skills: data.skills,
        coverLetter: data.coverLetter,
        achievements: data.achievements || undefined,
        message: data.message || undefined,
      },
      privacyConsent: data.privacyConsent,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const applicationData = convertToIApplication(formData);

      const encryptedData: string = encrypt(JSON.stringify(applicationData));

      const response = await fetch(`/api/careers/application`, {
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
      }

      // const decryptedData = JSON.parse(decrypt(responseData.data));
      // console.log("Success Response:", decryptedData);

      toast.success(
        responseData.message || "Application Submitted Successfully!"
      );
    } catch (error) {
      toast.error("Failed to submit application. Please try again.");
      console.error("Error submitting application:", error);
      setErrors({ form: "Failed to submit application. Please try again." });
    } finally {
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        location: "",
        position: positionParam || "",
        experienceLevel: "",
        yearsOfExperience: "",
        currentEmploymentStatus: "",
        noticePeriod: "",
        expectedPackage: "",
        resumeURL: "",
        githubURL: "",
        showcaseURL: "",
        portfolioURL: "",
        linkedinURL: "",
        skills: "",
        achievements: "",
        coverLetter: "",
        message: "",
        privacyConsent: false,
      });
      setErrors({});
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="container py-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl w-full mx-auto flex flex-col items-center justify-center mt-20"
        >
          <div className="text-center mb-12 w-full">
            <h1 className="text-3xl font-bold mb-4">
              {formData.position
                ? `Apply for ${formData.position}`
                : "Join Our Team"}
            </h1>
            <p className="text-muted-foreground">
              Fill out the form below to apply for a position at KIYO.
              We&apos;ll get back to you soon.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 md:p-8 w-full flex flex-col items-center justify-center">
            <form onSubmit={handleSubmit} className="space-y-8 w-full">
              {/* Personal Information Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold border-b pb-2">
                  Personal Information
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4" />
                      Full Name *
                    </label>
                    <Input
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required
                    />
                    {errors.full_name && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.full_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4" />
                      Email *
                    </label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your.email@example.com"
                      required
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4" />
                      Phone Number *
                    </label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 9911991199"
                      required
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" />
                      Location *
                    </label>
                    <Input
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="City, State, Country"
                      required
                    />
                    {errors.location && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.location}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold border-b pb-2">
                  Professional Information
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4" />
                      Position Applying For *
                    </label>
                    <Input
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      placeholder="e.g. Content Writer"
                      required
                    />
                    {errors.position && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.position}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <PieChart className="h-4 w-4" />
                      Experience Level *
                    </label>
                    <select
                      name="experienceLevel"
                      value={formData.experienceLevel}
                      onChange={handleChange}
                      required
                      aria-label="Experience Level"
                      title="Experience Level"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select level</option>
                      <option value="entry">Entry Level</option>
                      <option value="mid">Mid Level</option>
                      <option value="senior">Senior Level</option>
                      <option value="executive">Executive</option>
                    </select>
                    {errors.experienceLevel && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.experienceLevel}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4" />
                      Years of Experience *
                    </label>
                    <Input
                      name="yearsOfExperience"
                      type="text"
                      value={formData.yearsOfExperience}
                      onChange={handleChange}
                      placeholder="e.g. 3"
                      required
                    />
                    {errors.yearsOfExperience && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.yearsOfExperience}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4" />
                      Expected Package (₹) LPA (Optional)
                    </label>
                    <Input
                      name="expectedPackage"
                      type="text"
                      value={formData.expectedPackage}
                      onChange={handleChange}
                      placeholder="e.g. 20,00,000 OR 20LPA"
                    />
                    {errors.expectedPackage && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.expectedPackage}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4" />
                      Current Employment Status (Optional)
                    </label>
                    <select
                      name="currentEmploymentStatus"
                      value={formData.currentEmploymentStatus}
                      onChange={handleChange}
                      aria-label="Current Employment Status"
                      title="Current Employment Status"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select status</option>
                      <option value="employed">Employed</option>
                      <option value="unemployed">Unemployed</option>
                      <option value="student">Student</option>
                      <option value="freelancer">Freelancer</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.currentEmploymentStatus && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.currentEmploymentStatus}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4" />
                      Notice Period (months) (Optional)
                    </label>
                    <Input
                      name="noticePeriod"
                      type="text"
                      value={formData.noticePeriod}
                      onChange={handleChange}
                      placeholder="e.g. 1"
                    />
                    {errors.noticePeriod && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.noticePeriod}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Links Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold border-b pb-2">
                  Links & Documents
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      Resume/CV URL *
                    </label>
                    <Input
                      name="resumeURL"
                      value={formData.resumeURL}
                      onChange={handleChange}
                      required
                      placeholder="https://drive.google.com/your-resume"
                    />
                    {errors.resumeURL && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.resumeURL}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <ExternalLink className="h-4 w-4" />
                      LinkedIn Profile *
                    </label>
                    <Input
                      name="linkedinURL"
                      value={formData.linkedinURL}
                      onChange={handleChange}
                      required
                      placeholder="https://linkedin.com/in/username"
                    />
                    {errors.linkedinURL && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.linkedinURL}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <Github className="h-4 w-4" />
                      GitHub Profile (Optional)
                    </label>
                    <Input
                      name="githubURL"
                      value={formData.githubURL}
                      onChange={handleChange}
                      placeholder="https://github.com/username"
                    />
                    {errors.githubURL && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.githubURL}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <LinkIcon className="h-4 w-4" />
                      Portfolio Website (Optional)
                    </label>
                    <Input
                      name="portfolioURL"
                      value={formData.portfolioURL}
                      onChange={handleChange}
                      placeholder="https://yourportfolio.com"
                    />
                    {errors.portfolioURL && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.portfolioURL}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <ExternalLink className="h-4 w-4" />
                      Work Showcase (Behance/Dribble/etc) (Optional but
                      Recommended)
                    </label>
                    <Input
                      name="showcaseURL"
                      value={formData.showcaseURL}
                      onChange={handleChange}
                      placeholder="https://behance.net/username"
                    />
                    {errors.showcaseURL && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.showcaseURL}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Information Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold border-b pb-2">
                  Detailed Information
                </h2>

                <div>
                  <label>Relevant Skills *</label>
                  <Textarea
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    placeholder="List your relevant skills (e.g., JavaScript, Content Writing, Graphic Design)"
                    required
                    rows={4}
                  />
                  {errors.skills && (
                    <p className="text-red-500 text-sm mt-1">{errors.skills}</p>
                  )}
                </div>

                <div>
                  <label>Cover Letter *</label>
                  <Textarea
                    name="coverLetter"
                    value={formData.coverLetter}
                    onChange={handleChange}
                    placeholder="Why are you interested in this position? What makes you a good fit?"
                    required
                    rows={8}
                  />
                  {errors.coverLetter && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.coverLetter}
                    </p>
                  )}
                </div>

                <div>
                  <label>Notable Achievements (Optional)</label>
                  <Textarea
                    name="achievements"
                    value={formData.achievements}
                    onChange={handleChange}
                    placeholder="Describe your professional achievements, awards, or recognitions"
                    rows={4}
                  />
                  {errors.achievements && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.achievements}
                    </p>
                  )}
                </div>

                <div>
                  <label>Additional Message (Optional)</label>
                  <Textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Anything else you'd like to share with us?"
                    rows={4}
                  />
                  {errors.message && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Legal Section */}
              <div className="space-y-6">
                <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <input
                    type="checkbox"
                    name="privacyConsent"
                    id="privacyConsent"
                    checked={formData.privacyConsent}
                    onChange={handleChange}
                    required
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                  />
                  <div className="space-y-1 leading-none">
                    <label htmlFor="privacyConsent">
                      I agree to the{" "}
                      <Link
                        href="/privacy"
                        className="text-primary hover:underline"
                      >
                        Privacy Policy
                      </Link>{" "}
                      and consent to my data being processed for recruitment
                      purposes.
                    </label>
                  </div>
                </div>
                {errors.privacyConsent && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.privacyConsent}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                {/* <p className="text-sm text-muted-foreground">
                  We&apos;ll review your application and get back to you within
                  5-7 business days.
                </p> */}
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 cursor-pointer"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

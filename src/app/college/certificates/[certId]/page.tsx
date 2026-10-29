"use client";
import {
  useParams,
  // useRouter
} from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Award,
  Download,
  ExternalLink,
  Calendar,
  ChevronLeft,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCertificatesStore } from "@/lib/store";
import useUserProfile from "@/hooks/useUserProfile";

export default function CertificatePage() {
  const params = useParams();
  // const router = useRouter();
  const certId = params.certId as string;
  const { getCertificate, generatePdf } = useCertificatesStore();

  const { mongoUser } = useUserProfile();
  const userName = mongoUser?.full_name || "Student";

  const certificate = getCertificate(certId);

  if (!certificate) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Certificate not found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            The certificate you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  // Generate credential ID from course name
  const generateCredentialId = (courseTitle: string): string => {
    const words = courseTitle.split(/\s+/).filter(w => w.length > 0);
    const abbrev = words
      .slice(0, 4)
      .map(word => {
        const upperChars = word.match(/[A-Z]/g) || [];
        if (upperChars.length >= 2) {
          return upperChars.slice(0, 3).join('');
        }
        return word.substring(0, 3).toUpperCase();
      })
      .join('-');
    
    const year = new Date().getFullYear();
    // Create a deterministic but unique suffix based on the course title
    let hash = 0;
    for (let i = 0; i < courseTitle.length; i++) {
      const char = courseTitle.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const deterministicSuffix = (Math.abs(hash) % 9000) + 1000;
    
    return `${abbrev}-${year}-${deterministicSuffix}`;
  };

  const currentDate = new Date().toLocaleDateString();
  const generatedCredentialId = generateCredentialId(certificate.title);

  const handleDownload = async () => {
    try {
      const pdfBlob = await generatePdf(certId, userName);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${certificate.title
        .replace(/\s+/g, "-")
        .toLowerCase()}-certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${certificate.title} Certificate`,
          text: `I earned a certificate in ${certificate.title} from ${certificate.issuer}!`,
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/college/certificates" className="hover:text-slate-700">
            <ChevronLeft className="h-4 w-4 inline mr-1" />
            Back to Certificates
          </Link>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {certificate.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {certificate.description}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleShare} variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button onClick={handleDownload} size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Certificate Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-2">
          <CardContent className="p-12 text-center space-y-8">
            <div className="space-y-4">
              <Award className="h-16 w-16 text-yellow-500 mx-auto" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Certificate of Completion
              </h2>
            </div>

            <div className="space-y-2">
              <p className="text-lg text-slate-600 dark:text-slate-400">
                This certifies that
              </p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {userName}
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                has successfully completed
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {certificate.title}
              </h4>
              <p className="text-slate-600 dark:text-slate-400">
                {certificate.description}
              </p>
            </div>

            <div className="flex justify-between items-center pt-8 border-t">
              <div className="text-left">
                <p className="text-sm text-slate-500">Issued by</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {certificate.issuer}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500">Date Issued</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {currentDate}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Credential ID</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {generatedCredentialId}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Certificate Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Certificate Details</CardTitle>
            <CardDescription>
              Information about this certification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Issuer
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    {certificate.issuer}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Issue Date
                  </h4>
                  <div className="flex items-center text-slate-600 dark:text-slate-400">
                    <Calendar className="mr-2 h-4 w-4" />
                    {currentDate}
                  </div>
                </div>
                {certificate.expiresAt && (
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                      Expiration Date
                    </h4>
                    <div className="flex items-center text-slate-600 dark:text-slate-400">
                      <Calendar className="mr-2 h-4 w-4" />
                      {new Date(certificate.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Credential ID
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 font-mono text-sm">
                    {generatedCredentialId}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Verification
                  </h4>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={certificate.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Verify Certificate
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                Skills Demonstrated
              </h4>
              <div className="flex flex-wrap gap-2">
                {certificate.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {certificate.pathId && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                    Related Learning Path
                  </h4>
                  <Button asChild variant="outline">
                    <Link href={`/college/learning/${certificate.pathId}`}>
                      View Learning Path
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

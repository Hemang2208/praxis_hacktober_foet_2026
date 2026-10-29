"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Award,
  Download,
  ExternalLink,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCertificatesStore } from "@/lib/store";
import useUserProfile from "@/hooks/useUserProfile";

import { useState } from "react";

export default function CertificatesPage() {
  const {
    // certificates,
    getEarnedCertificates,
    getInProgressCertificates,
    generatePdf,
  } = useCertificatesStore();

  const { mongoUser } = useUserProfile();
  const userName = mongoUser?.full_name || "Student";

  const earnedCertificates = getEarnedCertificates();
  const inProgressCertificates = getInProgressCertificates();

  // Mock pending certificates for review
  const [pendingCertificates, setPendingCertificates] = useState([
    {
      id: "cert123",
      title: "AI Fundamentals",
      issuer: "Praxis College",
      description: "Certificate for completion of AI Fundamentals.",
      studentName: "Amit Sharma",
      skills: ["Python", "ML"],
      issuedAt: new Date().toISOString(),
      credentialId: "PRAXIS-2026-001",
      verificationUrl: "#",
    },
  ]);

  const handleApprove = async (certId: string) => {
    // Call backend to mark certificate as approved
    setPendingCertificates((prev) => prev.filter((c) => c.id !== certId));
    // Optionally trigger certificate issuance
  };

  const handleDownload = async (certId: string) => {
    try {
      const pdfBlob = await generatePdf(certId, userName);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${certId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Certificates
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track your achievements and download your certificates
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earned</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {earnedCertificates.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Certificates earned
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inProgressCertificates.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Certificates in progress
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skills</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  [
                    ...new Set(
                      earnedCertificates.flatMap((cert) => cert.skills)
                    ),
                  ].length
                }
              </div>
              <p className="text-xs text-muted-foreground">Verified skills</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Certificate Review & Approval Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="text-xl font-bold mb-4">Pending Certificate Approvals</h2>
        {pendingCertificates.length === 0 ? (
          <div className="text-muted-foreground mb-6">No certificates pending approval.</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {pendingCertificates.map((certificate) => (
              <Card key={certificate.id} className="border-2 border-yellow-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{certificate.title}</CardTitle>
                      <CardDescription className="mt-1">{certificate.issuer}</CardDescription>
                      <div className="mt-2 text-sm text-slate-500">Student: {certificate.studentName}</div>
                    </div>
                    <Award className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{certificate.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {certificate.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="default" size="sm" onClick={() => handleApprove(certificate.id)}>Approve & Issue</Button>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Credential ID: {certificate.credentialId}</span>
                      <Button asChild variant="ghost" size="sm" className="h-auto p-0">
                        <a href={certificate.verificationUrl} target="_blank" rel="noopener noreferrer" title="Verify certificate">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
      {/* Certificates Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Tabs defaultValue="earned" className="space-y-6">
          <TabsList>
            <TabsTrigger value="earned">
              Earned ({earnedCertificates.length})
            </TabsTrigger>
            <TabsTrigger value="in-progress">
              In Progress ({inProgressCertificates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earned" className="space-y-6">
            {earnedCertificates.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No certificates yet
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Complete learning paths to earn your first certificate.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {earnedCertificates.map((certificate, index) => (
                  <motion.div
                    key={certificate.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="group hover:shadow-lg transition-shadow duration-300">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">
                              {certificate.title}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {certificate.issuer}
                            </CardDescription>
                          </div>
                          <Award className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {certificate.description}
                        </p>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-slate-500">
                            <Calendar className="mr-1 h-3 w-3" />
                            {new Date(
                              certificate.issuedAt
                            ).toLocaleDateString()}
                          </div>
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-700 border-green-200"
                          >
                            Verified
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {certificate.skills.slice(0, 3).map((skill) => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {certificate.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{certificate.skills.length - 3}
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button asChild size="sm" className="flex-1">
                            <Link
                              href={`/college/certificates/${certificate.id}`}
                            >
                              <Eye className="mr-2 h-3 w-3" />
                              View
                            </Link>
                          </Button>
                          <Button
                            onClick={() => handleDownload(certificate.id)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Download className="mr-2 h-3 w-3" />
                            Download
                          </Button>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>
                              Credential ID: {certificate.credentialId}
                            </span>
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0"
                            >
                              <a
                                href={certificate.verificationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Verify certificate on external site"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-6">
            {inProgressCertificates.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No certificates in progress
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Start a learning path to begin working towards a certificate.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {inProgressCertificates.map((certificate, index) => (
                  <motion.div
                    key={certificate.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="group hover:shadow-lg transition-shadow duration-300">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">
                              {certificate.title}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {certificate.issuer}
                            </CardDescription>
                          </div>
                          <Clock className="h-6 w-6 text-blue-500 flex-shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {certificate.description}
                        </p>

                        <Badge
                          variant="outline"
                          className="bg-blue-100 text-blue-700 border-blue-200"
                        >
                          In Progress
                        </Badge>

                        <div className="flex flex-wrap gap-1">
                          {certificate.skills.slice(0, 3).map((skill) => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {certificate.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{certificate.skills.length - 3}
                            </Badge>
                          )}
                        </div>

                        {certificate.pathId && (
                          <Button asChild className="w-full">
                            <Link
                              href={`/college/learning/${certificate.pathId}`}
                            >
                              Continue Learning Path
                            </Link>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

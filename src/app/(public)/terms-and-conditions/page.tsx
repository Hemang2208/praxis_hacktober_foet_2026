"use client";

import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Shield,
  Users,
  AlertCircle,
  Mail,
  Scale,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemFadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function TermsAndConditionsPage() {
  return (
    <div className="bg-muted/30 text-foreground min-h-screen">
      {/* Hero Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={itemFadeIn}>
            <Badge
              variant="secondary"
              className="inline-flex items-center bg-purple-50 text-purple-600 rounded-full px-4 py-2 text-sm font-medium mb-8"
            >
              <FileText className="w-4 h-4 mr-2" />
              Terms and Conditions
            </Badge>
          </motion.div>

          <motion.h1
            variants={itemFadeIn}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
          >
            Terms and Conditions
          </motion.h1>

          <motion.p
            variants={itemFadeIn}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto"
          >
            Clear guidelines for a fair and transparent partnership.
            Understanding your rights and responsibilities while using
            Kiyo&apos;s platform.
          </motion.p>
        </div>
      </motion.section>

      {/* Content Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeIn}
        className="pb-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div variants={staggerContainer} className="grid gap-8">
            {/* Introduction */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardContent className="p-8">
                  <p className="text-lg leading-relaxed text-muted-foreground">
                    Welcome to Kiyo. By accessing or using our enterprise
                    project management platform, you agree to be bound by these
                    Terms and Conditions. These terms ensure a fair and
                    productive environment for all users while protecting both
                    your interests and ours.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Use of Services */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Users className="w-6 h-6" />
                    </div>
                    Use of Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Responsible Usage:
                        </strong>{" "}
                        Use our services responsibly and in accordance with all
                        applicable laws, regulations, and industry standards
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Service Integrity:
                        </strong>{" "}
                        Do not misuse, disrupt, or attempt to gain unauthorized
                        access to our services or systems
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Professional Conduct:
                        </strong>{" "}
                        Maintain professional standards in all interactions
                        within the platform
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Account Responsibilities */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                      <Shield className="w-6 h-6" />
                    </div>
                    Account & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Account Security:
                        </strong>{" "}
                        You are responsible for maintaining the confidentiality
                        and security of your account credentials
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Unauthorized Access:
                        </strong>{" "}
                        Notify us immediately of any unauthorized use of your
                        account or security breaches
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Account Accuracy:
                        </strong>{" "}
                        Provide accurate and up-to-date information for your
                        account profile
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Intellectual Property */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Scale className="w-6 h-6" />
                    </div>
                    Intellectual Property
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed">
                    All content, features, and functionality of Kiyo are owned
                    by us and are protected by copyright, trademark, and other
                    intellectual property laws. You retain ownership of the
                    content you create using our platform, while granting us
                    necessary licenses to provide our services.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Limitation of Liability */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    Limitation of Liability
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Kiyo provides services on an &quot;as is&quot; basis. While
                    we strive for excellence, we cannot guarantee uninterrupted
                    service or complete error-free operation. Our liability is
                    limited to the extent permitted by applicable law.
                  </p>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">
                        Service Availability:
                      </strong>{" "}
                      We aim for 99.9% uptime but cannot guarantee continuous
                      availability due to maintenance, updates, or unforeseen
                      circumstances.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Data & Privacy */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold">
                    Data Protection & Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed">
                    Your data privacy is paramount. We handle your information
                    according to our Privacy Policy and applicable data
                    protection regulations including GDPR and CCPA. You maintain
                    control over your data and can request access, modification,
                    or deletion at any time.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Termination */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold">
                    Service Termination
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed">
                    Either party may terminate this agreement with appropriate
                    notice. Upon termination, you will retain access to your
                    data for a reasonable period to allow for data export and
                    transition to alternative solutions.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Section */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <Mail className="w-6 h-6" />
                    </div>
                    Questions About These Terms?
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    If you have any questions about these Terms and Conditions
                    or need clarification on any point, our legal team is ready
                    to assist you.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-primary" />
                      <span className="text-foreground font-medium">
                        support@kiyoai.in
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Last Updated:</strong>{" "}
                      These terms were last updated on October 2025. We may
                      update these terms periodically and will notify users of
                      significant changes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}

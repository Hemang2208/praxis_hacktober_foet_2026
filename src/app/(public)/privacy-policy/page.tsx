"use client";

import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  Eye,
  Lock,
  UserCheck,
  Mail,
  Database,
  Settings,
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

export default function PrivacyPolicyPage() {
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
              className="inline-flex items-center bg-green-50 text-green-600 rounded-full px-4 py-2 text-sm font-medium mb-8"
            >
              <Shield className="w-4 h-4 mr-2" />
              Privacy Policy
            </Badge>
          </motion.div>

          <motion.h1
            variants={itemFadeIn}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
          >
            Privacy Policy
          </motion.h1>

          <motion.p
            variants={itemFadeIn}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto"
          >
            Your privacy is our priority. Learn how we collect, use, and protect
            your information with complete transparency and security.
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
                    At Praxis, your privacy is fundamental to our mission. This
                    Privacy Policy explains how we collect, use, protect, and
                    handle your information when you use our enterprise project
                    management platform. We are committed to transparency and
                    giving you control over your data.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Information We Collect */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Database className="w-6 h-6" />
                    </div>
                    Information We Collect
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Personal Information:
                        </strong>{" "}
                        Name, email address, professional details, and contact
                        information you provide during registration and profile
                        setup
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Usage Analytics:
                        </strong>{" "}
                        Platform interactions, feature usage patterns,
                        performance metrics, and system logs for service
                        improvement
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Project Data:
                        </strong>{" "}
                        Content, files, and collaboration data you create or
                        share within the platform
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Technical Information:
                        </strong>{" "}
                        Device information, IP addresses, browser type, and
                        connection details for security and optimization
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* How We Use Your Information */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                      <Eye className="w-6 h-6" />
                    </div>
                    How We Use Your Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Service Delivery:
                        </strong>{" "}
                        To provide, maintain, and improve our project management
                        platform and its features
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Communication:
                        </strong>{" "}
                        To send important updates, support responses, and
                        relevant platform notifications
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Security & Compliance:
                        </strong>{" "}
                        To ensure platform security, prevent fraud, and comply
                        with legal obligations
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Analytics & Improvement:
                        </strong>{" "}
                        To analyze usage patterns and continuously enhance user
                        experience and platform performance
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Data Protection */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Lock className="w-6 h-6" />
                    </div>
                    Data Protection & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We implement industry-leading security measures to protect
                    your information. This includes encryption at rest and in
                    transit, regular security audits, access controls, and
                    compliance with international data protection standards
                    including GDPR, CCPA, and SOC 2.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">
                        Encryption
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        AES-256 encryption for data at rest and TLS 1.3 for data
                        in transit
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">
                        Access Control
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Role-based access with multi-factor authentication and
                        regular audits
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Your Rights & Choices */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                      <Settings className="w-6 h-6" />
                    </div>
                    Your Rights & Control
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Access & Portability:
                        </strong>{" "}
                        Request access to your personal data and receive it in a
                        machine-readable format
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Correction & Updates:
                        </strong>{" "}
                        Update or correct your personal information at any time
                        through your account settings
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Deletion Rights:
                        </strong>{" "}
                        Request deletion of your personal data, subject to legal
                        and contractual obligations
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Communication Preferences:
                        </strong>{" "}
                        Control the types of communications you receive from us
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Data Sharing */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    Data Sharing & Third Parties
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We do not sell your personal information. We may share data
                    only in specific circumstances: with trusted service
                    providers who help us operate our platform (under strict
                    data processing agreements), when required by law, or with
                    your explicit consent.
                  </p>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">
                        Third-Party Services:
                      </strong>{" "}
                      We work with carefully vetted partners for infrastructure,
                      analytics, and support services, all bound by strict
                      privacy agreements.
                    </p>
                  </div>
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
                    Privacy Questions & Data Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Have questions about our privacy practices or want to
                    exercise your data rights? Our privacy team is here to help
                    you understand and control your data.
                  </p>
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-primary" />
                      <span className="text-foreground font-medium">
                        support@kiyoai.in
                      </span>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">
                        Data Protection Officer
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        For formal privacy inquiries and data protection matters
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">
                        Response Time
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        We respond to privacy requests within 30 days
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Last Updated:</strong>{" "}
                      This Privacy Policy was last updated on October 2025. We
                      will notify you of any material changes via email or
                      platform notification.
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

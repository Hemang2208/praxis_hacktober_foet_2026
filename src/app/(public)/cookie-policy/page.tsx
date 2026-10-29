"use client";

import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Cookie, Settings, Mail } from "lucide-react";

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

export default function CookiePolicyPage() {
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
              className="inline-flex items-center bg-blue-50 text-blue-600 rounded-full px-4 py-2 text-sm font-medium mb-8"
            >
              <Cookie className="w-4 h-4 mr-2" />
              Cookie Policy
            </Badge>
          </motion.div>

          <motion.h1
            variants={itemFadeIn}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
          >
            Cookie Policy
          </motion.h1>

          <motion.p
            variants={itemFadeIn}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto"
          >
            Transparent practices for a better web experience. Learn how Praxis
            uses cookies to enhance your journey with our platform.
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
                    Praxis uses cookies to enhance your experience on our website.
                    This Cookie Policy explains what cookies are, how we use
                    them, and your choices regarding cookies. We believe in
                    transparency and want you to understand exactly how we
                    protect and improve your experience.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* What Are Cookies */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Cookie className="w-6 h-6" />
                    </div>
                    What Are Cookies?
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed">
                    Cookies are small text files stored on your device by your
                    browser when you visit our website. They help us remember
                    your preferences, improve site functionality, and provide
                    you with a personalized experience tailored to your needs.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* How We Use Cookies */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                      <Shield className="w-6 h-6" />
                    </div>
                    How We Use Cookies
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Functionality & Preferences:
                        </strong>{" "}
                        To remember your settings, language preferences, and
                        customize your dashboard experience
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Analytics & Performance:
                        </strong>{" "}
                        To analyze site usage patterns, identify popular
                        features, and continuously improve our services
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">
                          Security & Authentication:
                        </strong>{" "}
                        For secure login sessions, fraud prevention, and
                        protecting your account integrity
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Your Choices */}
            <motion.div variants={itemFadeIn}>
              <Card className="border-0 shadow-lg bg-background/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Settings className="w-6 h-6" />
                    </div>
                    Your Choices & Control
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed">
                    You have complete control over cookies. You can manage or
                    disable cookies in your browser settings at any time. Please
                    note that disabling certain cookies may limit some features
                    of our platform, but core functionality will remain
                    accessible.
                  </p>
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">
                        Browser Settings:
                      </strong>{" "}
                      Most browsers allow you to view, manage, and delete
                      cookies through their settings menu.
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
                    Questions? We&apos;re Here to Help
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    If you have any questions about our Cookie Policy or how we
                    handle your data, our team is ready to assist you.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-primary" />
                      <span className="text-foreground font-medium">
                        support@kiyoai.in
                      </span>
                    </div>
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

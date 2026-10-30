"use client";

import React, { useEffect, useRef } from "react";
import {
  Bot,
  Award,
  Code,
  GitBranch,
  ArrowRight,
  ArrowUp,
  Target,
  Brain,
  Building2,
  BarChart3,
  Github,
  Sparkles,
  MessageSquare,
  Calendar,
  Monitor,
  Rocket,
  CheckCircle2,
  Shield,
  Database,
  GraduationCap,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Typed from "typed.js";
import { motion, Variants } from "framer-motion";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemFadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
};

const slideInRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
};

const LandingPage = () => {
  const [, setIsVisible] = React.useState({});
  const el = useRef<HTMLSpanElement | null>(null);
  const typed = useRef<Typed | null>(null);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll animation hooks
  // const { scrollYProgress } = useScroll();
  // const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.2]);
  // console.log(isVisible);

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll("[id]").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Updated typing animation for enterprise focus
  useEffect(() => {
    if (el.current) {
      typed.current = new Typed(el.current, {
        strings: [
          "Project Management",
          "Talent Development",
          "Team Collaboration",
        ],
        typeSpeed: 50,
        backSpeed: 25,
        backDelay: 1000,
        loop: true,
      });
    }

    return () => {
      typed.current?.destroy();
    };
  }, []);

  const features = [
    {
      title: "Autonomous Project Management",
      desc: "Enterprise-grade AI that manages multi-team projects, allocates resources, and ensures delivery milestones at scale.",
      icon: Bot,
      badge: "Core Platform",
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "GitHub Enterprise Integration",
      desc: "Seamless integration with GitHub Enterprise for automated code reviews, compliance tracking, and team performance analytics.",
      icon: Github,
      badge: "DevOps Ready",
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Industry-Grade Project Templates",
      desc: "Pre-built project frameworks sourced from Fortune 500 companies, enabling rapid deployment and standardized workflows.",
      icon: Monitor,
      badge: "Enterprise Templates",
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Intelligent Talent Development",
      desc: "AI-powered skill assessment and training pipelines that prepare your workforce for complex project requirements.",
      icon: Brain,
      badge: "Talent Pipeline",
      color: "bg-yellow-50 text-yellow-600",
    },
    {
      title: "Enterprise Analytics & Reporting",
      desc: "Comprehensive dashboards with advanced metrics for project ROI, team productivity, and predictive resource planning.",
      icon: BarChart3,
      badge: "Business Intelligence",
      color: "bg-red-50 text-red-600",
    },
    {
      title: "Compliance & Certification Management",
      desc: "Automated compliance tracking and skill certification management integrated with your existing HR and training systems.",
      icon: Award,
      badge: "Compliance Ready",
      color: "bg-indigo-50 text-indigo-600",
    },
  ];

  const workflow = [
    {
      step: 1,
      title: "Enterprise Assessment & Setup",
      desc: "Our AI analyzes your organization's project requirements, team capabilities, and creates customized workflows for maximum efficiency.",
      icon: Target,
      color: "bg-blue-50 text-blue-600",
    },
    {
      step: 2,
      title: "Intelligent Project Orchestration",
      desc: "Deploy AI-managed projects with automated task allocation, resource optimization, and real-time progress monitoring across teams.",
      icon: Calendar,
      color: "bg-green-50 text-green-600",
    },
    {
      step: 3,
      title: "Scale Team Collaboration",
      desc: "Enable seamless collaboration with integrated development environments, automated workflows, and AI-powered code reviews.",
      icon: GitBranch,
      color: "bg-purple-50 text-purple-600",
    },
    {
      step: 4,
      title: "Drive Measurable Results",
      desc: "Achieve project delivery excellence with predictive analytics, automated reporting, and continuous improvement recommendations.",
      icon: Rocket,
      color: "bg-yellow-50 text-yellow-600",
    },
  ];

  const companies = ["Matrix", "Vivax", "Grayy", "IRL Social", "FOMO"];

  const stats = [
    {
      value: "40%",
      label: "Faster Project Delivery",
      icon: Zap,
      color: "bg-blue-50 text-blue-600",
    },
    {
      value: "50%",
      label: "Reduction in Manual Tasks",
      icon: Bot,
      color: "bg-green-50 text-green-600",
    },
    {
      value: "90%",
      label: "Resource Optimization",
      icon: BarChart3,
      color: "bg-purple-50 text-purple-600",
    },
    {
      value: "60%",
      label: "Better Talent Development",
      icon: Users,
      color: "bg-yellow-50 text-yellow-600",
    },
  ];

  return (
    <div className="bg-muted/30 text-foreground">
      {/* Hero Section - Enterprise Focused */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" variants={staggerContainer}>
            {/* Badge */}
            <motion.div
              variants={itemFadeIn}
              className="inline-flex items-center bg-gray-800 text-white rounded-full px-4 py-2 text-sm font-medium mb-8 border border-gray-700"
            >
              <Sparkles className="w-4 h-4 mr-2 text-white" />
              Enterprise AI <span ref={el} className="px-1" /> Platform
            </motion.div>

            {/* Main Headline - Enterprise Focused */}
            <motion.h1
              variants={itemFadeIn}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
            >
              Scale Projects with
              <br />
              <span className="text-black bg-gradient-to-r from-white to-gray-300 bg-clip-text">
                AI-Powered Precision
              </span>
            </motion.h1>

            {/* Subheadline - Enterprise Value Prop */}
            <motion.p
              variants={itemFadeIn}
              className="max-w-3xl mx-auto text-xl text-gray-800 mb-10 leading-relaxed"
            >
              Transform your enterprise project management with AI-driven
              automation, intelligent resource allocation, and integrated talent
              development that delivers measurable results at scale.
            </motion.p>

            {/* CTA Buttons - Enterprise Focused */}
            <motion.div
              variants={itemFadeIn}
              className="flex flex-col items-center sm:flex-col md:flex-row gap-6 justify-center mb-12"
            >
              <Link href="/login" className="w-full md:w-fit">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group cursor-pointer w-full md:w-fit bg-gray-800 text-white font-semibold py-4 px-8 rounded-xl hover:bg-gray-700 transition-all duration-300 flex items-center justify-center"
                >
                  Start Enterprise Trial
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>

              <Link href="/login" className="w-full md:w-fit">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group cursor-pointer w-full md:w-fit border-2 border-gray-700 text-gray-800 font-semibold py-4 px-8 rounded-xl hover:border-gray-500 transition-all duration-300 flex items-center justify-center"
                >
                  <Calendar className="mr-2 w-5 h-5" />
                  Schedule Demo
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

        </div>

        {/* Trusted by section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="flex flex-wrap justify-center gap-10 opacity-70 mt-20"
        >
          <div className="text-muted-foreground font-medium text-sm mb-4">
            Trusted by leading organizations
          </div>
        </motion.div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          transition={{ delayChildren: 1.2, staggerChildren: 0.1 }}
          className="flex flex-wrap justify-center gap-10 opacity-70"
        >
          {companies.map((company, idx: number) => (
            <motion.div
              key={idx}
              variants={itemFadeIn}
              className="text-muted-foreground font-semibold text-sm"
            >
              {company}
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Why us Section */}
      <motion.section
        id="whyus"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.6,
              ease: [0.43, 0.13, 0.23, 0.96], // Use array for easing
            },
          },
        }}
        className="py-16 bg-background"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.6,
                  ease: [0.43, 0.13, 0.23, 0.96], // Use array for easing
                },
              },
            }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              Unlock Your Organization&apos;s Potential
            </h2>
            <p className="text-xl text-muted-foreground">
              See what&apos;s possible when AI manages your projects
              intelligently
            </p>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {stats.map((stat, idx: number) => (
              <motion.div
                key={idx}
                variants={scaleIn}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="text-center group cursor-pointer w-full"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className={`inline-flex items-center justify-center w-16 h-16 ${stat.color} rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <stat.icon className="w-8 h-8" />
                </motion.div>
                <motion.div
                  variants={itemFadeIn}
                  className="text-3xl lg:text-4xl font-bold text-foreground mb-2"
                >
                  Up to {stat.value}
                </motion.div>
                <motion.div
                  variants={itemFadeIn}
                  className="text-muted-foreground font-medium"
                >
                  {stat.label}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section - Reframed for Enterprise */}
      <motion.section
        id="features"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeIn}
        className="py-20 bg-muted/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeIn} className="text-center mb-16">
            <motion.div
              variants={scaleIn}
              className="inline-flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 rounded-full px-4 py-2 text-sm font-medium mb-4 border border-blue-100"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Enterprise Capabilities
            </motion.div>
            <motion.h2
              variants={itemFadeIn}
              className="text-3xl lg:text-4xl font-bold mb-4"
            >
              Why Enterprises Choose Praxis
            </motion.h2>
            <motion.p
              variants={itemFadeIn}
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              Our comprehensive AI platform delivers enterprise-grade project
              management with integrated talent development capabilities.
            </motion.p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="grid lg:grid-cols-3 gap-8"
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={scaleIn}
                whileHover={{
                  y: -10,
                  boxShadow:
                    "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                }}
                className="group relative bg-background rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-border hover:border-primary/30"
              >
                <div className="flex items-center justify-between mb-6">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className={`inline-flex items-center justify-center w-16 h-16 ${feature.color} rounded-2xl group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-8 h-8" />
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 * idx, duration: 0.5 }}
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium"
                  >
                    {feature.badge}
                  </motion.span>
                </div>
                <motion.h3
                  variants={itemFadeIn}
                  className="text-2xl font-bold mb-4 text-foreground"
                >
                  {feature.title}
                </motion.h3>
                <motion.p
                  variants={itemFadeIn}
                  className="text-muted-foreground leading-relaxed"
                >
                  {feature.desc}
                </motion.p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works - Enterprise Workflow */}
      <motion.section
        id="workflow"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.6,
              ease: [0.43, 0.13, 0.23, 0.96],
            },
          },
        }}
        className="py-20 bg-background"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.6,
                  ease: [0.43, 0.13, 0.23, 0.96],
                },
              },
            }}
            className="text-center mb-16"
          >
            <motion.div
              variants={scaleIn}
              className="inline-flex items-center bg-gradient-to-r from-green-50 to-emerald-50 text-green-600 rounded-full px-4 py-2 text-sm font-medium mb-4 border border-green-100"
            >
              <Target className="w-4 h-4 mr-2" />
              Implementation Process
            </motion.div>
            <motion.h2
              variants={itemFadeIn}
              className="text-3xl lg:text-4xl font-bold mb-4"
            >
              Enterprise Deployment in 4 Strategic Steps
            </motion.h2>
            <motion.p
              variants={itemFadeIn}
              className="text-xl text-muted-foreground"
            >
              From assessment to scale - transform your organization&apos;s
              project delivery
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={staggerContainer} className="space-y-8">
              {workflow.map((item, idx) => (
                <motion.div
                  key={idx}
                  variants={slideInLeft}
                  custom={idx}
                  whileHover={{ x: 10 }}
                  className="flex items-start gap-6 group cursor-pointer w-full hover:translate-x-2 transition-transform duration-300"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className={`flex-shrink-0 w-14 h-14 ${item.color} rounded-xl flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform shadow-lg`}
                  >
                    {item.step}
                  </motion.div>
                  <div className="flex-1">
                    <motion.h3
                      variants={itemFadeIn}
                      className="text-xl font-bold mb-2 text-foreground"
                    >
                      {item.title}
                    </motion.h3>
                    <motion.p
                      variants={itemFadeIn}
                      className="text-muted-foreground leading-relaxed"
                    >
                      {item.desc}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={slideInRight} className="relative">
              <motion.div
                whileHover={{
                  y: -5,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}
                className="bg-primary text-primary-foreground rounded-3xl p-8 shadow-2xl"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Code className="w-8 h-8" />
                      <span className="text-xl font-semibold">
                        Enterprise Dashboard
                      </span>
                    </div>
                    <div className="bg-primary-foreground/20 rounded-full px-3 py-1 text-sm">
                      Live Production
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-primary-foreground/10 rounded-xl p-4"
                    >
                      <div className="text-2xl font-bold">847</div>
                      <div className="text-sm opacity-90">Active Projects</div>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-primary-foreground/10 rounded-xl p-4"
                    >
                      <div className="text-2xl font-bold">2.3M</div>
                      <div className="text-sm opacity-90">Lines Managed</div>
                    </motion.div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Enterprise Efficiency</span>
                      <span>94%</span>
                    </div>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "94%" }}
                      transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
                      className="w-full bg-primary-foreground/20 rounded-full h-3"
                    >
                      <div className="bg-primary-foreground h-3 rounded-full w-[94%] shadow-sm"></div>
                    </motion.div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="flex items-center gap-2 text-sm bg-primary-foreground/10 rounded-lg p-3"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>AI Optimization: 40% faster delivery achieved</span>
                  </motion.div>
                </div>
              </motion.div>

              {/* Floating Elements */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="absolute -top-4 -right-4 bg-primary/80 text-primary-foreground rounded-full p-3 shadow-lg"
              >
                <Github className="w-6 h-6" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="absolute -bottom-4 -left-4 bg-primary/80 text-primary-foreground rounded-full p-3 shadow-lg"
              >
                <Award className="w-6 h-6" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Enterprise Security Section */}
      <motion.section
        id="security"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.6,
              ease: [0.43, 0.13, 0.23, 0.96],
            },
          },
        }}
        className="py-20 bg-muted/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeIn} className="text-center mb-16">
            <motion.div
              variants={scaleIn}
              className="inline-flex items-center bg-gradient-to-r from-red-50 to-orange-50 text-red-600 rounded-full px-4 py-2 text-sm font-medium mb-4 border border-red-100"
            >
              <Shield className="w-4 h-4 mr-2" />
              Enterprise-Grade Security
            </motion.div>
            <motion.h2
              variants={itemFadeIn}
              className="text-3xl lg:text-4xl font-bold mb-4"
            >
              Built for Enterprise Security & Compliance
            </motion.h2>
            <motion.p
              variants={itemFadeIn}
              className="text-xl text-muted-foreground max-w-3xl mx-auto"
            >
              Industry-leading security standards and compliance frameworks that
              Fortune 500 companies trust for their mission-critical projects.
            </motion.p>
          </motion.div>

          <motion.div
            variants={scaleIn}
            whileHover={{ y: -5 }}
            className="bg-background rounded-2xl p-8 border border-border shadow-lg"
          >
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <motion.div variants={slideInLeft}>
                <motion.h3
                  variants={itemFadeIn}
                  className="text-2xl font-bold mb-4 text-foreground"
                >
                  Enterprise Security Features
                </motion.h3>
                <motion.div variants={staggerContainer} className="space-y-4">
                  {[
                    "SOC 2 Type II Compliance",
                    "Enterprise SSO & RBAC Integration",
                    "Advanced Audit Logs & Compliance Reporting",
                    "Data Residency & Geographic Controls",
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      variants={itemFadeIn}
                      className="flex items-center gap-3"
                    >
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        className="w-6 h-6 bg-green-50 text-green-600 rounded-full flex items-center justify-center"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </motion.div>
                      <span className="text-foreground">{item}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
              <motion.div
                variants={slideInRight}
                className="bg-primary/5 rounded-xl p-6 border border-primary/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Database className="w-8 h-8 text-primary" />
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">
                      Security Operations Center
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      24/7 monitoring & threat detection
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-background rounded-lg p-3 border"
                  >
                    <div className="text-lg font-bold text-green-600">
                      99.9%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Uptime SLA
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-background rounded-lg p-3 border"
                  >
                    <div className="text-lg font-bold text-blue-600">
                      AES-256
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Encryption
                    </div>
                  </motion.div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="mt-4 p-3 bg-background rounded-lg border"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-foreground">
                      All enterprise systems secured & monitored.
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Use Cases Section - Reordered by Revenue Priority */}
      <motion.section
        id="use-cases"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeIn}
        className="py-20 bg-background"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeIn} className="text-center mb-16">
            <motion.div
              variants={scaleIn}
              className="inline-flex items-center bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 rounded-full px-4 py-2 text-sm font-medium mb-4 border border-indigo-100"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Enterprise Solutions
            </motion.div>
            <motion.h2
              variants={itemFadeIn}
              className="text-3xl lg:text-4xl font-bold mb-4"
            >
              Scalable Solutions Across Organizations
            </motion.h2>
            <motion.p
              variants={itemFadeIn}
              className="text-xl text-muted-foreground max-w-3xl mx-auto"
            >
              From Fortune 500 enterprises to leading educational institutions,
              our platform adapts to organizational needs while maintaining
              consistency.
            </motion.p>
          </motion.div>

          {/* Primary Enterprise Use Case */}
          <motion.div variants={scaleIn} className="mb-8">
            <motion.div
              whileHover={{ y: -10 }}
              className="group relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl border-2 border-blue-200"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl group-hover:scale-110 transition-transform duration-300"
                  >
                    <Building2 className="w-8 h-8" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-900">
                      Enterprise Organizations
                    </h3>
                  </div>
                </div>
              </div>
              <p className="text-blue-800 leading-relaxed mb-6 text-lg">
                Transform complex multi-team projects with AI-driven
                orchestration, automated resource allocation, and integrated
                talent pipeline development that scales across global enterprise
                operations.
              </p>
              <motion.div
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {[
                  "Multi-team project orchestration at scale",
                  "Enterprise security & compliance framework",
                  "Advanced analytics & predictive insights",
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    variants={itemFadeIn}
                    className="flex items-center gap-2 text-sm text-blue-800"
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Secondary Use Cases */}
          <motion.div
            variants={staggerContainer}
            className="flex flex-col lg:flex-row justify-between gap-8"
          >
            <div className="flex flex-col lg:flex-row justify-between gap-10">
              {/* Colleges / Institutions */}
              <motion.div
                variants={slideInLeft}
                whileHover={{ y: -10 }}
                className="group relative bg-gray-50 border rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl flex-1"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="flex items-center justify-center w-16 h-16 bg-purple-50 text-white rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300"
                >
                  <GraduationCap className="w-8 h-8 text-purple-600" />
                </motion.div>
                <h3 className="text-xl font-bold mb-4 text-black">
                  Educational Institutions
                </h3>
                <p className="text-black leading-relaxed mb-6">
                  Deploy enterprise-grade project management for academic
                  research, student training programs, and institutional
                  collaboration initiatives.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-black">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Research project management & collaboration</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-black"></div>
                </div>
              </motion.div>

              {/* Students - Positioned as End Users */}
              <motion.div
                variants={slideInRight}
                whileHover={{ y: -10 }}
                className="group relative bg-gray-50 border rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl flex-1"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="flex items-center justify-center w-16 h-16 bg-yellow-50 text-white rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300"
                >
                  <Users className="w-8 h-8 text-yellow-600" />
                </motion.div>
                <h3 className="text-xl font-bold mb-4 text-black">
                  Talent Development Programs
                </h3>
                <p className="text-black leading-relaxed mb-6">
                  Comprehensive talent training and assessment through realistic
                  project simulations that prepare workforce for enterprise
                  project requirements.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-black">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>AI-powered skill development pathways</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-black">
                    <span className="text-yellow-600 font-medium">
                      Integrated capability
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Enterprise Comparison Table */}
          <motion.div variants={fadeIn} className="mt-16">
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-background rounded-2xl p-8 border border-border shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-8 text-center text-foreground">
                Enterprise Feature Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-4 px-4 text-foreground font-semibold">
                        Capability
                      </th>
                      <th className="text-center py-4 px-4 text-blue-600 font-semibold">
                        Enterprise
                      </th>
                      <th className="text-center py-4 px-4 text-purple-600 font-semibold">
                        Institution
                      </th>
                      <th className="text-center py-4 px-4 text-yellow-600 font-semibold">
                        Talent Development
                      </th>
                    </tr>
                  </thead>
                  <motion.tbody variants={staggerContainer} className="text-sm">
                    {[
                      {
                        feature: "Autonomous Project Management",
                        enterprise: true,
                        institution: true,
                        talent: true,
                      },
                      {
                        feature: "Advanced Analytics & Reporting",
                        enterprise: true,
                        institution: true,
                        talent: "Basic",
                      },
                      {
                        feature: "Enterprise Security & Compliance",
                        enterprise: true,
                        institution: "Standard",
                        talent: "Basic",
                      },
                      {
                        feature: "Custom Integrations & White-Label",
                        enterprise: true,
                        institution: true,
                        talent: "-",
                      },
                    ].map((row, idx) => (
                      <motion.tr
                        key={idx}
                        variants={itemFadeIn}
                        className={idx < 3 ? "border-b border-border/50" : ""}
                      >
                        <td className="py-3 px-4 text-muted-foreground">
                          {row.feature}
                        </td>
                        <td className="text-center py-3 px-4">
                          {row.enterprise === true ? (
                            <motion.div
                              whileHover={{ scale: 1.2, rotate: 10 }}
                              className="inline-block"
                            >
                              <CheckCircle2 className="w-5 h-5 text-blue-600 mx-auto" />
                            </motion.div>
                          ) : (
                            row.enterprise
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {row.institution === true ? (
                            <motion.div
                              whileHover={{ scale: 1.2, rotate: 10 }}
                              className="inline-block"
                            >
                              <CheckCircle2 className="w-5 h-5 text-purple-600 mx-auto" />
                            </motion.div>
                          ) : (
                            <span className="text-muted-foreground">
                              {row.institution}
                            </span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {row.talent === true ? (
                            <motion.div
                              whileHover={{ scale: 1.2, rotate: 10 }}
                              className="inline-block"
                            >
                              <CheckCircle2 className="w-5 h-5 text-yellow-600 mx-auto" />
                            </motion.div>
                          ) : (
                            <span className="text-muted-foreground">
                              {row.talent}
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Final CTA - Enterprise Focused */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeIn}
        className="relative bg-primary text-primary-foreground py-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
      >
        <div className="absolute inset-0 bg-grid-primary-foreground/[0.05] bg-[size:60px_60px]" />
        <motion.div
          variants={staggerContainer}
          className="relative z-10 text-center max-w-5xl mx-auto"
        >
          <motion.h2
            variants={itemFadeIn}
            className="text-4xl lg:text-5xl font-bold mb-6"
          >
            Ready to Transform Your Enterprise Project Delivery?
          </motion.h2>

          <motion.p
            variants={itemFadeIn}
            className="text-xl mb-10 text-primary-foreground/80 max-w-3xl mx-auto"
          >
            Join leading enterprises already achieving 40% faster delivery with
            AI-powered project management, automated workflows, and integrated
            talent development that scales with your organization.
          </motion.p>

          <motion.div
            variants={itemFadeIn}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/preregister">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group bg-background text-primary font-bold py-4 px-10 rounded-xl shadow-2xl hover:shadow-background/25 transition-all duration-300 flex items-center mx-auto sm:mx-0"
              >
                Start Enterprise Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
            <Link
              href="/contact"
              className="text-decoration-none cursor-pointer"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group border-2 border-primary-foreground/30 text-primary-foreground font-bold py-4 px-10 rounded-xl hover:bg-primary-foreground/10 transition-all duration-300 flex items-center mx-auto sm:mx-0"
              >
                <Calendar className="mr-2 w-5 h-5" />
                Schedule Enterprise Demo
              </motion.button>
            </Link>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-primary-foreground/80"
          >
            {[
              "Enterprise-Grade Security",
              "Autonomous AI Project Manager",
              "Integrated Talent Development",
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={itemFadeIn}
                className="flex items-center space-x-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Floating Action Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.5, type: "spring" }}
        className="fixed bottom-6 left-6 z-50"
      >
        <motion.button
          type="button"
          aria-label="Scroll to top"
          onClick={handleScrollToTop}
          whileHover={{
            scale: 1.1,
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-4 rounded-full shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 group border border-orange-200"
        >
          <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
        </motion.button>
      </motion.div>

      {/* Floating Action Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.5, type: "spring" }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Link href="/login" className="text-decoration-none cursor-pointer">
          <motion.button
            whileHover={{
              scale: 1.1,
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 group border border-blue-200"
          >
            <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
};

export default LandingPage;

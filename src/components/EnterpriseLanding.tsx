"use client";

import React, { useState, useRef } from "react";
import {
  useScroll,
  useTransform,
  motion,
  AnimatePresence,
} from "framer-motion";
import {
  Play,
  Cpu,
  Github,
  Layers,
  ArrowRight,
  Bot,
  Award,
  Code,
  GitBranch,
  Target,
  Brain,
  BarChart3,
  Sparkles,
  Calendar,
  Monitor,
  Rocket,
  CheckCircle2,
  Shield,
  Database,
  Users,
  Zap,
  Building2,
  GraduationCap,
  Lock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const EnterpriseLanding = () => {
  const { scrollY } = useScroll();
  const [arrowHover, setArrowHover] = useState(false);
  // Reverse parallax: move image up slightly as we scroll down to avoid white space
  const y1 = useTransform(scrollY, [0, 1200], [0, -150]);
  const scale = useTransform(scrollY, [0, 1200], [1.05, 1.15]);
  const opacity = useTransform(scrollY, [0, 800], [1, 0.4]);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: dashboardScroll } = useScroll({
    target: dashboardRef,
    offset: ["start end", "center center"],
  });

  const dashboardRotateX = useTransform(dashboardScroll, [0, 1], [30, 0]);
  const dashboardScale = useTransform(dashboardScroll, [0, 1], [0.85, 1]);
  const dashboardOpacity = useTransform(dashboardScroll, [0, 1], [0.3, 1]);
  const dashboardY = useTransform(dashboardScroll, [0, 1], [150, 0]);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-gray-900 selection:text-white relative">
      {/* Atmospheric Background Layer with Inner Glow */}
      <div className="fixed inset-0 z-0 h-[120vh] w-full pointer-events-none -top-[10vh] shadow-[inset_0_0_100px_rgba(255,255,255,0.2)]">
        <motion.div
          style={{
            y: useTransform(scrollY, [0, 1200], [0, -150]),
            scale: useTransform(scrollY, [0, 1200], [1.05, 1.15]),
            opacity,
          }}
          className="relative h-full w-full blur-sm md:blur-none will-change-transform"
        >
          <Image
            src="/tree.png"
            alt="Forest Background"
            fill
            className="object-cover"
            priority
          />

          {/* Simplified Mist/Fog Layer */}
          <div className="absolute inset-0 bg-white/10 blur-[80px]" />

          {/* Refined 'Misty' Side Overlays - 1/3 Width for deeper fade */}
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white via-white/60 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white via-white/60 to-transparent"></div>

          {/* Main Fog/Blur Overlay */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>

          {/* Bottom fade into white content */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white"></div>
        </motion.div>
      </div>

      {/* Main Content Wrapper */}
      <div className="relative z-10">
        {/* Hero Section - Centered and Floating */}
        <section className="relative min-h-screen flex items-center justify-center bg-transparent overflow-visible">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-5xl mx-auto px-6 text-center"
          >
            {/* Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/70 backdrop-blur-md border border-white/50 shadow-sm mb-12 select-none"
            >
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em]">
                Now with Kiyo Intelligence v2.0
              </span>
              <span className="text-gray-400 text-xs">✨</span>
            </motion.div>

            {/* Main Heading - High Contrast Serif */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="font-serif text-6xl md:text-8xl text-gray-950 mb-10 tracking-tight leading-[0.95] font-medium"
            >
              Scale Projects with
              <br />
              <span className="italic font-normal text-gray-800">
                AI-Powered Precision
              </span>
            </motion.h1>

            {/* Subtext - Clean Sans-serif */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="max-w-3xl mx-auto text-lg md:text-xl text-gray-600/80 mb-16 leading-relaxed font-normal"
            >
              Transform your enterprise project management with AI-driven
              automation, intelligent resource allocation, and integrated talent
              development that delivers measurable results at scale.
            </motion.p>

            {/* CTA Section - Restored Original Buttons with Premium Styling */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6 flex-wrap"
            >
              <Link href="/plans">
                <button className="px-12 py-5 bg-gray-950 text-white rounded-full font-bold text-lg transition-all duration-300 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-100">
                  Start Trial
                </button>
              </Link>
              <Link href="#contact">
                <button className="px-12 py-5 bg-white text-gray-950 border border-gray-100 rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:bg-gray-50 active:scale-95">
                  Schedule a demo
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Dashboard Preview Section - Enhanced 3D feel */}
        <section className="relative px-6 pb-40 bg-white" style={{ perspective: "2000px" }}>
          <motion.div
            ref={dashboardRef}
            style={{
              rotateX: dashboardRotateX,
              scale: dashboardScale,
              opacity: dashboardOpacity,
              y: dashboardY,
              transformOrigin: "center center"
            }}
            className="relative z-10 max-w-6xl mx-auto rounded-[40px] overflow-hidden shadow-[0_100px_200px_-20px_rgba(0,0,0,0.2)] will-change-transform border border-gray-100"
          >
            <div className="relative rounded-[30px] overflow-hidden">
              <Image
                src="/dashboard-black.png"
                alt="Kiyo Enterprise Dashboard"
                width={2531}
                height={1209}
                className="w-full h-auto transition-all duration-1000 will-change-transform block"
              />
            </div>
          </motion.div>
        </section>

        {/* Stats/ROI Section */}
        <section className="sticky top-0 min-h-screen flex flex-col justify-center py-20 bg-white relative overflow-hidden z-[11] rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] border-t border-gray-100">
          {/* Tree Background */}
          <div className="absolute inset-0 z-0 h-full w-full pointer-events-none">
            <motion.div
              style={{
                y: useTransform(scrollY, [1300, 2400], [0, -100]),
                scale: useTransform(scrollY, [1300, 2400], [1, 1.1]),
                opacity: useTransform(scrollY, [1300, 2400], [0.2, 0.2]),
              }}
              className="relative h-full w-full blur-sm md:blur-none will-change-transform"
            >
              <Image
                src="/tree.png"
                alt="Forest Background"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-white/10 blur-[80px]" />
              <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white via-white/60 to-transparent"></div>
              <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white via-white/60 to-transparent"></div>
              <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white"></div>
            </motion.div>
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-24"
            >
              <h2 className="text-4xl md:text-5xl font-serif text-gray-950 mb-6">
                Unlock Your Organization's Potential
              </h2>
              <p className="text-xl text-gray-500 font-light">
                See what's possible when AI manages your projects intelligently
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  value: "40%",
                  label: "Faster Project Delivery",
                  icon: Zap,
                  color: "text-blue-600 bg-blue-100",
                },
                {
                  value: "50%",
                  label: "Reduction in Manual Tasks",
                  icon: Bot,
                  color: "text-teal-600 bg-teal-100",
                },
                {
                  value: "90%",
                  label: "Resource Optimization",
                  icon: BarChart3,
                  color: "text-emerald-600 bg-emerald-100",
                },
                {
                  value: "60%",
                  label: "Better Talent Development",
                  icon: Users,
                  color: "text-violet-600 bg-violet-100",
                },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: idx * 0.1 }}
                  className="bg-white p-10 rounded-[32px] border border-gray-200 shadow-sm text-center hover:shadow-lg transition-all group"
                >
                  <div
                    className={`w-16 h-16 ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <stat.icon className="w-8 h-8" />
                  </div>
                  <div className="text-4xl font-bold text-gray-950 mb-2">
                    Up to {stat.value}
                  </div>
                  <div className="text-gray-500 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section - Premium Grid with all 6 features */}
        <section className="sticky top-0 min-h-screen flex flex-col justify-center py-10 lg:py-16 relative bg-gray-50 z-[12] rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] border-t border-gray-200 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white via-transparent to-transparent pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-10 lg:mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 text-gray-700 text-[10px] lg:text-xs font-bold uppercase tracking-widest mb-4 lg:mb-6"
              >
                <Sparkles className="w-3 h-3 lg:w-4 lg:h-4" /> Enterprise Capabilities
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                className="font-serif text-4xl lg:text-6xl text-gray-950 mb-4 lg:mb-6 tracking-tight font-medium"
              >
                Modern Enterprise Tools
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 }}
                className="max-w-3xl mx-auto text-base lg:text-xl text-gray-500 font-light leading-relaxed hidden sm:block"
              >
                Powerful tools designed to help high-performing teams manage
                complexity with ease and clarity.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {[
                {
                  icon: Bot,
                  title: "Autonomous Project Management",
                  desc: "Enterprise-grade AI that manages multi-team projects, allocates resources, and ensures delivery milestones at scale.",
                  badge: "Core Platform",
                  color: "bg-blue-100 text-blue-600",
                },
                {
                  icon: Github,
                  title: "GitHub Enterprise Integration",
                  desc: "Seamless integration with GitHub Enterprise for automated code reviews, compliance tracking, and team performance analytics.",
                  badge: "DevOps Ready",
                  color: "bg-gray-100 text-gray-700",
                },
                {
                  icon: Monitor,
                  title: "Industry-Grade Project Templates",
                  desc: "Pre-built project frameworks sourced from Fortune 500 companies, enabling rapid deployment and standardized workflows.",
                  badge: "Enterprise Templates",
                  color: "bg-teal-100 text-teal-600",
                },
                {
                  icon: Brain,
                  title: "Intelligent Talent Development",
                  desc: "AI-powered skill assessment and training pipelines that prepare your workforce for complex project requirements.",
                  badge: "Talent Pipeline",
                  color: "bg-violet-100 text-violet-600",
                },
                {
                  icon: BarChart3,
                  title: "Enterprise Analytics & Reporting",
                  desc: "Comprehensive dashboards with advanced metrics for project ROI, team productivity, and predictive resource planning.",
                  badge: "Business Intelligence",
                  color: "bg-emerald-100 text-emerald-600",
                },
                {
                  icon: Award,
                  title: "Compliance & Certification Management",
                  desc: "Automated compliance tracking and skill certification management integrated with your existing HR and training systems.",
                  badge: "Compliance Ready",
                  color: "bg-amber-100 text-amber-600",
                },
              ].map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: idx * 0.08 }}
                  className="group flex flex-col sm:flex-row items-start gap-4 p-5 lg:p-6 rounded-[24px] bg-white hover:bg-gray-50 transition-all duration-300 border border-gray-200 hover:shadow-lg will-change-transform"
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-sm`}
                  >
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 w-full">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-1 xl:gap-2 mb-2">
                      <h3 className="text-sm lg:text-base font-bold text-gray-950 tracking-tight">
                        {feature.title}
                      </h3>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-white rounded-full border border-gray-100 text-gray-400 uppercase tracking-wider whitespace-nowrap self-start xl:self-auto">
                        {feature.badge}
                      </span>
                    </div>
                    <p className="text-xs lg:text-sm text-gray-500 leading-snug font-light">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Seamless Implementation Section - New */}
        <section className="sticky top-0 min-h-screen flex flex-col justify-center py-20 bg-white relative overflow-hidden z-[13] rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] border-t border-gray-100">
          {/* Tree Background */}
          <div className="absolute inset-0 z-0 h-full w-full pointer-events-none">
            <motion.div
              style={{
                y: useTransform(scrollY, [2500, 3600], [0, -100]),
                scale: useTransform(scrollY, [2500, 3600], [1, 1.1]),
                opacity: useTransform(scrollY, [2500, 3600], [0.2, 0.2]),
              }}
              className="relative h-full w-full blur-sm md:blur-none will-change-transform"
            >
              <Image
                src="/tree.png"
                alt="Forest Background"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-white/10 blur-[80px]" />
              <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white via-white/60 to-transparent"></div>
              <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white via-white/60 to-transparent"></div>
              <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white"></div>
            </motion.div>
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-24">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-serif text-5xl md:text-6xl text-gray-950 mb-6"
              >
                Seamless Implementation
              </motion.h2>
              <p className="text-xl text-gray-500 font-light">
                From discovery to global scale in four strategic phases.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {[
                {
                  step: "01",
                  title: "Enterprise Assessment & Setup",
                  value: "40%",
                  desc: "Our AI analyzes your organization's project requirements, team capabilities, and creates customized workflows for maximum efficiency.",
                },
                {
                  step: "02",
                  title: "Intelligent Project Orchestration",
                  value: "50%",
                  desc: "Deploy AI-managed projects with automated task allocation, resource optimization, and real-time progress monitoring across teams.",
                },
                {
                  step: "03",
                  title: "Scale Team Collaboration",
                  value: "90%",
                  desc: "Enable seamless collaboration with integrated development environments, automated workflows, and AI-powered code reviews.",
                },
                {
                  step: "04",
                  title: "Drive Measurable Results",
                  value: "60%",
                  desc: "Achieve project delivery excellence with predictive analytics, automated reporting, and continuous improvement recommendations.",
                },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.05 }}
                  className="relative flex flex-col items-center text-center group"
                >
                  <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
                    <svg className="w-full h-full rotate-[-90deg]">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        className="stroke-gray-100 fill-transparent stroke-[8]"
                      />
                      <motion.circle
                        cx="80"
                        cy="80"
                        r="70"
                        className="stroke-gray-900 fill-transparent stroke-[8] stroke-linecap-round"
                        initial={{
                          strokeDasharray: "440",
                          strokeDashoffset: "440",
                        }}
                        whileInView={{
                          strokeDashoffset:
                            440 - (440 * parseInt(item.value)) / 100,
                        }}
                        viewport={{ once: true }}
                        transition={{ duration: 2, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-gray-400 uppercase mb-1">
                        {item.step}
                      </span>
                      <span className="text-2xl font-bold text-gray-950">
                        {item.value}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                  <p className="text-gray-500 font-light text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Solutions Section - New */}
        <section className="sticky top-0 min-h-screen flex flex-col justify-center py-20 bg-gray-50 z-[14] rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {[
                {
                  title: "Enterprise Organizations",
                  desc: "Drive measurable ROI and delivery excellence with AI-powered orchestration built for millions of tasks.",
                  icon: Building2,
                  color: "bg-blue-100 text-blue-600",
                },
                {
                  title: "Educational Institutions",
                  desc: "Empower students and researchers with advanced project frameworks and automated progress tracking.",
                  icon: GraduationCap,
                  color: "bg-emerald-100 text-emerald-600",
                },
              ].map((solution, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: idx * 0.12 }}
                  className="bg-gray-50 rounded-[40px] p-16 flex flex-col gap-10 hover:shadow-lg transition-all border border-gray-200"
                >
                  <div
                    className={`w-16 h-16 ${solution.color} rounded-2xl flex items-center justify-center shadow-sm`}
                  >
                    <solution.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif text-gray-950 mb-6">
                      {solution.title}
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      {solution.desc}
                    </p>
                  </div>
                  <button className="flex items-center gap-2 font-bold text-gray-900 group">
                    Learn more{" "}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Section - Precisely Matched */}
        <section className="sticky top-0 min-h-screen flex flex-col justify-center py-20 bg-white relative overflow-hidden z-[15] rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] border-t border-gray-100">
          {/* Tree Background */}
          <div className="absolute inset-0 z-0 h-full w-full pointer-events-none">
            <motion.div
              style={{
                y: useTransform(scrollY, [3700, 4700], [0, -100]),
                scale: useTransform(scrollY, [3700, 4700], [1, 1.1]),
                opacity: useTransform(scrollY, [3700, 4700], [0.2, 0.2]),
              }}
              className="relative h-full w-full blur-sm md:blur-none will-change-transform"
            >
              <Image
                src="/tree.png"
                alt="Forest Background"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-white/10 blur-[80px]" />
              <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white via-white/60 to-transparent"></div>
              <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white via-white/60 to-transparent"></div>
              <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white"></div>
            </motion.div>
          </div>
          <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="text-5xl md:text-6xl font-serif text-gray-950 mb-20"
            >
              Built for Enterprise Trust
            </motion.h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
              {[
                {
                  title: "SOC 2 Type II",
                  icon: Shield,
                  desc: "Rigorous independent auditing of our security controls.",
                },
                {
                  title: "Enterprise SSO",
                  icon: Users,
                  desc: "Seamless integration with your identity providers.",
                },
                {
                  title: "Audit Logs",
                  icon: Database,
                  desc: "Comprehensive visibility into all system activities.",
                },
                {
                  title: "Data Residency",
                  icon: Target,
                  desc: "Regional controls to meet global compliance requirements.",
                },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="w-12 h-12 text-gray-700 mb-6">
                    <item.icon className="w-full h-full stroke-[1.5]" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 font-light text-sm">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enterprise Feature Comparison Section */}
        <section className="sticky top-0 min-h-screen flex flex-col justify-center py-20 bg-gray-50 z-[16] rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-2xl p-8 border border-gray-100 shadow-lg"
            >
              <h3 className="text-4xl font-serif font-bold mb-12 text-center text-gray-950">
                Enterprise Feature Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 text-gray-950 font-semibold">
                        Capability
                      </th>
                      <th className="text-center py-4 px-4 text-gray-700 font-semibold">
                        Enterprise
                      </th>
                      <th className="text-center py-4 px-4 text-gray-700 font-semibold">
                        Institution
                      </th>
                      <th className="text-center py-4 px-4 text-gray-700 font-semibold">
                        Talent Development
                      </th>
                    </tr>
                  </thead>
                  <motion.tbody
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.1,
                          delayChildren: 0.2,
                        },
                      },
                    }}
                    className="text-sm"
                  >
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
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        className={idx < 3 ? "border-b border-gray-100" : ""}
                      >
                        <td className="py-4 px-4 text-gray-600">
                          {row.feature}
                        </td>
                        <td className="text-center py-4 px-4">
                          {row.enterprise === true ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-600 mx-auto" />
                          ) : (
                            row.enterprise
                          )}
                        </td>
                        <td className="text-center py-4 px-4">
                          {row.institution === true ? (
                            <CheckCircle2 className="w-5 h-5 text-teal-600 mx-auto" />
                          ) : (
                            <span className="text-gray-500">
                              {row.institution}
                            </span>
                          )}
                        </td>
                        <td className="text-center py-4 px-4">
                          {row.talent === true ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-gray-500">{row.talent}</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
      </div>
    </div>
  );
};

export default EnterpriseLanding;

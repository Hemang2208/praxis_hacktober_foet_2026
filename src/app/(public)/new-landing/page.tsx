"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  GitBranch,
  Github,
  GraduationCap,
  Monitor,
  Rocket,
  Shield,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Preloader from "@/components/ui/Preloader";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from "framer-motion";

const companies = [
  "Matrix",
  "Vivax",
  "Grayy",
  "IRL Social",
  "FOMO",
  "Acme Corp",
  "Globex",
  "Initech",
];

const heroHighlights = [
  {
    title: "Autonomous orchestration",
    desc: "AI-managed delivery across multi-team portfolios with clarity at every step.",
    icon: Bot,
  },
  {
    title: "Integrated talent pipeline",
    desc: "Assess, train, and deploy teams with realistic project simulations.",
    icon: Brain,
  },
  {
    title: "Enterprise-grade compliance",
    desc: "Security, governance, and auditability built in from day one.",
    icon: Shield,
  },
];

const stats = [
  {
    value: "115+",
    label: "Total Registrations",
    icon: Users,
    animate: { x: [0, 4, -4, 0] },
  },
  {
    value: "50+",
    label: "Pre-Registrations",
    icon: ClipboardCheck,
    animate: { y: [0, -6, 0] },
  },
  {
    value: "30+",
    label: "Active Platform Users",
    icon: UserCheck,
    animate: { scale: [1, 1.08, 1] },
  },
  {
    value: "IIIT-L",
    label: "Successful POC Collaboration",
    icon: Building2,
    animate: { y: [0, -4, 0] },
  },
];

const capabilities = [
  {
    title: "Training",
    desc: "Codebase-native learning and onboarding. Train developers on your actual stack and codebase to turn every hire into a Day-1 contributor.",
    tag: "Onboarding",
    icon: GraduationCap,
  },
  {
    title: "Tasks",
    desc: "AI-assigned tasks aligned to real projects and integrated codebase context.",
    tag: "Work Management",
    icon: Target,
  },
  {
    title: "PR Review",
    desc: "AI-powered code reviews with real-time feedback and compliance checks.",
    tag: "Automation",
    icon: GitBranch,
  },
  {
    title: "Progress",
    desc: "Real-time tracking and performance analytics for developer speed, ramp-up, and output.",
    tag: "Analytics",
    icon: BarChart3,
  },
  {
    title: "Knowledge",
    desc: "Centralized docs, wikis, and team knowledge base for instant codebase exploration.",
    tag: "Documentation",
    icon: BookOpen,
  },
  {
    title: "AI Assistant",
    desc: "AI assistants and insights that make developers better, optimizing resource allocations.",
    tag: "Co-pilot",
    icon: Bot,
  },
];

const workflow = [
  {
    step: 1,
    title: "Developer Onboarding (Today)",
    desc: "Nurturing human potential for industry impact. Train new developers on your actual stack and codebase to achieve a first meaningful PR in Week 2.",
    icon: GraduationCap,
    deliverables: ["Real GitHub Tasks", "AI PR Reviews", "Progress Tracking", "Codebase Training"],
  },
  {
    step: 2,
    title: "Workflow Automation (Next)",
    desc: "Deploy automated project orchestration, task allocation, and intelligent code review pipelines directly integrated with your repositories.",
    icon: GitBranch,
    deliverables: ["Auto-Tasking", "AI PR Review Loops", "CI/CD Signals", "Resource Sync"],
  },
  {
    step: 3,
    title: "Developer OS (Tomorrow)",
    desc: "The single workspace where developers start their day. Access and manage work, collaborate on code, and tap into the team knowledge base.",
    icon: Monitor,
    deliverables: ["Unified Workspace", "Centralized Wikis", "Team Knowledge Base", "AI Assistants"],
  },
  {
    step: 4,
    title: "Imprint Intelligence (Future)",
    desc: "Implicit preference capture that turns developer behavior and design choices into structured, ML-ready signals for the next generation of software.",
    icon: Brain,
    deliverables: ["Behavior Capture", "Preference Mining", "ML Signal Pipeline", "Next-Gen Infrastructure"],
  },
];

const securityPoints = [
  "SOC 2 Type II compliance",
  "Enterprise SSO and RBAC integration",
  "Advanced audit logs and reporting",
  "Data residency and geographic controls",
];

const securityMetrics = [
  { label: "Uptime SLA", value: "99.9%" },
  { label: "Encryption", value: "AES-256" },
  { label: "Audit Trails", value: "Always On" },
  { label: "Response", value: "< 5 min" },
];

const useCases = [
  {
    title: "Enterprise Organizations",
    icon: Building2,
    desc: "Transform complex multi-team projects with AI-driven orchestration, automated resource allocation, and integrated talent pipeline development.",
    features: [
      "Multi-team project orchestration",
      "Enterprise security framework",
      "Advanced predictive insights",
    ],
  },
  {
    title: "Educational Institutions",
    icon: GraduationCap,
    desc: "Deploy enterprise-grade project management for academic research, student training programs, and institutional collaboration initiatives.",
    features: [
      "Research project management",
      "Institutional collaboration",
      "Academic workflow templates",
    ],
  },
  {
    title: "Talent Development",
    icon: Users,
    desc: "Comprehensive talent training and assessment through realistic project simulations that prepare workforce for enterprise requirements.",
    features: [
      "AI skill development pathways",
      "Realistic project simulations",
      "Integrated capability tracking",
    ],
  },
];

const comparisonRows = [
  {
    feature: "Codebase-Native Onboarding",
    kiyo: true,
    lms: "-",
    courses: "-",
  },
  {
    feature: "Automated AI PR Reviews",
    kiyo: true,
    lms: "-",
    courses: "-",
  },
  {
    feature: "AI-Assigned Tasks & Sprints",
    kiyo: true,
    lms: "-",
    courses: "-",
  },
  {
    feature: "Developer Progress Analytics",
    kiyo: true,
    lms: "Yes",
    courses: "Basic",
  },
  {
    feature: "Centralized Knowledge Wiki & Docs",
    kiyo: true,
    lms: "Yes",
    courses: "-",
  },
];

const wordVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7 },
  },
};

const renderWords = (text: string) =>
  text.split(" ").map((word, i) => (
    <motion.span
      key={`${word}-${i}`}
      variants={wordVariants}
      className="inline-block mr-[0.35em]"
    >
      {word}
    </motion.span>
  ));

export default function NewLandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroImageScale = useTransform(heroScrollProgress, [0, 0.15], [0.92, 1]);
  const heroImageRotateX = useTransform(heroScrollProgress, [0, 0.15], [10, 0]);
  const heroImageY = useTransform(heroScrollProgress, [0, 0.15], [0, 0]);
  const heroImageOpacity = useTransform(heroScrollProgress, [0, 0.08], [0.95, 1]);
  const heroMaskReveal = useTransform(heroScrollProgress, [0, 0.08], [95, 100]);
  const heroMaskEdge = useTransform(heroMaskReveal, (v: number) => v + 5);

  const [activeWorkflow, setActiveWorkflow] = useState(0);
  const workflowSectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: workflowScrollProgress } = useScroll({
    target: workflowSectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const unsubscribe = workflowScrollProgress.on("change", (v) => {
      const idx = Math.min(
        workflow.length - 1,
        Math.floor(v * workflow.length)
      );
      setActiveWorkflow(idx);
    });
    return unsubscribe;
  }, [workflowScrollProgress]);

  return (
    <>
      <Preloader />

      <div
        ref={containerRef}
        className="relative bg-background text-foreground overflow-clip selection:bg-foreground/10 font-sans"
      >
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.08),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,_rgba(0,0,0,0.06)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(0,0,0,0.06)_1px,_transparent_1px)] bg-[size:120px_120px] opacity-40" />
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-zinc-500/10 blur-[120px]" />
      </div>

      <section ref={heroRef} className="relative pt-20 lg:pt-36 pb-12 lg:pb-24 min-h-[100dvh] flex flex-col lg:justify-center overflow-x-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -top-32 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-zinc-500/14 blur-[190px]" />
          <div className="absolute right-[-6%] top-12 h-40 w-40 rounded-full border border-border/28 opacity-28" />
          <div className="absolute left-[6%] bottom-6 h-24 w-24 rounded-full border border-border/22 opacity-25" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.08),transparent_65%)]" />
          <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.06),transparent)]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16 items-start">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-zinc-500"
              >
                <span>AI Workflow</span>
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                <span>Developer OS</span>
              </motion.div>

              <motion.h1
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 1 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
                  },
                }}
                className="mt-6 md:mt-8 text-[clamp(2rem,6.5vw,4.2rem)] leading-[0.95] font-[var(--font-montserrat)] tracking-tight text-foreground"
              >
                <span className="block lg:whitespace-nowrap">
                  {renderWords("AI Workflow Platform")}
                </span>
                <motion.span
                  variants={wordVariants}
                  className="block lg:whitespace-nowrap bg-gradient-to-r from-foreground via-zinc-500 to-foreground text-transparent bg-clip-text pb-2 lg:pb-4"
                >
                  for Engineering Teams
                </motion.span>
              </motion.h1>

              <motion.p
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 1 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.04, delayChildren: 0.6 },
                  },
                }}
                className="mt-8 max-w-xl text-lg text-zinc-500 leading-relaxed"
              >
                {renderWords(
                  "Starting with Developer Onboarding. Building the Future Developer OS.",
                )}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                className="mt-10 flex flex-col sm:flex-row gap-5"
              >
                <Link href="/preregister" className="group w-full sm:w-auto">
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-full sm:w-auto overflow-hidden rounded-full bg-foreground px-7 py-4 text-sm font-semibold text-background shadow-[0_24px_60px_-40px_rgba(0,0,0,0.7)]"
                  >
                    <span className="relative flex items-center justify-center h-[1.4em] overflow-hidden leading-none">
                      <span className="w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full whitespace-nowrap">
                        Try Kiyo
                        <ArrowRight className="h-4 w-4" />
                      </span>
                      <span className="absolute inset-0 w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 translate-y-full group-hover:translate-y-0 whitespace-nowrap">
                        Try Kiyo
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </span>
                  </motion.button>
                </Link>
                <Link href="/contact" className="w-full sm:w-auto">
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group w-full sm:w-auto rounded-full border border-border/60 bg-background/70 px-7 py-4 text-sm font-semibold text-foreground hover:border-foreground/40 transition-colors"
                  >
                    <span className="relative flex items-center justify-center h-[1.4em] overflow-hidden leading-none">
                      <span className="w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full whitespace-nowrap">
                        Book Demo
                      </span>
                      <span className="absolute inset-0 w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 translate-y-full group-hover:translate-y-0 whitespace-nowrap">
                        Book Demo
                      </span>
                    </span>
                  </motion.button>
                </Link>
              </motion.div>

              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs uppercase tracking-[0.15em] lg:tracking-[0.3em] text-zinc-500">
                <span>Precision</span>
                <span className="hidden sm:block h-1.5 w-1.5 rounded-full bg-zinc-400" />
                <span>Velocity</span>
                <span className="hidden sm:block h-1.5 w-1.5 rounded-full bg-zinc-400" />
                <span>Governance</span>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative h-[420px]">
                <div className="absolute inset-0 rounded-[2.5rem] border border-border/50 bg-background/60" />

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="absolute left-8 right-8 top-12 rounded-[2.5rem] border border-border/60 bg-background/90 p-8 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]"
                >
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    <span>AI Operator</span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-foreground/70 animate-pulse" />
                      Active
                    </span>
                  </div>

                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background">
                      <Bot className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Kiyo AI Pilot</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                        Enterprise orchestration
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-foreground" />
                      Route alignment
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-foreground" />
                      Governance lock
                    </div>
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-foreground" />
                      Talent signal
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-foreground" />
                      Delivery boost
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 6,
                    ease: "easeInOut",
                  }}
                  className="absolute right-6 top-6 rounded-2xl border border-border/60 bg-background/90 px-4 py-3 shadow-lg"
                >
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
                    <Zap className="h-4 w-4 text-foreground" />
                    +40% Delivery
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 7,
                    ease: "easeInOut",
                    delay: 0.4,
                  }}
                  className="absolute left-6 bottom-10 rounded-2xl border border-border/60 bg-background/90 px-4 py-3 shadow-lg"
                >
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
                    <Shield className="h-4 w-4 text-foreground" />
                    Compliance
                  </div>
                  <div className="mt-2 text-sm font-semibold">Verified</div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 5.5,
                    ease: "easeInOut",
                    delay: 0.2,
                  }}
                  className="absolute right-8 bottom-6 rounded-2xl border border-border/60 bg-background/90 px-4 py-3 shadow-lg"
                >
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
                    <Brain className="h-4 w-4 text-foreground" />
                    Talent Sync
                  </div>
                  <div className="mt-2 text-sm font-semibold">90% Ready</div>
                </motion.div>
              </div>
            </div>
          </div>



          <div className="mt-12 grid gap-6 border-t border-border/60 pt-6 lg:hidden">
            {heroHighlights.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-4"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut",
                    delay: i * 0.3,
                  }}
                  className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/80"
                >
                  <item.icon className="h-4 w-4 text-foreground" />
                </motion.div>
                <div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-8 lg:mt-16 px-4 sm:px-6 max-w-7xl mx-auto [perspective:2000px] relative z-20 pb-8 overflow-visible">
          <motion.div
            style={{
              scale: heroImageScale,
              opacity: heroImageOpacity,
              rotateX: heroImageRotateX,
              y: heroImageY,
              maskImage: `linear-gradient(to bottom, black 0%, black ${heroMaskReveal}%, transparent ${heroMaskEdge}%)`,
              WebkitMaskImage: `linear-gradient(to bottom, black 0%, black ${heroMaskReveal}%, transparent ${heroMaskEdge}%)`,
              transformOrigin: "top center",
              transformStyle: "preserve-3d",
            }}
            initial={{ y: 60, opacity: 0, rotateX: 15 }}
            animate={{ y: 0, opacity: 1, rotateX: 10 }}
            transition={{ duration: 1.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-[1.5rem] lg:rounded-[2.25rem] border border-border/50 bg-background/80 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.05),_transparent_40%)] z-10" />
              <Image
                src="/dashboard-black.png"
                alt="Enterprise Dashboard"
                width={2531}
                height={1209}
                className="w-full h-auto block"
                priority
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* <section className="pt-8 pb-16 border-y border-border/50 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
            <span>Trusted by forward teams</span>
            <span>Enterprise, education, talent</span>
          </div>
        </div>
        <div className="mt-10 overflow-hidden">
          <motion.div
            animate={{ x: [0, -1035] }}
            transition={{ repeat: Infinity, duration: 26, ease: "linear" }}
            className="flex gap-16 whitespace-nowrap px-10"
          >
            {[...companies, ...companies, ...companies].map((company, i) => (
              <span
                key={`${company}-${i}`}
                className="text-xl font-semibold text-zinc-400/60 hover:text-zinc-700 transition-colors"
              >
                {company}
              </span>
            ))}
          </motion.div>
        </div>
      </section> */}

      <section className="py-16 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-6 mx-auto"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Milestones & Adoption</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-tight mb-6"
            >
              Our Growing Community & Platform Momentum
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="max-w-2xl mx-auto text-lg text-zinc-500"
            >
              From registrations to active platform users and academic POC collaborations, Kiyo is gaining rapid real-world adoption.
            </motion.p>
          </div>

          <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-background/50 shadow-2xl shadow-zinc-500/5 mt-8 lg:mt-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 20,
                    delay: i * 0.1,
                  }}
                  className="p-10 text-center flex flex-col items-center group hover:bg-muted/30 transition-all duration-300"
                >
                  <div className="h-12 w-12 rounded-full border border-border/60 flex items-center justify-center mb-8 bg-background shadow-sm group-hover:scale-110 transition-transform">
                    <stat.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-3">
                    {stat.value}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-28 overflow-clip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-16 items-start">
            <div className="lg:sticky lg:top-28 self-start lg:pr-4">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-zinc-500"
              >
                <Target className="h-3 w-3" />
                Product capabilities
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight"
              >
                Why engineering teams choose Kiyo
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="mt-6 text-lg text-zinc-500 leading-relaxed"
              >
                Our AI workflow platform supports developer onboarding, task orchestration, and automated PR reviews directly on your actual codebase.
              </motion.p>
              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-zinc-500">
                <span>Autonomy</span>
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                <span>Talent</span>
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                <span>Compliance</span>
              </div>
            </div>

            <div className="divide-y divide-border/50 lg:pl-2">
              {capabilities.map((capability, i) => (
                <motion.div
                  key={capability.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-5 py-6"
                >
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    className="mt-1 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background"
                  >
                    <capability.icon className="h-5 w-5" />
                  </motion.div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {capability.title}
                      </h3>
                      <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                        {capability.tag}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
                      {capability.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Scroll-driven implementation process section */}
      <div
        ref={workflowSectionRef}
        className="relative bg-muted/20 border-y border-border/50 lg:h-[220vh] h-auto"
      >
        <div className="lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] flex items-center py-16 lg:py-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-16">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left: header + step list */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-zinc-500"
                >
                  <Target className="h-3 w-3" />
                  Implementation process
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight"
                >
                  Product evolution in four strategic steps
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="mt-6 text-lg text-zinc-500"
                >
                  From onboarding to implicit preference capture, Kiyo builds the future of developer enablement.
                </motion.p>

                <div className="mt-10 relative">
                  {/* Persistent vertical line */}
                  <div className="absolute left-[17px] top-4 bottom-4 w-[2px] bg-border/40" />

                  <div className="space-y-4">
                    {workflow.map((item, idx) => (
                      <div
                        key={item.title}
                        onClick={() => setActiveWorkflow(idx)}
                        className={`relative pl-12 pr-4 py-3 cursor-pointer lg:cursor-default transition-all duration-500 ${activeWorkflow === idx
                            ? "text-foreground"
                            : "text-zinc-400"
                          }`}
                      >
                        {/* Step indicator circle */}
                        <div
                          className={`absolute left-0 top-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-500 z-10 ${activeWorkflow >= idx
                              ? "border-foreground bg-foreground text-background"
                              : "border-border/60 bg-background/60"
                            }`}
                        >
                          {activeWorkflow > idx ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            item.step
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className={`text-base font-semibold transition-colors duration-500 ${activeWorkflow === idx ? "text-foreground" : "text-zinc-400"}`}>
                            {item.title}
                          </div>
                          <AnimatePresence>
                            {activeWorkflow === idx && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="text-sm text-zinc-500 leading-relaxed"
                              >
                                {item.desc}
                                
                                <div className="mt-4 lg:hidden grid grid-cols-1 gap-2">
                                  {(item as any).deliverables?.map((d: string) => (
                                    <div key={d} className="flex items-center gap-2 text-[10px] text-zinc-500">
                                      <div className="h-1 w-1 rounded-full bg-foreground/40" />
                                      {d}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: animated step detail card (hidden on mobile) */}
              <div className="hidden lg:block relative h-[560px] rounded-[2.5rem] border border-border/60 bg-background/80 p-8 sm:p-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.08),_transparent_60%)]" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeWorkflow}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -24 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="relative"
                  >
                    <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Step {activeWorkflow + 1} of {workflow.length}
                    </div>
                    <div className="mt-3 text-2xl font-semibold">
                      {workflow[activeWorkflow].title}
                    </div>
                    <div className="mt-10 pt-10 border-t border-border/50 flex flex-col h-full">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-6">
                        Core Deliverables
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-10">
                        {(workflow[activeWorkflow] as any).deliverables.map((item: string) => (
                          <div key={item} className="flex items-center gap-3 text-zinc-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                            <span className="text-sm font-medium">{item}</span>
                          </div>
                        ))}
                      </div>

                      {/* System Visualization */}
                      <div className="mt-auto">
                        <div className="rounded-2xl bg-muted/40 p-5 border border-border/40 backdrop-blur-sm shadow-inner">
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-[9px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${activeWorkflow === 3 ? "bg-emerald-500" : "bg-foreground/50 animate-pulse"}`} />
                              System Status: {activeWorkflow === 0 ? "Onboarding Hires" : activeWorkflow === 1 ? "Automating Workflows" : activeWorkflow === 2 ? "Developer OS Active" : "Imprint Engine Active"}
                            </div>
                            <div className="text-[9px] font-mono text-zinc-400">
                              REF_ID_{activeWorkflow + 1}04-K
                            </div>
                          </div>

                          {activeWorkflow === 0 && (
                            <div className="space-y-3">
                              <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                                <span>Codebase Training Progress</span>
                                <span>94%</span>
                              </div>
                              <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: "94%" }}
                                  transition={{ duration: 1.5, ease: "easeOut" }}
                                  className="h-full bg-foreground" 
                                />
                              </div>
                            </div>
                          )}

                          {activeWorkflow === 1 && (
                            <div className="flex items-center gap-8 py-2">
                              <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map(i => (
                                  <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-zinc-100 flex items-center justify-center text-[10px] font-bold">
                                    T{i}
                                  </div>
                                ))}
                              </div>
                              <div className="flex-1 flex flex-col gap-2">
                                <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                                  <motion.div 
                                    animate={{ x: ["-100%", "100%"] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    className="h-full w-1/3 bg-foreground/60 rounded-full" 
                                  />
                                </div>
                                <div className="text-[9px] text-zinc-400">Automating PR review cycles & tasks</div>
                              </div>
                            </div>
                          )}

                          {activeWorkflow === 2 && (
                            <div className="grid grid-cols-3 gap-4 text-center">
                              {[
                                { l: "PR Review Score", v: "82%" },
                                { l: "Wiki Coverage", v: "98%" },
                                { l: "Daily Commits", v: "203" }
                              ].map(s => (
                                <div key={s.l}>
                                  <div className="text-xs font-bold">{s.v}</div>
                                  <div className="text-[8px] uppercase tracking-tighter text-zinc-400">{s.l}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {activeWorkflow === 3 && (
                            <div className="flex items-end justify-between gap-1 h-12">
                              {[30, 45, 35, 60, 75, 55, 90, 85].map((h, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ height: 0 }}
                                  animate={{ height: `${h}%` }}
                                  transition={{ delay: i * 0.05, duration: 0.5 }}
                                  className="w-full bg-foreground/80 rounded-t-sm"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar keyed to activeWorkflow so it resets each step */}
                    <div className="mt-8 space-y-6">
                      <div className="h-1 rounded-full bg-border/60">
                        <motion.div
                          key={`bar-${activeWorkflow}`}
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1.6, ease: "easeOut" }}
                          className="h-full bg-foreground rounded-full"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-foreground/80 animate-pulse" />
                          Milestones synced
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-foreground/80 animate-pulse" />
                          Resource balance
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-foreground/80 animate-pulse" />
                          Team alignment
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-foreground/80 animate-pulse" />
                          Predictive insights
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="py-16 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[3rem] bg-zinc-950 text-zinc-50 border border-zinc-800 p-10 md:p-16 relative overflow-hidden"
          >
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-zinc-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-zinc-400/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="grid lg:grid-cols-2 gap-14 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-zinc-400">
                  <Shield className="h-3 w-3" />
                  Enterprise security
                </div>
                <h2 className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight">
                  Built for mission-critical operations
                </h2>
                <p className="mt-6 text-lg text-zinc-400 leading-relaxed">
                  Industry-leading security standards and compliance frameworks
                  that Fortune 500 companies trust.
                </p>
                <ul className="mt-10 space-y-5">
                  {securityPoints.map((item, i) => (
                    <li key={item}>
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-4"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800">
                          <CheckCircle2 className="h-4 w-4 text-zinc-300" />
                        </div>
                        <span className="text-zinc-300 font-medium">
                          {item}
                        </span>
                      </motion.div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-8 border-l border-zinc-800/80 pl-8">
                {securityMetrics.map((metric, i) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      {metric.label}
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {metric.value}
                    </div>
                    <div className="mt-2 text-sm text-zinc-500">
                      Monitored continuously with automated alerts.
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-zinc-500"
            >
              <Building2 className="h-3 w-3" />
              Enterprise solutions
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight"
            >
              Scalable solutions across organizations
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-lg text-zinc-500"
            >
              From Fortune 500 enterprises to leading educational institutions,
              our platform adapts to organizational needs while maintaining
              consistency.
            </motion.p>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {useCases.map((useCase, idx) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="border-t border-border/60 pt-8"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background">
                    <useCase.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold">{useCase.title}</h3>
                </div>
                <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                  {useCase.desc}
                </p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-600">
                  {useCase.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-foreground mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 overflow-x-auto rounded-[2rem] border border-border/50 bg-background/80">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.3em] text-zinc-500 bg-muted/20">
                <tr>
                  <th className="text-left py-4 px-3 sm:py-5 sm:px-6 font-semibold">
                    Capability
                  </th>
                  <th className="text-center py-4 px-3 sm:py-5 sm:px-6 font-semibold">
                    Kiyo AI
                  </th>
                  <th className="text-center py-4 px-3 sm:py-5 sm:px-6 font-semibold">
                    LMS (Docebo)
                  </th>
                  <th className="text-center py-4 px-3 sm:py-5 sm:px-6 font-semibold">
                    Online Courses
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-t border-border/40">
                    <td className="py-4 px-3 sm:py-5 sm:px-6 font-medium text-zinc-600 text-xs sm:text-sm">
                      {row.feature}
                    </td>
                    <td className="text-center py-4 px-3 sm:py-5 sm:px-6">
                      {row.kiyo === true ? (
                        <Check className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-foreground" />
                      ) : (
                        <span className="text-zinc-400 font-medium text-[10px] sm:text-sm">
                          {row.kiyo}
                        </span>
                      )}
                    </td>
                    <td className="text-center py-4 px-3 sm:py-5 sm:px-6">
                      {(row.lms as string | boolean) === true ? (
                        <Check className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-foreground" />
                      ) : (
                        <span className="text-zinc-400 font-medium text-[10px] sm:text-sm">
                          {row.lms}
                        </span>
                      )}
                    </td>
                    <td className="text-center py-4 px-3 sm:py-5 sm:px-6">
                      {(row.courses as string | boolean) === true ? (
                        <Check className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-foreground" />
                      ) : (
                        <span className="text-zinc-400 font-medium text-[10px] sm:text-sm">
                          {row.courses}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-[clamp(2.4rem,6vw,5rem)] font-[var(--font-montserrat)] tracking-tight">
              Ready to transform your delivery?
            </h2>
            <p className="mt-6 text-lg text-zinc-500">
              Join leading enterprises already achieving 40% faster delivery
              with AI-powered project management.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/preregister" className="group w-full sm:w-auto">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full sm:w-auto overflow-hidden rounded-full bg-foreground px-7 py-4 text-sm font-semibold text-background"
                >
                  <span className="relative flex items-center justify-center h-[1.4em] overflow-hidden leading-none">
                    <span className="w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full whitespace-nowrap">
                      Try Kiyo
                      <ArrowRight className="h-4 w-4" />
                    </span>
                    <span className="absolute inset-0 w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 translate-y-full group-hover:translate-y-0 whitespace-nowrap">
                      Try Kiyo
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </span>
                </motion.button>
              </Link>
              <Link href="/contact" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group w-full sm:w-auto rounded-full border border-border/60 bg-background/70 px-7 py-4 text-sm font-semibold text-foreground hover:border-foreground/40 transition-colors"
                >
                  <span className="relative flex items-center justify-center h-[1.4em] overflow-hidden leading-none">
                    <span className="w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full whitespace-nowrap">
                      Book Demo
                    </span>
                    <span className="absolute inset-0 w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 translate-y-full group-hover:translate-y-0 whitespace-nowrap">
                      Book Demo
                    </span>
                  </span>
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
    </>
  );
}

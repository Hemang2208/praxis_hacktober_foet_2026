"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Preloader from "@/components/ui/Preloader";
import {
  Target,
  Rocket,
  Building2,
  Brain,
  Code,
  TrendingUp,
  Zap,
  Shield,
  Activity,
  ArrowRight,
  Lightbulb,
  Cpu,
  BookOpen,
  Eye,
  Heart,
  ChevronRight,
  Globe,
  Award,
  Users,
  Check,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import GlobalRecognitionSection from "@/components/about/KiyoExperienceDaySection";
import { motion, useScroll, useTransform, useSpring, useVelocity, MotionValue, AnimatePresence } from "framer-motion";

// --- Advanced Easing & Motion Config ---
const LUXURY_EASE = [0.16, 1, 0.3, 1];

// --- Components ---

const RollingButton = ({ 
  children, 
  className = "", 
  variant = "primary",
  href = "/contact"
}: { 
  children: React.ReactNode; 
  className?: string;
  variant?: "primary" | "secondary";
  href?: string;
}) => {
  const isPrimary = variant === "primary";
  
  return (
    <Link href={href} className="w-full sm:w-auto">
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={
          isPrimary
            ? `group relative w-full sm:w-auto overflow-hidden rounded-full bg-foreground px-7 py-4 text-sm font-semibold text-background shadow-[0_24px_60px_-40px_rgba(0,0,0,0.7)] ${className}`
            : `group w-full sm:w-auto rounded-full border border-border/60 bg-background/70 px-7 py-4 text-sm font-semibold text-foreground hover:border-foreground/40 transition-colors ${className}`
        }
      >
        <span className="relative flex items-center justify-center h-[1.4em] overflow-hidden leading-none">
          <span className="w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full whitespace-nowrap">
            {children}
            {isPrimary && <ArrowRight className="h-4 w-4" />}
          </span>
          <span className="absolute inset-0 w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 translate-y-full group-hover:translate-y-0 whitespace-nowrap">
            {children}
            {isPrimary && <ArrowRight className="h-4 w-4" />}
          </span>
        </span>
      </motion.button>
    </Link>
  );
};

const LandingBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.08),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,_rgba(0,0,0,0.06)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(0,0,0,0.06)_1px,_transparent_1px)] bg-[size:120px_120px] opacity-40" />
      <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-zinc-500/10 blur-[120px]" />
    </div>
  );
};

const SophisticatedOrchestration = ({ 
  exitScale, 
  exitOpacity, 
  exitBlur 
}: { 
  exitScale: MotionValue<number>, 
  exitOpacity: MotionValue<number>, 
  exitBlur: MotionValue<number> 
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const nodes = [
    { icon: Code, label: "Core Engine", cx: 256, cy: 60 },
    { icon: Building2, label: "Enterprise Stack", cx: 256, cy: 452 },
    { icon: Rocket, label: "Global Edge", cx: 60, cy: 256 },
    { icon: Activity, label: "Telemetry", cx: 452, cy: 256 },
  ];

  if (!mounted) return null;

  return (
    <motion.div 
      style={{ scale: exitScale, opacity: exitOpacity, filter: `blur(${exitBlur}px)` }}
      className="relative w-full aspect-square max-w-lg mx-auto flex items-center justify-center"
    >
      <div 
        className="absolute inset-0" 
        style={{ background: 'radial-gradient(circle at center, rgba(0,0,0,0.03), transparent 70%)' }} 
      />

      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute border border-zinc-200/40 rounded-full"
          style={{ width: `${i * 30 + 10}%`, height: `${i * 30 + 10}%` }}
          animate={{ rotate: 360, opacity: [0.1, 0.2, 0.1] }}
          transition={{
            rotate: { duration: 30 + i * 15, repeat: Infinity, ease: "linear" },
            opacity: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      ))}

      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 512 512">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {nodes.map((node, i) => (
          <g key={`path-${i}`}>
            <motion.path
              d={`M 256 256 Q ${256 + (node.cx - 256) * 0.5} ${256 + (node.cy - 256) * 0.2} ${node.cx} ${node.cy}`}
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="1.5"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: i * 0.2, ease: LUXURY_EASE as any }}
            />
            <motion.circle r="2" fill="black" filter="url(#glow)">
              <animateMotion
                dur={`${3 + i}s`}
                repeatCount="indefinite"
                path={`M 256 256 Q ${256 + (node.cx - 256) * 0.5} ${256 + (node.cy - 256) * 0.2} ${node.cx} ${node.cy}`}
              />
            </motion.circle>
          </g>
        ))}
      </svg>

      <div className="relative h-24 w-24 rounded-3xl bg-white border border-zinc-200 shadow-2xl flex items-center justify-center z-10 group transition-all duration-500 hover:bg-black hover:scale-105 cursor-pointer">
        <div className="absolute inset-0 rounded-3xl bg-zinc-950/5 group-hover:bg-white/10 animate-pulse" />
        <Brain className="w-10 h-10 text-zinc-950 transition-colors duration-500 group-hover:text-white" />
      </div>

      {nodes.map((node, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
          className="absolute flex flex-col items-center gap-3 group"
          style={{ 
            left: `${(node.cx / 512) * 100}%`, 
            top: `${(node.cy / 512) * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="h-12 w-12 rounded-2xl bg-white border border-zinc-200 shadow-lg flex items-center justify-center transition-all duration-500 group-hover:bg-black group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-zinc-500/20 cursor-pointer">
            <node.icon className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors duration-500" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 whitespace-nowrap">{node.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
};

const TimelineJourney = ({ roadmap }: { roadmap: any[] }) => {
  return (
    <div className="relative space-y-32 py-20">
      <div className="absolute left-[27px] top-0 bottom-0 w-px bg-zinc-100 hidden lg:block" />
      
      {roadmap.map((step, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-150px" }}
          transition={{ duration: 1, ease: LUXURY_EASE as any }}
          className="relative flex flex-col lg:flex-row items-start gap-8 lg:gap-16 group"
        >
          <div className="relative z-10 shrink-0">
            <motion.div 
              whileInView={{ scale: [0.9, 1.1, 1] }}
              viewport={{ once: false, margin: "-20%" }}
              transition={{ duration: 0.5 }}
              className="h-14 w-14 rounded-2xl bg-background border border-border/60 shadow-md flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground group-hover:shadow-xl transition-all duration-500"
            >
              <step.icon className="w-6 h-6 text-zinc-500 group-hover:text-background transition-colors duration-500" />
            </motion.div>
          </div>

          <div className="flex-1 pt-2">
            <div className="absolute -inset-x-8 -inset-y-12 bg-muted/20 rounded-[3rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-4 block">
              {step.phase}
            </span>
            <h3 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4 tracking-tight group-hover:translate-x-2 transition-transform duration-700">{step.title}</h3>
            <p className="text-lg text-zinc-500 leading-relaxed max-w-xl">
              {step.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const OperatorCard = ({ member }: { member: any }) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const mouseX = useSpring(0, { stiffness: 60, damping: 25 });
  const mouseY = useSpring(0, { stiffness: 60, damping: 25 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 20;
    const y = (e.clientY - rect.top - rect.height / 2) / 20;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX: mouseY, rotateY: mouseX, transformStyle: "preserve-3d" }}
      className="h-full"
    >
      <motion.div 
        className="relative h-full overflow-hidden rounded-[2.5rem] border border-border/60 bg-background/50 backdrop-blur-sm shadow-sm hover:shadow-2xl hover:shadow-foreground/5 transition-all duration-700 group flex flex-col"
      >
        <div className="relative w-full aspect-[3/4] overflow-hidden bg-muted/30">
          <Image
            src={member.image}
            alt={member.name}
            fill
            className={`object-cover object-top transition-all duration-1000 ease-out ${isHovered ? "scale-105 grayscale-0" : "grayscale"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="absolute bottom-6 left-6 right-6 text-left z-30 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100">
             <p className="text-white text-xs leading-relaxed">
               {member.description}
             </p>
          </div>
        </div>

        <div className="p-8 text-left flex-1 flex flex-col justify-center">
          <h3 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-1 group-hover:text-zinc-500 transition-colors min-h-[4rem] flex items-center">{member.name}</h3>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            {member.role}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Main Page Component ---

const AboutUs = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pageRef = useRef<HTMLDivElement>(null);
  const [activeRoadmap, setActiveRoadmap] = useState(0);
  const roadmapSectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: pageRef,
    offset: ["start start", "end end"],
  });

  const { scrollYProgress: roadmapScrollProgress } = useScroll({
    target: roadmapSectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const unsubscribe = roadmapScrollProgress.on("change", (v) => {
      const idx = Math.min(
        roadmap.length - 1,
        Math.floor(v * roadmap.length)
      );
      setActiveRoadmap(idx);
    });
    return unsubscribe;
  }, [roadmapScrollProgress]);

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Hero Atmosphere
  const heroGlowOpacity = useTransform(smoothProgress, [0, 0.12], [1, 0]);
  const heroGlowScale = useTransform(smoothProgress, [0, 0.12], [1, 1.2]);
  const heroContentOpacity = useTransform(smoothProgress, [0, 0.1], [1, 0]);
  const heroContentY = useTransform(smoothProgress, [0, 0.1], [0, -20]);

  // Orchestration Exit
  const exitScale = useTransform(smoothProgress, [0, 0.15], [1, 1.5]);
  const exitOpacity = useTransform(smoothProgress, [0, 0.12], [1, 0]);
  const exitBlur = useTransform(smoothProgress, [0, 0.12], [0, 20]);

  // Final Clarity
  const finalOpacity = useTransform(smoothProgress, [0.8, 0.95], [0, 1]);
  const finalScale = useTransform(smoothProgress, [0.8, 0.95], [0.95, 1]);

  const wordVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: LUXURY_EASE as any },
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

  const team = [
    { name: "Ayush Awasthi", role: "Founder & CEO", image: "/team/Ayush.png", description: "Visionary leader with expertise in enterprise solutions and AI innovation" },
    { name: "Hemang Dutt Mishra", role: "Co-founder & CTO", image: "/team/Hemang.png", description: "Developer turned entrepreneur, who believes in building things that actually matter." },
    { name: "Ayushman Gupta", role: "CGO", image: "/team/Ayushman2.png", description: "An ambitious strategist of numbers and a leader of people, focused on the intersection of grounded analytics and bold entrepreneurship." },
    // { name: "Naitik Gupta", role: "CFO", image: "/team/Naitik3.png", description: "Obsessed with clarity, data, and smart decision-making, I'm building a mindset focused on long-term value and growth." },
  ];

  const roadmap = [
    { phase: "TODAY", title: "Developer Onboarding", description: "PRAXIS: Dev Workflow & Engineering Context. Nurturing human potential for industry impact by training developers on your actual stack and codebase.", icon: Users },
    { phase: "TOMORROW", title: "Developer OS", description: "Where a developer starts the day. Creating an intelligence layer with overall knowledge of the dev cycle in a company.", icon: Code },
    { phase: "THE FUTURE", title: "Imprint", description: "Implicit preference capture. Turning user behavior into structured, ML-ready signals for next-generation software.", icon: Rocket },
  ];

  const values = [
    {
      icon: Target,
      title: "Our Mission",
      description: "Help engineering teams onboard and train developers on their real codebase to reach a first meaningful PR in Week 2, bypassing traditional ramp-up delays.",
      features: [
        "First PR inside Week 2",
        "Codebase-native training",
        "Bypass traditional ramp-ups",
      ],
    },
    {
      icon: Eye,
      title: "Our Vision",
      description: "Become the global standard for AI-powered developer enablement and preference capture, building the infrastructure for the next generation of software.",
      features: [
        "Developer-led ML capture",
        "Unified engineering context",
        "Next-gen workspace standard",
      ],
    },
    {
      icon: Heart,
      title: "Our Category",
      description: "A B2B AI Engineering Workflow, and Training Platform. Bringing training, tasks, PR reviews, progress, and wikis into one workspace.",
      features: [
        "Codebase-native wiki sync",
        "Automated PR checkpoints",
        "Centralized developer metrics",
      ],
    },
  ];

  const principles = [
    { icon: Brain, title: "Solve Onboarding Ramp-up", tag: "RAMP-UP", description: "High-growth teams lose 6 months of productivity. Praxis ensures developers contribute early." },
    { icon: Users, title: "Prevent Senior Drain", tag: "EFFICIENCY", description: "Manual reviews and repetitive tasks consume 30% of their week. Praxis automates workflows." },
    { icon: Award, title: "De-risk Training Gamble", tag: "ALIGNMENT", description: "Companies gamble thousands on generic training. Praxis trains developers on your actual stack." },
    { icon: Rocket, title: "Infrastructure for Next-Gen", tag: "INFRASTRUCTURE", description: "We are building the future Developer OS where engineering context meets autonomous execution." },
  ];

  return (
    <div ref={pageRef} className="relative bg-background text-foreground font-sans selection:bg-foreground/10 overflow-clip">
      <Preloader />
      <LandingBackground />
      
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.15 } }
        }}
      >
          {/* LAYER 0: Hero */}
          <section className="relative min-h-[90vh] pt-32 pb-24 lg:pb-32 flex items-center overflow-hidden z-10">
            <div className="absolute inset-0 z-0 pointer-events-none">
              {/* Landing Page Background System */}
              <div className="absolute -top-32 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-zinc-500/14 blur-[190px]" />
              <div className="absolute right-[-6%] top-12 h-40 w-40 rounded-full border border-zinc-200/28 opacity-25" />
              <div className="absolute left-[6%] bottom-6 h-24 w-24 rounded-full border border-zinc-200/22 opacity-20" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.08),transparent_65%)]" />
              <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.06),transparent)]" />
              
              <motion.div 
                style={{ opacity: heroGlowOpacity, scale: heroGlowScale }}
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.04),transparent_70%)]" 
              />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="grid lg:grid-cols-12 gap-16 items-center">
                <div className="lg:col-span-7">
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0, transition: { duration: 1, ease: LUXURY_EASE as any } }
                    }}
                    style={{ opacity: heroContentOpacity, y: heroContentY }}
                  >
                    <motion.div
                      className="inline-flex items-center gap-3 rounded-full border border-zinc-200 bg-white/80 backdrop-blur-sm px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-8"
                    >
                      <span>Our Mission</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                      <span>Developer OS</span>
                    </motion.div>

                    <motion.h1
                      variants={{
                        hidden: { opacity: 1 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
                      }}
                      className="text-[clamp(2rem,6.5vw,4.2rem)] leading-[0.95] font-[var(--font-montserrat)] tracking-tight text-foreground"
                    >
                      <span className="block lg:whitespace-nowrap">{renderWords("AI Workspaces Built")}</span>
                      <motion.span
                        variants={wordVariants}
                        className="block lg:whitespace-nowrap bg-gradient-to-r from-foreground via-zinc-500 to-foreground text-transparent bg-clip-text pb-2 lg:pb-4"
                      >
                        for Actual Codebases
                      </motion.span>
                    </motion.h1>

                    <motion.p
                      variants={{
                        hidden: { opacity: 1 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.6 } }
                      }}
                      className="mt-8 max-w-xl text-lg text-zinc-500 leading-relaxed"
                    >
                      {renderWords(
                        "We help engineering teams onboard and train developers directly on their actual codebase, turning every hire into a Day-1 contributor."
                      )}
                    </motion.p>

                    <motion.div
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { delay: 0.7, duration: 1 } }
                      }}
                      className="mt-10 flex flex-wrap gap-5"
                    >
                      <RollingButton variant="primary" href="/preregister">Try Praxis</RollingButton>
                      <RollingButton variant="secondary" href="/contact">Book Demo</RollingButton>
                    </motion.div>
                  </motion.div>
                </div>

                <div className="lg:col-span-5 relative">
                  <SophisticatedOrchestration 
                    exitScale={exitScale} 
                    exitOpacity={exitOpacity} 
                    exitBlur={exitBlur} 
                  />
                </div>
              </div>
            </div>
          </section>

          {/* LAYER 1: Corporate Surface */}
          <section className="relative z-20 py-16 lg:py-28 border-t border-border/50 bg-background">
             <motion.div 
               initial={{ opacity: 0, y: 40 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, amount: 0.1 }}
               transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
               className="w-full"
             >
               <div className="max-w-7xl mx-auto px-4">
                  <div className="text-left max-w-4xl mb-20">
                    <div className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-zinc-500 mb-8">
                      <Building2 className="h-4 w-4" />
                      <span>Legal Identity</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-6 leading-tight text-zinc-500 font-normal">
                      Praxis operates under <br />
                      <span className="text-foreground font-semibold">Ayu Kiyo Private Limited</span>
                    </h2>
                    <p className="text-lg text-zinc-700 leading-relaxed max-w-2xl mb-8">
                      Praxis is officially recognized under the Startup India initiative, developing advanced B2B AI orchestration tools for software engineering pipelines and corporate workflows.
                    </p>
                    <div className="mt-10 flex flex-wrap gap-4">
                      {[
                        { name: "Startup India", desc: "Recognized Startup" },
                        { name: "DPIIT", desc: "Govt. of India Certified" },
                        { name: "StartinUP", desc: "UP Govt. Initiative" },
                        { name: "Amity Innovation Incubator", desc: "Supported & Incubated" }
                      ].map((rec) => (
                        <div key={rec.name} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/10 px-5 py-3 hover:border-foreground/30 hover:bg-background transition-colors duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                          <div className="h-2 w-2 rounded-full bg-foreground" />
                          <div className="text-left">
                            <div className="text-sm font-semibold tracking-wide text-foreground">{rec.name}</div>
                            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">{rec.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-background/50 shadow-2xl shadow-zinc-500/5 mt-16">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
                      {[
                        { icon: Globe, value: "$1T+", label: "AI B2B SAAS MARKET" },
                        { icon: Users, value: "1.1M", label: "AI TALENT SHORTAGE" },
                        { icon: TrendingUp, value: "$444.86B", label: "CORP TRAINING SPEND" },
                        { icon: Zap, value: "Day-1", label: "CONTRIBUTOR VALUE" },
                      ].map((stat, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.1 }}
                          className="p-10 text-center flex flex-col items-center group hover:bg-muted/30 transition-all duration-300"
                        >
                          <div className="h-12 w-12 rounded-full border border-border/60 flex items-center justify-center mb-8 bg-background shadow-sm group-hover:scale-110 transition-transform">
                            <stat.icon className="h-5 w-5 text-foreground" />
                          </div>
                          <div className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-3">{stat.value}</div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{stat.label}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
               </div>
             </motion.div>
          </section>          {/* LAYER 2: Story Section */}
          <div
            ref={roadmapSectionRef}
            className="relative bg-background border-t border-border/50 lg:h-[180vh] h-auto z-20"
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
                      className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-zinc-500 mb-8"
                    >
                      <Rocket className="h-4 w-4" />
                      <span>The Praxis Genesis</span>
                    </motion.div>
                    <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-6 leading-[1.1] text-foreground">
                      From Vision to <br className="hidden md:block" /><span className="text-zinc-500">Day-1 Contribution.</span>
                    </h2>
                    <p className="text-lg text-zinc-500 leading-relaxed max-w-xl">
                      Praxis was founded to eliminate expensive 6-month ramp-ups and senior engineer drain, building the future Developer OS where onboarding and training happen directly on the real codebase.
                    </p>

                    <div className="mt-10 relative">
                      {/* Persistent vertical line */}
                      <div className="absolute left-[17px] top-4 bottom-4 w-[2px] bg-border/40" />

                      <div className="space-y-4">
                        {roadmap.map((item, idx) => (
                          <div
                            key={item.title}
                            onClick={() => setActiveRoadmap(idx)}
                            className={`relative pl-12 pr-4 py-3 cursor-pointer lg:cursor-default transition-all duration-500 ${activeRoadmap === idx
                                ? "text-foreground"
                                : "text-zinc-400"
                              }`}
                          >
                            {/* Step indicator circle */}
                            <div
                              className={`absolute left-0 top-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-500 z-10 ${activeRoadmap >= idx
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border/60 bg-background/60"
                                }`}
                            >
                              {activeRoadmap > idx ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                idx + 1
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className={`text-base font-semibold transition-colors duration-500 ${activeRoadmap === idx ? "text-foreground" : "text-zinc-400"}`}>
                                {item.title}
                              </div>
                              <AnimatePresence>
                                {activeRoadmap === idx && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className="text-sm text-zinc-500 leading-relaxed"
                                  >
                                    {item.description}
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
                  <div className="hidden lg:block relative h-[520px] w-full rounded-[2.5rem] border border-border/60 bg-background/80 p-8 sm:p-10 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.08),_transparent_60%)]" />
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeRoadmap}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -24 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="relative"
                      >
                        <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                          Phase {activeRoadmap + 1} of {roadmap.length}
                        </div>
                        <div className="mt-3 text-2xl font-semibold">
                          {roadmap[activeRoadmap].title}
                        </div>
                        <div className="mt-10 pt-10 border-t border-border/50 flex flex-col h-full">
                          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-6">
                            Target Outcomes
                          </div>
                          <div className="grid grid-cols-1 gap-y-4 mb-10">
                            {activeRoadmap === 0 ? (
                              <>
                                <div className="flex items-center gap-3 text-zinc-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                                  <span className="text-sm font-medium">First PR inside Week 2</span>
                                </div>
                                <div className="flex items-center gap-3 text-zinc-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                                  <span className="text-sm font-medium">Eliminate senior dev review drain</span>
                                </div>
                                <div className="flex items-center gap-3 text-zinc-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                                  <span className="text-sm font-medium">Real codebase-native training</span>
                                </div>
                              </>
                            ) : activeRoadmap === 1 ? (
                              <>
                                <div className="flex items-center gap-3 text-zinc-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                                  <span className="text-sm font-medium">Full visibility into project lifecycles</span>
                                </div>
                                <div className="flex items-center gap-3 text-zinc-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                                  <span className="text-sm font-medium">Unified workspace environment</span>
                                </div>
                                <div className="flex items-center gap-3 text-zinc-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                                  <span className="text-sm font-medium">AI workspace coordinator core</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-3 text-zinc-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                                  <span className="text-sm font-medium">Implicit user preference capture</span>
                                </div>
                                <div className="flex items-center gap-3 text-zinc-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                                  <span className="text-sm font-medium">ML-ready behavioral analytics</span>
                                </div>
                                <div className="flex items-center gap-3 text-zinc-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                                  <span className="text-sm font-medium">Autonomous feedback loops</span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* System Visualization */}
                          <div className="mt-auto">
                            <div className="rounded-2xl bg-muted/40 p-5 border border-border/40 backdrop-blur-sm shadow-inner">
                              <div className="flex items-center justify-between mb-4">
                                <div className="text-[9px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-foreground/50 animate-pulse" />
                                  Roadmap Step: {roadmap[activeRoadmap].phase}
                                </div>
                                <div className="text-[9px] font-mono text-zinc-400">
                                  ROADMAP_PHASE_{activeRoadmap + 1}
                                </div>
                              </div>

                              {activeRoadmap === 0 && (
                                <div className="space-y-3">
                                  <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                                    <span>Codebase Sync Progress</span>
                                    <span>94%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: "94%" }}
                                      className="h-full bg-foreground"
                                    />
                                  </div>
                                </div>
                              )}

                              {activeRoadmap === 1 && (
                                <div className="space-y-3">
                                  <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                                    <span>Workspace Active Threads</span>
                                    <span>8 active</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: "70%" }}
                                      className="h-full bg-foreground"
                                    />
                                  </div>
                                </div>
                              )}

                              {activeRoadmap === 2 && (
                                <div className="space-y-3">
                                  <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                                    <span>Preference Capture Sync</span>
                                    <span>Active logs</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: "100%" }}
                                      className="h-full bg-foreground"
                                    />
                                  </div>
                                </div>
                              )}
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
          <GlobalRecognitionSection />

          {/* LAYER 3: Core Pillars - SOFT ZINC SURFACE */}
          <section className="relative z-30 py-16 lg:py-28 bg-muted/10 border-t border-border/50">
             <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.03),transparent_70%)]" />
             
             <div className="max-w-7xl mx-auto px-4 relative z-10">
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-left mb-24 max-w-3xl"
                >
                  <div className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-zinc-500 mb-6">
                    <Target className="h-4 w-4" />
                    <span>Foundation</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-foreground">Our Core Pillars.</h2>
                </motion.div>

                <div className="mt-14 grid gap-10 md:grid-cols-3">
                  {values.map((value, idx) => (
                    <motion.div
                      key={value.title}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="border-t border-border/60 pt-8 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background">
                          <value.icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-xl font-semibold">{value.title}</h3>
                      </div>
                      <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                        {value.description}
                      </p>
                      <ul className="mt-6 space-y-3 text-sm text-zinc-600">
                        {value.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <Check className="h-4 w-4 text-foreground mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
             </div>
          </section>

          {/* LAYER 4: Principles & Team */}
          <section className="relative z-40 py-16 lg:py-28 bg-background border-t border-border/50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid lg:grid-cols-12 gap-16 lg:gap-24 items-start mb-32">
                <div className="lg:col-span-5 lg:sticky lg:top-28 self-start">
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col items-start text-left"
                  >
                    <div className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-zinc-500 mb-8">
                      <Lightbulb className="h-4 w-4" />
                      <span>Guiding Light</span>
                    </div>
                    <h3 className="text-3xl md:text-5xl font-semibold tracking-tight mb-8 leading-[1.1] text-foreground">Foundational Principles.</h3>
                    <p className="text-lg text-zinc-500 leading-relaxed">
                      The core philosophy that governs how we build products and evolve our AI systems.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-zinc-500">
                      <span>Autonomy</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                      <span>Talent</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                      <span>Compliance</span>
                    </div>
                  </motion.div>
                </div>
                <div className="lg:col-span-7 divide-y divide-border/50 lg:pl-2 text-left">
                  {principles.map((principle, idx) => (
                    <motion.div
                      key={principle.title}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.08 }}
                      className="flex items-start gap-5 py-6"
                    >
                      <motion.div
                        whileHover={{ scale: 1.08 }}
                        className="mt-1 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background shrink-0"
                      >
                        <principle.icon className="h-5 w-5 text-zinc-500" />
                      </motion.div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-foreground">
                            {principle.title}
                          </h3>
                          <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                            {principle.tag}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
                          {principle.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-left mb-16"
              >
                <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">Meet the Team.</h2>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {team.map((member, idx) => (
                  <OperatorCard key={idx} member={member} />
                ))}
              </div>
            </div>
          </section>

          {/* LAYER 5: Next-Gen Tech - DARK ENTERPRISE CARD STYLE */}
          <section className="py-16 lg:py-28 bg-background relative z-10 border-t border-border/50">
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

                <div className="grid lg:grid-cols-2 gap-14 relative z-10 text-left">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-zinc-400">
                      <Cpu className="h-3 w-3" />
                      The Core
                    </div>
                    <h2 className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight text-white">
                      Built on Next-Gen Tech.
                    </h2>
                    <p className="mt-6 text-lg text-zinc-400 leading-relaxed">
                      Advanced AI systems, neural integrations, enterprise-grade security, and high-performance global scale built for enterprise workloads.
                    </p>
                    <ul className="mt-10 space-y-5">
                      {[
                        "Autonomous predictive bottlenecks",
                        "Real-time resource optimization",
                        "Seamless CI/CD & pipeline connectivity",
                        "Sub-50ms latency edge network"
                      ].map((item, i) => (
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

                  <div className="space-y-8 lg:border-l lg:border-zinc-800/80 lg:pl-8">
                    {[
                      { label: "AI CORE", value: "Adaptive", desc: "Predictive bottlenecks and real-time optimization." },
                      { label: "INTEGRATION", value: "CI/CD Native", desc: "Seamless pipeline and enterprise connectivity." },
                      { label: "SECURITY", value: "Secure Data", desc: "Enterprise-grade data encryption at the edge." },
                      { label: "SCALE", value: "< 50ms Edge", desc: "Global distribution with low-latency delivery." }
                    ].map((metric, i) => (
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
                          {metric.desc}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* LAYER 6: Final Clarity */}
          <section className="py-16 lg:py-28 bg-background text-center relative z-10 border-t border-border/50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <motion.div style={{ opacity: finalOpacity, scale: finalScale }}>
                <h2 className="text-[clamp(2.4rem,6vw,5rem)] font-[var(--font-montserrat)] tracking-tight text-foreground">
                  Ready to orchestrate?
                </h2>
                <p className="mt-6 text-lg text-zinc-500">
                  Take the next step in enterprise intelligence and autonomous delivery.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                  <RollingButton variant="primary" href="/preregister">Try Praxis</RollingButton>
                </div>
              </motion.div>
            </div>
          </section>
        </motion.div>

      <div className="h-32 bg-background" />
    </div>
  );
};

export default AboutUs;
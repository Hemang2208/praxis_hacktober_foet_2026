"use client";

import React, { useRef } from "react";
import Preloader from "@/components/ui/Preloader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  MapPin,
  Clock,
  // Users,
  Mail,
  Send,
  Heart,
  Calendar,
  Home,
  GraduationCap,
  ExternalLink,
  DollarSign,
  Layers,
  Globe,
  BookOpen,
  Shield,
  Coffee,
  // IndianRupee,
  Sparkles,
  // ChevronRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { jobListings } from "@/components/jobListings";

const wordVariants = {
  hidden: { opacity: 0, y: 15, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any },
  },
};

const renderWords = (text: string) =>
  text.split(" ").map((word, i) => (
    <motion.span
      key={i}
      variants={wordVariants}
      className="inline-block mr-[0.2em] whitespace-nowrap"
    >
      {word}
    </motion.span>
  ));

const perks = [
  {
    title: "Flexible Work Schedule",
    description:
      "Enjoy a balanced 25-30 hour work week with flexible timing that fits your lifestyle.",
    icon: Calendar,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Creative Workspace",
    description:
      "Our Lucknow office is designed to inspire with comfortable work areas, meeting spaces, and chill zones.",
    icon: Home,
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Learning & Growth",
    description:
      "We actively promote continuous learning through mentorship, training, and hands-on experience with cutting-edge tech.",
    icon: GraduationCap,
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Competitive Compensation",
    description:
      "We offer attractive pay packages with performance bonuses and regular reviews.",
    icon: DollarSign,
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    title: "Diverse Projects",
    description:
      "Work on a variety of challenging projects across different industries and technologies.",
    icon: Layers,
    color: "bg-red-50 text-red-600",
  },
  {
    title: "Global Exposure",
    description:
      "Opportunity to work with international clients and expand your professional network.",
    icon: Globe,
    color: "bg-indigo-50 text-indigo-600",
  },
];

const benefits = [
  {
    title: "Skill Development",
    description:
      "Regular training sessions and workshops to enhance your skills",
    icon: BookOpen,
    color: "bg-cyan-50 text-cyan-700",
  },
  {
    title: "Work-Life Balance",
    description: "Flexible hours and hybrid options to suit your lifestyle",
    icon: Coffee,
    color: "bg-amber-50 text-amber-700",
  },
  {
    title: "Health & Wellness",
    description: "Support for your physical and mental wellbeing",
    icon: Heart,
    color: "bg-rose-50 text-rose-700",
  },
  {
    title: "Job Security",
    description: "Stable growth path with long-term opportunities",
    icon: Shield,
    color: "bg-emerald-50 text-emerald-700",
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-foreground/10 font-sans">
      <Preloader />
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-border/50">
        {/* Atmospheric elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -top-32 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-zinc-500/10 blur-[190px]" />
          <div className="absolute right-[-10%] top-20 h-64 w-64 rounded-full border border-border/20 opacity-20" />
          <div className="absolute left-[-10%] bottom-0 h-64 w-64 rounded-full border border-border/20 opacity-20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.05),transparent_70%)]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-8"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Join the AI Revolution • Lucknow / Remote</span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08 } }
            }}
            className="text-[clamp(2.5rem,6vw,5rem)] leading-[0.92] font-[var(--font-montserrat)] tracking-tight mb-8"
          >
            {renderWords("Build the Future of")}
            <motion.span
              variants={wordVariants}
              className="block bg-gradient-to-r from-foreground via-zinc-500 to-foreground text-transparent bg-clip-text pb-2 lg:pb-4"
            >
              Developer OS
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-zinc-500 mb-10 leading-relaxed"
          >
            Help us build Kiyo, the AI workflow platform and Developer OS for engineering teams. Work on codebase-native training, automated PR reviews, and implicit preference capture.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-4"
          >
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group relative h-14 px-10 bg-foreground text-background rounded-full font-semibold tracking-wide transition-all shadow-[0_24px_60px_-40px_rgba(0,0,0,0.7)] overflow-hidden border-none text-sm"
              onClick={() => document.getElementById("job")?.scrollIntoView({ behavior: "smooth" })}
            >
              <span className="relative flex items-center justify-center h-[1.4em] overflow-hidden leading-none">
                <span className="w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full whitespace-nowrap">
                  <Briefcase className="h-4 w-4" />
                  View Open Positions
                </span>
                <span className="absolute inset-0 w-full h-full flex items-center justify-center gap-2 transition-transform duration-300 translate-y-full group-hover:translate-y-0 whitespace-nowrap">
                  <Briefcase className="h-4 w-4" />
                  View Open Positions
                </span>
              </span>
            </motion.button>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto py-12">
        <div className="max-w-6xl mx-auto">
          {/* Why Join Us */}
          <div className="mb-24 mt-24">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-6"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Why Join Us</span>
              </motion.div>
              <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-tight mb-6">
                A Workplace That Values You
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {perks.map((perk, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ y: -8 }}
                  className="group relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-background/50 p-10 transition-all duration-300 hover:shadow-2xl hover:shadow-zinc-500/5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 inline-flex p-4 rounded-2xl border border-border/60 bg-background mb-8 group-hover:scale-110 transition-transform">
                    <perk.icon className="h-7 w-7" />
                  </div>
                  <h3 className="relative z-10 text-2xl font-semibold mb-5">
                    {perk.title}
                  </h3>
                  <p className="relative z-10 text-zinc-500 leading-relaxed">
                    {perk.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Kiyo Standard Grid */}
          <div className="mb-24 mt-12">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-6"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>The Kiyo Standard</span>
              </motion.div>
              <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-tight mb-6">
                Redefining the Employee Experience
              </h2>
            </div>

            <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-background/50 shadow-2xl shadow-zinc-500/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
                {[
                  { icon: Clock, value: "30h", label: "AVERAGE WORK WEEK" },
                  { icon: Globe, value: "100%", label: "REMOTE & HYBRID" },
                  { icon: Sparkles, value: "2x", label: "FAST-TRACK GROWTH" },
                  // { icon: DollarSign, value: "Equity", label: "KIYO OWNERSHIP" },
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-10 text-center flex flex-col items-center group hover:bg-muted/30 transition-colors"
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

          {/* Job Listings */}
          <div id="job" className="mb-24 scroll-mt-24">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-6"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Open Positions</span>
              </motion.div>
              <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-tight mb-6">
                Find Your Perfect Role
              </h2>
            </div>

            <div className="space-y-4">
              {jobListings.map((job, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 80 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="group relative overflow-hidden border border-border/60 bg-background/50 backdrop-blur-sm transition-all duration-300 hover:border-border/80 hover:shadow-2xl hover:shadow-zinc-500/5 rounded-[2rem]">
                    <CardContent className="p-8">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background group-hover:scale-110 transition-transform">
                          <job.icon className="h-7 w-7" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <h3 className="text-2xl font-semibold tracking-tight">{job.title}</h3>
                            <Badge variant="outline" className="bg-muted/30 text-[10px] uppercase tracking-widest px-3 py-1">
                              {job.department}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-xs text-zinc-500 font-medium uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {job.experience}
                            </span>
                            {/* {job.pay && (
                              <span className="flex items-center gap-1.5">
                                <IndianRupee className="h-3.5 w-3.5" />
                                {job.pay}
                              </span>
                            )} */}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 mt-4 lg:mt-0">
                          {job.isOpen ? (
                            <Link
                              href={`/careers/apply?position=${encodeURIComponent(job.title)}`}
                              className="group relative h-12 px-8 flex items-center justify-center bg-black dark:bg-white dark:text-black text-white rounded-full text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden shadow-md w-full sm:w-auto"
                            >
                              <span className="relative inline-block h-[1.4em] overflow-hidden align-middle leading-none">
                                <span className="flex items-center gap-2 transition-transform duration-300 group-hover:-translate-y-full">
                                  <Send className="h-4 w-4" /> Apply Now
                                </span>
                                <span className="absolute left-0 top-full flex items-center gap-2 transition-transform duration-300 group-hover:-translate-y-full">
                                  <Send className="h-4 w-4" /> Apply Now
                                </span>
                              </span>
                            </Link>
                          ) : (
                            <div className="h-12 px-8 flex items-center justify-center bg-zinc-400 dark:bg-zinc-700 text-white dark:text-zinc-300 rounded-full text-sm font-semibold cursor-not-allowed shadow-sm w-full sm:w-auto">
                              Opening Soon
                            </div>
                          )}
                          <Link
                            href={`/careers/${job.id}`}
                            className={`h-12 px-6 flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background hover:bg-muted/50 transition-colors text-sm font-medium w-full sm:w-auto ${
                              job.isOpen ? "text-foreground" : "text-zinc-400 dark:text-zinc-500"
                            }`}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Job Details
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mb-24">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-6"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Employee Benefits</span>
              </motion.div>
              <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-tight mb-6">
                More Than Just a Salary
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index: number) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ y: -6 }}
                  className="group p-8 rounded-[2rem] border border-border/60 bg-background/50 backdrop-blur-sm text-center transition-all duration-300 hover:shadow-2xl hover:shadow-zinc-500/5"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background mb-6 group-hover:scale-110 transition-transform">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{benefit.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Open Application */}
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-24 relative overflow-hidden rounded-[3rem] border border-border/60 bg-white dark:bg-muted/20 p-12 text-center"
          >
            <div className="absolute inset-0 z-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[500px] rounded-full bg-zinc-500/10 blur-[100px]" />
            </div>
            
            <div className="relative z-10">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-border/60 bg-background mb-8">
                <Heart className="h-8 w-8 text-foreground" />
              </div>
              <h3 className="text-3xl font-semibold tracking-tight mb-4">
                Don&apos;t See Your Dream Job?
              </h3>
              <p className="max-w-2xl mx-auto text-zinc-500 text-lg mb-10 leading-relaxed">
                We&apos;re always looking for talented people. Send us your
                resume and we&apos;ll contact you when a matching position
                opens up.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/careers/apply"
                  className="group relative h-14 px-10 flex items-center justify-center bg-black text-white rounded-full text-sm font-semibold transition-transform hover:scale-[1.02] overflow-hidden shadow-[0_24px_60px_-40px_rgba(0,0,0,0.7)]"
                >
                  <span className="relative inline-block h-[1.4em] overflow-hidden align-middle leading-none">
                    <span className="block transition-transform duration-300 group-hover:-translate-y-full">
                      Submit General Application
                    </span>
                    <span className="absolute left-0 top-full block transition-transform duration-300 group-hover:-translate-y-full">
                      Submit General Application
                    </span>
                  </span>
                </Link>
                <Link
                  href="/careers/apply/intern"
                  className="group relative h-14 px-10 flex items-center justify-center rounded-full border border-border/60 bg-background/50 backdrop-blur-sm text-sm font-semibold transition-colors hover:bg-muted/50 overflow-hidden"
                >
                  <span className="relative inline-block h-[1.4em] overflow-hidden align-middle leading-none">
                    <span className="block transition-transform duration-300 group-hover:-translate-y-full">
                      Apply for Internship
                    </span>
                    <span className="absolute left-0 top-full block transition-transform duration-300 group-hover:-translate-y-full">
                      Apply for Internship
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Contact HR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <Card className="rounded-[2rem] border border-border/60 bg-background/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Mail className="h-6 w-6" />
                  Have Questions?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                  <div className="max-w-xl">
                    <p className="text-zinc-500 leading-relaxed mb-6">
                      For any queries regarding open positions or the
                      application process, our HR team is happy to help.
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-100">
                        <Mail className="h-5 w-5" />
                      </div>
                      <a
                        href="mailto:hr@kiyoai.in"
                        className="text-lg font-semibold hover:text-zinc-500 transition-colors"
                      >
                        hr@kiyoai.in
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <a target="_blank" href="mailto:hr@kiyoai.in" className="w-full sm:w-auto">
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative h-14 px-10 overflow-hidden rounded-full bg-foreground text-sm font-semibold text-background shadow-[0_24px_60px_-40px_rgba(0,0,0,0.7)] border-none w-full sm:w-auto"
                      >
                        <span className="relative flex items-center justify-center h-[1.4em] overflow-hidden leading-none">
                          <span className="flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full whitespace-nowrap">
                            Contact HR
                            <ArrowRight className="h-4 w-4" />
                          </span>
                          <span className="absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 translate-y-full group-hover:translate-y-0 whitespace-nowrap">
                            Contact HR
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </span>
                      </motion.button>
                    </a>
                    <a
                      href="https://maps.app.goo.gl/5BVPhLTUtu5t2jeLA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto"
                    >
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="group w-full sm:w-auto rounded-full border border-border/60 bg-background/70 px-10 h-14 text-sm font-semibold text-foreground hover:border-foreground/40 transition-colors relative overflow-hidden"
                      >
                        <span className="relative flex items-center justify-center h-[1.4em] overflow-hidden leading-none">
                          <span className="flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full whitespace-nowrap">
                            Visit Office
                          </span>
                          <span className="absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 translate-y-full group-hover:translate-y-0 whitespace-nowrap">
                            Visit Office
                          </span>
                        </span>
                      </motion.button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

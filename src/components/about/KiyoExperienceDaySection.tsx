"use client";

import React from "react";
import Image from "next/image";
import { Trophy, Users, Infinity as InfinityIcon, Heart } from "lucide-react";
import { motion, animate } from "framer-motion";

const LUXURY_EASE = [0.16, 1, 0.3, 1] as const;

const stats = [
  { icon: Trophy, value: 1, suffix: "", label: "Global Award Won", infinite: false },
  { icon: Users, value: 1, suffix: "", label: "Mission Driving Us", infinite: false },
  { icon: InfinityIcon, value: 0, suffix: "", label: "Infinite Possibilities Ahead", infinite: true },
  { icon: Heart, value: 100, suffix: "%", label: "Gratitude Always", infinite: false },
];

const CountUp = ({
  value,
  suffix = "",
  infinite = false,
}: {
  value: number;
  suffix?: string;
  infinite?: boolean;
}) => {
  if (infinite) {
    return (
      <InfinityIcon className="h-8 w-8 sm:h-9 sm:w-9 text-foreground" strokeWidth={1.5} />
    );
  }

  return (
    <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
      {value}
      {suffix}
    </span>
  );
};

const OrbitalRing = ({ inset, duration }: { inset: string; duration: number }) => (
  <motion.div
    className="absolute rounded-full border border-zinc-200/70"
    style={{ inset }}
    animate={{ rotate: 360 }}
    transition={{ duration, repeat: Infinity, ease: "linear" }}
  />
);

const Particle = ({ delay, x, y }: { delay: number; x: string; y: string }) => (
  <motion.div
    className="absolute h-1.5 w-1.5 rounded-full bg-zinc-300"
    style={{ left: x, top: y }}
    animate={{ y: [0, -10, 0], opacity: [0.3, 0.7, 0.3] }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

const StatCard = ({
  icon: Icon,
  value,
  suffix,
  label,
  infinite,
  index,
}: {
  icon: React.ElementType;
  value: number;
  suffix: string;
  label: string;
  infinite: boolean;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{
      type: "spring",
      stiffness: 120,
      damping: 20,
      delay: index * 0.1,
    }}
    className="p-4 lg:p-6 text-center flex flex-col items-center group hover:bg-muted/30 transition-all duration-300"
  >
    <div className="h-10 w-10 rounded-full border border-border/60 flex items-center justify-center mb-4 bg-background shadow-sm group-hover:scale-110 transition-transform">
      <Icon className="h-4 w-4 text-foreground group-hover:text-black transition-colors" strokeWidth={1.5} />
    </div>
    <div className="h-9 sm:h-10 flex items-center justify-center mb-1.5">
      <CountUp value={value} suffix={suffix} infinite={infinite} />
    </div>
    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
      {label}
    </div>
  </motion.div>
);

const GlobalRecognitionSection = () => {
  return (
    <section className="relative z-20 py-8 lg:py-10 bg-background border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 lg:space-y-8">
        {/* ── HERO: TWO COLUMN ─────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: LUXURY_EASE }}
            className="order-2 lg:order-1 space-y-6 lg:space-y-8 lg:py-6"
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.15] text-foreground">
              Global Recognition.{" "}
              <br className="hidden sm:block" />
              Stronger{" "}
              <span className="text-zinc-500 font-normal">Purpose.</span>
            </h2>

            <p className="text-base lg:text-lg text-zinc-500 leading-[1.9] max-w-xl">
              Praxis has been recognized as the{" "}
              <strong className="font-semibold text-zinc-900">
                Project &amp; Talent Management Platform of the Year
              </strong>{" "}
              in the CorporateLiveWire Global Awards 2026/27.
            </p>
          </motion.div>

          {/* Right Column - Circular Showcase */}
          <div className="order-1 lg:order-2 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: LUXURY_EASE }}
              className="relative w-full max-w-[260px] sm:max-w-[300px] lg:max-w-[340px] aspect-square flex items-center justify-center"
            >
              {/* Soft radial shadow */}
              <div className="absolute inset-10 rounded-full bg-gradient-to-br from-zinc-100 via-zinc-50 to-transparent blur-2xl" />

              {/* Concentric orbit rings */}
              <OrbitalRing inset="4%" duration={48} />
              <OrbitalRing inset="14%" duration={68} />
              <motion.div
                className="absolute inset-6 rounded-full border border-dashed border-zinc-200/80"
                animate={{ rotate: -360 }}
                transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
              />

              {/* Tiny gray particles */}
              <Particle delay={0} x="18%" y="14%" />
              <Particle delay={1.2} x="80%" y="20%" />
              <Particle delay={2.4} x="86%" y="60%" />
              <Particle delay={0.6} x="14%" y="66%" />
              <Particle delay={1.8} x="70%" y="82%" />
              <Particle delay={3} x="30%" y="88%" />

              {/* Circular award image */}
              <div className="absolute inset-[10%] z-10 rounded-full overflow-hidden shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)]">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-full h-full"
                >
                  <Image
                    src="/winner.png"
                    alt="Praxis Global Recognition Award"
                    fill
                    sizes="(max-width: 640px) 280px, 420px"
                    className="object-cover"
                    priority
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── STATISTICS CARD ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: LUXURY_EASE }}
          className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-background/50 shadow-2xl shadow-zinc-500/5"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/60">
            {stats.map((stat, idx) => (
              <StatCard key={idx} {...stat} index={idx} />
            ))}
          </div>
        </motion.div>

        {/* ── THANK YOU CARD ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: LUXURY_EASE }}
          className="max-w-xl lg:max-w-[560px] rounded-[2.5rem] border border-border/60 bg-background shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-3 lg:gap-4">
            <div className="shrink-0 h-10 w-10 overflow-hidden md:-translate-y-1">
              <Image
                src="/cup.png"
                alt="Award cup"
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm lg:text-base font-semibold tracking-tight text-foreground">
                Thank you for being part of our journey.
              </h3>
              <p className="text-[11px] lg:text-xs text-zinc-500 leading-relaxed">
                This recognition belongs to our community, our students, our
                partners, and everyone building the future of engineering with
                AI.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default GlobalRecognitionSection;

"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Twitter,
  Instagram,
  Building2,
  Mail,
  MapPin,
  Linkedin,
  Phone,
} from "lucide-react";
import Image from "next/image";

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"],
  });

  const kiyoY = useTransform(scrollYProgress, [0, 0.8], [100, 0]);
  const kiyoScale = useTransform(scrollYProgress, [0, 0.8], [1.35, 1]);
  const kiyoOpacity = useTransform(scrollYProgress, [0.5, 0.95], [0.15, 0.65]);

  return (
    <footer ref={footerRef} className="relative z-20 overflow-hidden border-t border-border/60 bg-background text-foreground shadow-[0_-20px_60px_-30px_rgba(0,0,0,0.10)]">
      {/* Subtle ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-6%] h-72 w-72 rounded-full bg-foreground/5 blur-3xl opacity-60" />
        <div className="absolute bottom-[-140px] left-[-6%] h-96 w-96 rounded-full bg-foreground/5 blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-28 pb-0">
        {/* Top Section */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12 mb-0">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="sm:col-span-2 lg:col-span-3"
          >
            <div className="flex items-center mb-4">
              <Image
                src="/KiyoLogoBnoBG.png"
                alt="Kiyo Logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-sm bg-transparent object-contain p-1"
              />
              <span className="ml-3 text-2xl font-bold tracking-tight text-foreground">
                Kiyo
              </span>
            </div>
            <p className="mb-6 max-w-md text-[15px] leading-relaxed text-zinc-500">
              Crafting Talent, Managing Excellence with enterprise-grade AI.
            </p>
            <div className="flex items-center gap-3">
              {[
                { Icon: Twitter, href: "https://x.com/kiyoai_in" },
                { Icon: Instagram, href: "https://instagram.com/kiyoai.in" },
                {
                  Icon: Linkedin,
                  href: "https://www.linkedin.com/company/kiyoai/",
                },
              ].map(({ Icon, href }, i: number) => (
                <motion.a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border/60 bg-muted/30 p-2 text-zinc-500 transition-colors hover:border-foreground/40 hover:bg-foreground hover:text-background"
                  whileHover={{ y: -3, scale: 1.1 }}
                >
                  <Icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
            <p className="mt-8 text-xs text-zinc-500 uppercase tracking-[0.1em] leading-relaxed">
              &copy; {new Date().getFullYear()} Ayu Kiyo Private Limited. <br />
              All rights reserved.
            </p>
          </motion.div>

          {/* Resources */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="col-span-1 lg:col-span-2"
          >
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-foreground">
              Quick Links
            </h3>
            <ul className="space-y-3 text-sm text-zinc-500">
              {[
                { name: "Pre-Register", href: "/preregister" },
                { name: "Why Us?", href: "/#whyus" },
                { name: "Features", href: "/#features" },
                { name: "How it works?", href: "/#workflow" },
              ].map((link, i) => (
                <li key={i}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Company */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="col-span-1 lg:col-span-2"
          >
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-foreground">
              Company
            </h3>
            <ul className="space-y-3 text-sm text-zinc-500">
              {[
                { name: "Home", href: "/" },
                { name: "About", href: "/about" },
                { name: "Careers", href: "/careers" },
                { name: "Contact", href: "/contact" },
              ].map((link, i) => (
                <li key={i}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Legal */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="col-span-1 lg:col-span-2"
          >
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-foreground">
              Legal
            </h3>
            <ul className="space-y-3 text-sm text-zinc-500">
              {[
                { name: "Terms & Conditions", href: "/terms-and-conditions" },
                { name: "Privacy Policy", href: "/privacy-policy" },
                { name: "Cookie Policy", href: "/cookie-policy" },
              ].map((link, i) => (
                <li key={i}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="sm:col-span-2 lg:col-span-3"
          >
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-foreground">
              Contact Us
            </h3>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li className="flex items-start">
                <Building2 className="mr-3 mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
                <span>Ayu Kiyo Private Limited</span>
              </li>
              <li className="flex items-start">
                <MapPin className="mr-3 mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
                <span>
                  5/14 Sector H, Jankipuram, Lucknow, Uttar Pradesh, India —
                  226021
                </span>
              </li>
              <li className="flex items-start">
                <Mail className="mr-3 mt-0.5 h-4 w-4 text-foreground/60" />
                <span>support@kiyoai.in</span>
              </li>
              <li className="flex items-start">
                <Phone className="mr-3 mt-0.5 h-4 w-4 text-foreground/60" />
                <span>+91 83039 96674</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Big background image */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative flex select-none items-end justify-center px-4 md:px-10 -mt-8 mb-0.5 lg:mb-1"
      >
        <motion.img 
          style={{ y: kiyoY, scale: kiyoScale, opacity: kiyoOpacity }}
          src="/kiyo-large.png" 
          alt="KIYO"
          className="w-full max-w-[75vw] lg:max-w-5xl h-auto object-contain dark:invert"
        />
      </div>
    </footer>
  );
}

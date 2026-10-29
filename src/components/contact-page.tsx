"use client";

import { useState, useRef } from "react";
import Preloader from "@/components/ui/Preloader";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Send, Clock, Globe, Sparkles, MessageSquare, Phone, Zap, ArrowRight, ExternalLink, Shield, ChevronRight } from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { encrypt } from "@/lib/crypto";

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

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill all fields");
      setLoading(false);
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: encrypt(formData.name),
          email: encrypt(formData.email),
          message: encrypt(formData.message),
        }),
      });

      if (response.status == 200) {
        toast.success("Message sent successfully!");
        setFormData({ name: "", email: "", message: "" });
      } else {
        toast.error("Something went wrong. Try again.");
      }
    } catch (error: unknown) {
      console.log("Error : Sending Contact Message.", error);
      toast.error("Something went wrong. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      title: "Email Us",
      value: "support@kiyoai.in",
      icon: Mail,
      description: "Available 24/7 for your queries",
      actionLabel: "Send email",
      link: "mailto:support@kiyoai.in"
    },
    {
      title: "Visit Us",
      value: "Lucknow, UP, India",
      icon: MapPin,
      description: "Our corporate headquarters",
      actionLabel: "Get directions",
      link: "https://maps.app.goo.gl/5BVPhLTUtu5t2jeLA"
    },
    {
      title: "Response Time",
      value: "Under 24 Hours",
      icon: Zap,
      description: "Fastest response in the industry",
      actionLabel: "View FAQ",
      link: "#"
    },
    {
      title: "Global Reach",
      value: "Worldwide Support",
      icon: Globe,
      description: "Serving clients in 10+ countries",
      actionLabel: "Partner Program",
      link: "#"
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-foreground/10 font-sans">
      <Preloader />
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-border/50">
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
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Connect With Us</span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08 } }
            }}
            className="text-[clamp(2.5rem,6vw,5rem)] leading-[0.92] font-[var(--font-montserrat)] tracking-tight mb-8"
          >
            {renderWords("Let's Build Something")}
            <motion.span
              variants={wordVariants}
              className="block bg-gradient-to-r from-foreground via-zinc-500 to-foreground text-transparent bg-clip-text pb-2 lg:pb-4"
            >
              Extraordinary
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-zinc-500 mb-10 leading-relaxed"
          >
            Have questions about our AI workflow platform or interested in bringing codebase-native onboarding to your team? Our team is ready to help you build the future of developer enablement.
          </motion.p>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Info Grid */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-background/50 shadow-2xl shadow-zinc-500/5 mb-24">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
              {[
                { icon: Clock, value: "< 2h", label: "AVERAGE RESPONSE" },
                { icon: Globe, value: "24/7", label: "GLOBAL REACH" },
                { icon: Zap, value: "10+", label: "ENTERPRISE CLIENTS" },
                { icon: Shield, value: "99%", label: "CLIENT SATISFACTION" },
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

          <div className="grid lg:grid-cols-5 gap-16 items-start">
            {/* Form Container */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3"
            >
              <div className="relative overflow-hidden rounded-[3rem] border border-border/60 bg-background/80 p-8 sm:p-12 backdrop-blur-sm shadow-2xl">
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <div className="absolute top-0 right-0 h-[300px] w-[300px] bg-zinc-500/5 blur-[100px]" />
                </div>

                <div className="relative z-10">
                  <div className="mb-12">
                    <h2 className="text-3xl font-semibold tracking-tight mb-4">Send us a Message</h2>
                    <p className="text-zinc-500">We usually respond within a few hours. No robots, just humans.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid sm:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label htmlFor="full-name" className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold ml-1">Full Name</label>
                        <input
                          id="full-name"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Ayush Awasthi"
                          required
                          suppressHydrationWarning
                          className="w-full h-14 rounded-2xl border border-border/60 bg-muted/20 px-6 text-foreground placeholder:text-zinc-600 focus:border-foreground/20 focus:bg-muted/30 focus:outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label htmlFor="email-address" className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold ml-1">Email Address</label>
                        <input
                          id="email-address"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="ayush@kiyoai.in"
                          required
                          suppressHydrationWarning
                          className="w-full h-14 rounded-2xl border border-border/60 bg-muted/20 px-6 text-foreground placeholder:text-zinc-600 focus:border-foreground/20 focus:bg-muted/30 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label htmlFor="message" className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold ml-1">Message</label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={6}
                        placeholder="Tell us about your project or inquiry..."
                        required
                        suppressHydrationWarning
                        className="w-full rounded-2xl border border-border/60 bg-muted/20 p-6 text-foreground placeholder:text-zinc-600 focus:border-foreground/20 focus:bg-muted/30 focus:outline-none transition-all resize-none"
                      />
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative h-14 w-full sm:w-auto px-10 bg-foreground text-background rounded-full font-semibold tracking-wide disabled:opacity-50 overflow-hidden shadow-[0_24px_60px_-40px_rgba(0,0,0,0.7)] border-none text-sm"
                    >
                      <span className="relative inline-block h-[1.4em] overflow-hidden align-middle leading-none">
                        {loading ? (
                          <span className="flex items-center justify-center gap-2 transition-transform duration-300">
                            <Clock className="w-4 h-4 animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          <>
                            <span className="flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full">
                              <Send className="w-4 h-4" />
                              Send Message
                            </span>
                            <span className="absolute left-0 top-full flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full">
                              <Send className="w-4 h-4" />
                              Send Message
                            </span>
                          </>
                        )}
                      </span>
                    </motion.button>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* Sidebar Info */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 space-y-8"
            >
              <Card className="rounded-[2.5rem] border border-border/60 bg-background/50 p-8 backdrop-blur-sm overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles className="w-24 h-24" />
                </div>
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-2xl font-semibold">Why Contact Us?</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-6">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-muted/50 border border-border/60">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Tailored AI Solutions</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">Every business is unique. We build custom agents that fit your specific enterprise needs.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-muted/50 border border-border/60">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Security First</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">Your data security is our priority. We implement enterprise-grade data security and end-to-end encryption.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-muted/50 border border-border/60">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Rapid Deployment</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">Move from concept to production in weeks, not months, with our pre-built enterprise modules.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-foreground p-10 text-background group">
                <div className="absolute top-[-20%] right-[-20%] h-64 w-64 rounded-full bg-white/10 blur-3xl transition-transform group-hover:scale-150 duration-700" />
                <h3 className="text-2xl font-bold mb-4 relative z-10">Need a Demo?</h3>
                <p className="text-background/60 text-sm mb-8 relative z-10 leading-relaxed">
                  See KIYO in action. Let us show you how our AI can transform your project management.
                </p>
                <Link
                  href="/contact"
                  className="w-full sm:w-auto"
                >
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative w-full h-14 px-10 flex items-center justify-center bg-background text-foreground rounded-full font-semibold transition-all overflow-hidden shadow-sm text-sm"
                  >
                    <span className="relative inline-block h-[1.4em] overflow-hidden align-middle leading-none">
                      <span className="flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full">
                        Book Demo
                        <ArrowRight className="w-4 h-4" />
                      </span>
                      <span className="absolute left-0 top-full flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full">
                        Book Demo
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </span>
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Office Locations / Map Visual */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold mb-6">Our Global Presence</h2>
              <p className="text-zinc-500 leading-relaxed mb-8">
                Headquartered in the heart of Uttar Pradesh, we serve a global clientele with 
                distributed teams across multiple timezones to ensure round-the-clock innovation.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-muted/20">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-background border border-border/60">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Headquarters</h4>
                    <p className="text-xs text-zinc-500">Lucknow, Uttar Pradesh, India</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/2 aspect-video relative rounded-[3rem] border border-border/60 bg-muted/10 overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-zinc-500/10 transition-transform group-hover:scale-110 duration-700" />
              <div className="absolute inset-0 flex items-center justify-center">
                 {/* Visual representation of a map or tech grid */}
                 <div className="relative h-full w-full opacity-40">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-foreground rounded-full animate-ping" />
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-foreground rounded-full" />
                    <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-zinc-500 rounded-full opacity-50" />
                    <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-zinc-500 rounded-full opacity-50" />
                 </div>
                 <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="h-16 w-16 flex items-center justify-center rounded-3xl bg-background border border-border/60 shadow-2xl">
                        <Globe className="w-8 h-8 animate-pulse" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-400">Serving Worldwide</span>
                 </div>
              </div>
              
              <a 
                href="https://maps.app.goo.gl/5BVPhLTUtu5t2jeLA"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-8 right-8 z-20"
              >
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group rounded-full border border-border/60 bg-background/90 px-6 h-12 text-xs font-bold uppercase tracking-widest text-foreground hover:border-foreground/40 transition-colors relative overflow-hidden"
                >
                  <span className="relative inline-block h-[1.4em] overflow-hidden align-middle leading-none">
                    <span className="flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full">
                      Open in Maps
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                    <span className="absolute left-0 top-full flex items-center justify-center gap-2 transition-transform duration-300 group-hover:-translate-y-full">
                      Open in Maps
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </span>
                </motion.button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

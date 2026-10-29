"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [preloaderFinished, setPreloaderFinished] = useState(false);
  const [randomParams, setRandomParams] = useState<{
    yStart: number;
    stiffness: number;
    damping: number;
    delay: number;
  }[]>([]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/preregister", label: "Pre-Register" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);

    const timer = setTimeout(() => {
      setPreloaderFinished(true);
    }, 3000); // 3 seconds matching the preloader duration

    // Generate random speeds and starting offsets for each nav item on mount
    const params = navLinks.map(() => ({
      yStart: -120 - Math.random() * 80,    // coming from top (between -120px and -200px)
      stiffness: 90 + Math.random() * 130,   // random spring speed (stiffness 90 to 220)
      damping: 12 + Math.random() * 8,       // random damping (12 to 20)
      delay: Math.random() * 0.4,            // random staggered delay (0 to 0.4s)
    }));
    setRandomParams(params);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, []);

  return (
    <header
      className={`fixed left-1/2 top-0 z-50 w-11/12 max-w-7xl -translate-x-1/2 transition-all duration-300 rounded-3xl ${scrolled
        ? "bg-white/70 backdrop-blur-xl shadow-md py-3 mt-2"
        : "bg-transparent py-5"
        }`}
    >
      <div className="px-6 flex justify-between items-center">
        {/* Animated Logo, Name, Try Kiyo Button */}
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={preloaderFinished ? { y: 0, opacity: 1 } : { y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.15 }}
          className="flex items-center gap-4"
        >
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Praxis Logo"
                width={20}
                height={20}
                className="h-5 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Praxis</span>
          </Link>
        </motion.div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link, index) => {
            const params = randomParams[index] || {
              yStart: -60,
              stiffness: 150,
              damping: 18,
              delay: 0.2
            };
            return (
              <motion.div
                key={link.href + "-" + index}
                initial={{ y: params.yStart, opacity: 0, scale: 0.8 }}
                animate={preloaderFinished ? { y: 0, opacity: 1, scale: 1 } : { y: params.yStart, opacity: 0, scale: 0.8 }}
                transition={{
                  delay: params.delay,
                  type: "spring",
                  stiffness: params.stiffness,
                  damping: params.damping
                }}
                whileHover={{ scale: 1.05 }}
                className="relative group"
              >
                <Link
                  href={link.href}
                  className={`px-3 py-2 font-medium transition-colors ${scrolled ? "text-gray-800" : "text-black"
                    }`}
                >
                  {link.label}
                </Link>
                {/* Animated underline */}
                <motion.span
                  className="absolute left-0 bottom-0 h-[2px] bg-black w-0 group-hover:w-full"
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            );
          })}
        </nav>
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={preloaderFinished ? { y: 0, opacity: 1 } : { y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.25 }}
        >
          <Link href="/signup">
            <Button
              className="hidden md:inline-flex bg-black text-white hover:bg-gray-800 rounded-full px-5 py-2 font-semibold shadow-lg transition"
            >
              Try Praxis
            </Button>
          </Link>
        </motion.div>


        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-full"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className={`h-6 w-6 ${scrolled ? "text-gray-800" : "text-black"}`} />
          ) : (
            <Menu className={`h-6 w-6 ${scrolled ? "text-gray-800" : "text-black"}`} />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white/95 backdrop-blur-xl shadow-lg absolute top-full left-0 right-0 rounded-2xl mt-2"
          >
            <div className="flex flex-col p-6 space-y-4">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    href={link.href}
                    className="block px-4 py-2 rounded-lg font-medium text-gray-800 hover:bg-gray-100 transition"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <Link href="/signup" onClick={() => setIsOpen(false)}>
                <Button
                  className="w-full bg-black text-white hover:bg-gray-800 rounded-full px-5 py-2 font-semibold shadow-lg transition"
                >
                  Try Praxis
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </header>
  );
}

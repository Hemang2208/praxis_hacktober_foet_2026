"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader() {
  const [loading, setLoading] = useState(true);
  const [isReveal, setIsReveal] = useState(false);

  useEffect(() => {
    // Disable scroll on mount
    document.body.style.overflow = "hidden";
    
    // Start curtain opening reveal
    const logoTimer = setTimeout(() => {
      setIsReveal(true);
    }, 1500); // 1.5s logo display

    // Completely unmount preloader and restore scrolling
    const unmountTimer = setTimeout(() => {
      setLoading(false);
      document.body.style.overflow = "";
    }, 3000); // exactly 3.0s total load duration

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(unmountTimer);
      document.body.style.overflow = "";
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent select-none pointer-events-auto">
      {/* SVG Morph Curve Path in static container */}
      <svg
        className="absolute top-0 left-0 w-full h-[calc(100vh+200px)] pointer-events-none fill-[#0c0d0f]"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
      >
        <motion.path
          variants={{
            initial: {
              d: "M0 1005 S175 995 500 995 s500 5 500 5 V0 H0 Z",
            },
            animate: {
              d: [
                "M0 1005 S175 995 500 995 s500 5 500 5 V0 H0 Z", // Flat start
                "M0 502 S175 272 500 272 s500 230 500 230 V0 H0 Z",   // Deep concave cubic curve
                "M0 2 S175 1 500 1 s500 1 500 1 V0 H0 Z"          // Flat end at top
              ],
            }
          }}
          initial="initial"
          animate={isReveal ? "animate" : "initial"}
          transition={{
            duration: 1.4, // 1.4s reveal animation
            times: [0, 0.5, 1],
            ease: [
              [0.55, 0.055, 0.675, 0.19], // easeIn (power2.in)
              [0.215, 0.61, 0.355, 1]     // easeOut (power2.out)
            ],
          }}
        />
      </svg>

      {/* Central Logo and Brand Text - Slides up and fades out in sync with reveal */}
      <AnimatePresence>
        {!isReveal && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            exit={{ 
              opacity: 0, 
              y: -100, 
              filter: "blur(8px)" 
            }}
            transition={{
              duration: 0.65, // 0.65s fade out
              ease: [0.215, 0.61, 0.355, 1], // easeOut
            }}
            className="absolute inset-0 z-[110] flex items-center justify-center pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center gap-6"
            >
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  filter: [
                    "drop-shadow(0 0 12px rgba(255, 255, 255, 0.1))",
                    "drop-shadow(0 0 24px rgba(255, 255, 255, 0.25))",
                    "drop-shadow(0 0 12px rgba(255, 255, 255, 0.1))"
                  ]
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative w-12 h-12 sm:w-16 sm:h-16" // Decreased from w-16 h-16 sm:w-20 sm:h-20
              >
                <Image
                  src="/logo.png"
                  alt="Praxis Logo"
                  fill
                  priority
                  className="object-contain"
                />
              </motion.div>
              <motion.span
                animate={{
                  opacity: [0.7, 0.95, 0.7]
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-[clamp(0.85rem,1.8vw,1.2rem)] font-bold uppercase tracking-[0.25em] text-white/90 font-grotesk select-none pl-[0.25em]" // Decreased from clamp(0.95rem,2.2vw,1.5rem)
              >
                Praxis
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

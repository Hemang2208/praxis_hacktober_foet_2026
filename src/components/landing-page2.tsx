'use client';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const carouselWords = ["Manage", "Learn", "Kiyo"];
const rightWords = ["Automation", "Security", "Management", "Learning"];

export default function LandingPage() {
    const [currentWord, setCurrentWord] = useState(0);
    const [carouselDone, setCarouselDone] = useState(false);
    const [arrowHover, setArrowHover] = useState(false);
    const [fade, setFade] = useState(false);
    const [activeRight, setActiveRight] = useState(0);

    useEffect(() => {
        if (carouselDone) return;
        if (currentWord < carouselWords.length - 1) {
            const interval = setTimeout(() => {
                setCurrentWord((prev) => prev + 1);
            }, 2000);
            return () => clearTimeout(interval);
        } else {
            const timeout = setTimeout(() => {
                setCarouselDone(true);
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [currentWord, carouselDone]);

    useEffect(() => {
        const handleScroll = () => {
            setFade(window.scrollY > 40);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveRight((prev) => (prev + 1) % rightWords.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-white text-black">
            <main className="h-screen p-5 mb-[100rem]">
                <div className="bg-gray-200 p-5 h-full w-full rounded-xl relative z-10">
                    {/* Nav Component */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={carouselWords[currentWord]}
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: fade ? 0 : 1 }}
                            exit={{ y: -60, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-[7rem] flex items-center justify-center fixed top-3 left-18"
                        >
                            {carouselWords[currentWord]}
                        </motion.div>
                    </AnimatePresence>

                    {/* Center Right Component */}
                    <div className='absolute right-16 flex flex-col items-end top-1/2 transform -translate-y-1/2'>
                        {rightWords.map((word, idx) => (
                            <div
                                key={word}
                                className={`transition-colors duration-400 ${activeRight === idx ? "text-black" : "text-gray-400"}`}
                            >
                                {word}
                            </div>
                        ))}
                    </div>

                    {/* Bottom Component */}
                    <div className='absolute bottom-4 px-16 pb-3 flex w-full border justify-between items-end left-1/2 transform -translate-x-1/2'>
                        <div className='flex flex-col gap-3 items-start'>
                            <p>Kiyo connects students and companies with AI-powered <br /> internships and project management.</p>
                            <button
                                className="bg-black text-white px-5 py-3 rounded-full hover:bg-gray-800 transition-colors flex items-center gap-2 relative overflow-hidden"
                                onMouseEnter={() => setArrowHover(true)}
                                onMouseLeave={() => setArrowHover(false)}
                                style={{ minWidth: "140px" }}
                            >
                                <motion.span
                                    layout
                                    className="relative"
                                    animate={{ x: arrowHover ? 28 : 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    Pre-register
                                </motion.span>
                                <span className="relative w-6 h-6 flex items-center justify-center overflow-hidden">
                                    <AnimatePresence initial={false} mode="wait">
                                        {!arrowHover ? (
                                            <motion.span
                                                key="arrow-initial"
                                                initial={{ x: 0, opacity: 1 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                exit={{ x: 30, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="absolute"
                                            >
                                                <ArrowRight size={18} opacity={.7} />
                                            </motion.span>
                                        ) : (
                                            <motion.span
                                                key="arrow-hover"
                                                initial={{ x: -30, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                exit={{ x: 30, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="absolute"
                                            >
                                                <ArrowRight size={18} opacity={.7} />
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </span>
                            </button>
                        </div>
                        <div className="">
                            <div className="w-8 h-16 border border-gray-400 rounded-full flex justify-center pt-2">
                                <div className="w-1 h-6 bg-gray-400 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
'use client';

import {
    useState,
    // useEffect 
} from 'react';
// import { ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
// import Image from 'next/image';
// import { motion, AnimatePresence } from 'framer-motion';

// const carouselWords = ["Empower", "Connect", "Kiyo"];

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    return (
        <div className={`text-black h-[6rem] w-screen fixed z-50`}>
            {/* Header */}
            <header className="flex justify-between items-center p-6">
                {/* Logo or Title */}
                <div className={`text-4xl text-black h-12 flex items-center ${pathname === "/" && "fixed top-10 left-10 z-50"}`} style={{ minWidth: "180px" }}>
                    {pathname !== "/" &&
                        <div className='font-semibold'>Quora</div>
                    }
                </div>

                {/* Menu Button */}
                <div
                    className="fixed top-10 right-20 z-50"
                    onMouseEnter={() => setIsMenuOpen(true)}
                    onMouseLeave={() => setIsMenuOpen(false)}
                >
                    <div
                        className={`flex flex-col items-stretch bg-[#000000CC] text-white rounded-2xl transition-all duration-700 ease overflow-hidden pt-2 p-3 ${isMenuOpen ? "h-54 shadow-lg" : "h-11"
                            } w-40`}
                        style={{ minWidth: "8rem" }}
                    >
                        <button className="flex items-center justify-between px-2 pb-2 font-semibold focus:outline-none">
                            Menu
                            <div className="ml-2 h-4 w-4 transition-transform duration-500 font-[900] flex items-center justify-center" style={{ transform: isMenuOpen ? "rotate(90deg)" : "rotate(0deg)" }} ><span>:</span></div>
                        </button>
                        <div
                            className={`flex flex-col transition-opacity duration-300 ${isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                                }`}
                        >
                            <button
                                className="px-4 py-2 text-left hover:bg-gray-700 transition-colors rounded-xl"
                                onClick={() => window.location.href = "/preregister"}
                            >
                                Pre-Register
                            </button>
                            <button
                                className="px-4 py-2 text-left hover:bg-gray-700 bg-black transition-colors rounded-xl"
                                onClick={() => window.location.href = "/signup"}
                            >
                                Sign-up
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        </div>
    );
}

// function YourLandingLogoComponent() {
//     return (
//         <div className="flex items-center gap-2">
//             <Image fill src="/logo.png" alt="Logo" className="h-10 w-10" />
//             <span className="text-3xl font-bold tracking-tight">Kiyo</span>
//         </div>
//     );
// }

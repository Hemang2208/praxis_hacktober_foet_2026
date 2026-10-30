import Footer from '@/components/layout/footer'
import Navbar from '@/components/layout/navbar'
import React from 'react'

interface PublicLayoutProps {
    children: React.ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="w-full">{children}</main>
            {/* <Footer /> */}
        </div>
    )
}

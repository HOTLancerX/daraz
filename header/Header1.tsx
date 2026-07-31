'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import type { MenuItem } from '@/models/Menu';
import AuthAc from '@/components/AuthAc';
import Search from '@/components/Search';
import CartButton from '@/plugin/product/header/CartButton';

interface Header4Props {
    settings?: Record<string, any>;
    topItems?:       MenuItem[];
    mainItems?:      MenuItem[];
    rightItems?:     MenuItem[];
    mobileItems?:    MenuItem[];
    builderContent?: Record<string, any[]>;
}

export default function DarazHeader({
    settings = {},
}: Header4Props) {
    const [showAppBanner, setShowAppBanner] = useState(true);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (
            typeof window !== 'undefined' &&
            (window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone === true)
        ) {
            setIsInstalled(true);
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            setShowAppBanner(false);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowAppBanner(false);
            }
            setDeferredPrompt(null);
        } else if (isInstalled) {
            setShowAppBanner(false);
        } else {
            alert("To install the app, tap your browser's menu button (or share icon) and select 'Add to Home Screen' or 'Install App'.");
        }
    };

    const isSticky = settings.header_sticky !== 'false';
    const isTransparent = settings.header_transparent === 'true';

    // App banner settings
    const appBannerEnabled = settings.header_app_banner_enabled !== 'false';
    const appBannerTitle = settings.header_app_banner_title || 'Daraz App';
    const appBannerSubtitle = settings.header_app_banner_subtitle || 'Save more on App';
    const appBannerButton = settings.header_app_banner_button || 'Install';

    return (
        <header className={`z-50 shadow-sm transition-all duration-200 ${isSticky ? 'sticky top-0' : 'relative'} ${isTransparent ? 'bg-transparent' : 'bg-white'}`}>
            
            {/* 1. Mobile App Banner (Dismissible) */}
            {appBannerEnabled && showAppBanner && !isInstalled && (
                <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 relative">
                    <button 
                        onClick={() => setShowAppBanner(false)}
                        className="text-gray-400 hover:text-gray-600 mr-2 shrink-0"
                        aria-label="Dismiss banner"
                    >
                        <Icon icon="mdi:close" width={18} />
                    </button>

                    <div className="flex items-center flex-1 min-w-0 gap-3">
                        {/* Custom Daraz Icon */}
                        <div className="w-10 h-10 rounded-xl bg-cyan-150 flex items-center justify-center shrink-0 shadow-xs border border-cyan-100/50">
                            <Icon icon="solar:bag-bold" className="text-orange-500 w-6 h-6" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-gray-800 truncate">{appBannerTitle}</span>
                            <span className="text-[10px] text-gray-400 truncate">{appBannerSubtitle}</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleInstallClick}
                        className="px-5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xs font-bold shadow-xs active:scale-95 transition-transform"
                    >
                        {deferredPrompt ? 'Install' : appBannerButton}
                    </button>
                </div>
            )}

            {/* 2. Top Navigation Bar (Desktop View Only) */}
            <div className="hidden md:block bg-orange-600 text-white text-[11px] py-1 border-b border-orange-500/30">
                <div className="container flex items-center justify-between px-4">
                    {/* Left links */}
                    <div className="flex items-center gap-4">
                        <Link href="/" className="hover:underline opacity-90 hover:opacity-100 font-medium">SAVE MORE ON APP</Link>
                        <Link href="/" className="hover:underline opacity-90 hover:opacity-100 font-medium">SELL ON DARAZ</Link>
                        <Link href="/" className="hover:underline opacity-90 hover:opacity-100 font-medium">HELP & SUPPORT</Link>
                    </div>

                    {/* Right links */}
                    <div className="flex items-center gap-4">
                        <AuthAc style={1} />
                    </div>
                </div>
            </div>

            {/* 3. Main Header Bar */}
            <div className="bg-main text-white py-1 md:py-4">
                <div className="container flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between">
                    {/* Brand Logo */}
                    <Link href="/" className="text-xl font-extrabold text-white tracking-tight shrink-0 hidden md:flex items-center">
                        {settings.logo ? (
                            <img src={settings.logo} alt={settings.siteName || 'Daraz'} className="h-10 w-auto object-contain" />
                        ) : (
                            settings.siteName || 'Daraz'
                        )}
                    </Link>
                    <div className="max-w-2xl w-full mx-auto">
                        <Search className='w-full relative' type='product'  />
                    </div>
                    
                    {/* Desktop Cart Slot */}
                    <div className="hidden md:flex items-center gap-6 shrink-0">
                        <CartButton fontSize={26} color="#ffffff" />
                    </div>
                </div>
            </div>
        </header>
    );
}

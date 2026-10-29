"use client";

import { LogoutButton } from "@/components/LogoutButton";
import { NotificationDropdown } from "@/components/ui/NotificationDropdown";
import { useNotifications } from "@/hooks/useNotifications";

export function DashboardHeader({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen, headerToggleRef }: { isCollapsed: boolean; setIsCollapsed?: (v: boolean) => void; isMobileOpen?: boolean; setIsMobileOpen?: (v: boolean) => void; headerToggleRef?: React.RefObject<HTMLButtonElement> }) {
  const currPagee = "Dashboard";
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    refreshNotifications,
  } = useNotifications();
  const toggleAttrs: React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.RefObject<HTMLButtonElement> } = {
    "aria-label": "Toggle menu",
    "aria-expanded": isMobileOpen ? "true" : "false",
    "aria-controls": "main-navigation",
    className: "lg:hidden inline-flex items-center justify-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800",
    onClick: () => {
      if (setIsMobileOpen) setIsMobileOpen(!isMobileOpen);
      else if (setIsCollapsed) setIsCollapsed(!isCollapsed);
    },
    ref: headerToggleRef,
  };

  return (
    <header
      className={`fixed top-0 right-0 z-40 border-b bg-white dark:bg-slate-900 px-4 py-3 transition-all duration-300 ease-in-out ${
        isCollapsed ? "lg:left-[4.5rem]" : "lg:left-[16rem]"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button {...toggleAttrs}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {currPagee}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <NotificationDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            isLoading={isLoading}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onDeleteNotifications={deleteNotifications}
            onRefresh={refreshNotifications}
          />
          
          <LogoutButton />
          
          <div className="flex items-center justify-center space-x-2 cursor-pointer hover:bg-gray-200 hover:border-accent transition duration-300 ease-in-out border border-transparent rounded-md p-2"></div>
        </div>
      </div>
    </header>
  );
}

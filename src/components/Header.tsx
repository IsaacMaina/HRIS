"use client";

import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react"; // Import Bell and Menu icons
import { useState } from "react"; // Import useState
import { toast } from "sonner"; // Add this import
import { useNotifications } from "@/context/NotificationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Sidebar from "./Sidebar";
import GlobalSearch from "./common/GlobalSearch";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const getUserInitials = (name: string | null | undefined) => {
    if (!name) return "UN";
    const parts = name.split(" ");
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const getLinkClasses = (href: string) => {
    const isActive = pathname === href;
    return `py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
      isActive
        ? "border-[#006837] text-[#004B2E]"
        : "border-transparent text-[#080808] hover:border-[#006837] hover:text-[#004B2E]"
    }`;
  };

  const getDashboardHref = () => {
    if (!session?.user) return "/"; // Should not happen if session exists
    const userRole = session.user.role;
    switch (userRole) {
      case "ADMIN":
      case "HR":
        return "/admin/dashboard";
      case "FINANCE":
        return "/finance/dashboard";
      case "REPORT":
        return "/analytics/dashboard";
      case "EMPLOYEE":
      default:
        return "/employee/dashboard";
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#E5E5E5] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Logo */}
          <div className="flex items-center flex-shrink-0 mr-10">
            <Link href="/" className="text-xl font-bold text-[#006837]">
              University HRIS
            </Link>
          </div>

          {/* Navigation Links for larger screens */}
          <div className="hidden md:flex items-center flex-1">
            <nav className="flex items-center space-x-4 lg:space-x-8 mr-8">
              <Link href="/" className={getLinkClasses("/")}>
                Home
              </Link>
              {session?.user && (
                <Link
                  href={getDashboardHref()}
                  className={getLinkClasses(getDashboardHref())}
                >
                  Dashboard
                </Link>
              )}
              <Link href="/about" className={getLinkClasses("/about")}>
                About
              </Link>
              <Link href="/contact" className={getLinkClasses("/contact")}>
                Contact
              </Link>
            </nav>
            <div className="flex-1 max-w-xs lg:max-w-md">
              <GlobalSearch />
            </div>
          </div>

          {/* Right side: Notification, User, and mobile buttons */}
          <div className="flex items-center space-x-2">
            {/* Notification Bell - Shown on medium and larger screens */}
            <div className="relative hidden md:block">
              {session?.user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006837]">
                      <Bell className="h-6 w-6 text-[#006837]" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-white text-[8px] flex items-center justify-center text-white font-bold">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-80 md:w-96 backdrop-blur-md"
                    align="end"
                  >
                    <DropdownMenuLabel>
                      Notifications ({unreadCount} unread)
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <DropdownMenuItem key={n.id} asChild>
                          <Link
                            href="/notifications"
                            className="flex flex-col items-start p-2"
                            onClick={async (e) => {
                              e.preventDefault();
                              // Mark notification as read using context
                              await markAsRead(n.id);
                              // Navigate to notifications page
                              window.location.href = "/notifications";
                            }}
                          >
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-xs text-gray-500 truncate w-full">
                              {n.message}
                            </p>
                            <span className="text-xs text-gray-400">
                              {new Date(n.createdAt).toLocaleString()}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem>No new notifications</DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/notifications"
                        className="text-center text-sm text-[#006837] hover:underline"
                        onClick={async (e) => {
                          e.preventDefault();
                          // Mark all as read using context
                          await markAllAsRead();
                          // Navigate to notifications page
                          window.location.href = "/notifications";
                        }}
                      >
                        View All Notifications
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Avatar and User Info - centered vertically */}
            {session?.user ? (
              <div className="flex flex-col items-center justify-center mx-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex flex-col items-center cursor-pointer">
                      <Avatar className="cursor-pointer">
                        <AvatarImage
                          src={session.user.image || undefined}
                          alt={session.user.name || "User Avatar"}
                        />
                        <AvatarFallback>
                          {getUserInitials(session.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-600 truncate max-w-[80px]">
                        {session.user.name}
                      </span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 backdrop-blur-md">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {session.user.name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session.user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/employee/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        const toastId = toast.loading("Logging out...");
                        await signOut({ callbackUrl: "/" });
                        toast.success("Logged out successfully!", {
                          id: toastId,
                        });
                      }}
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="px-4 py-2 border border-[#006837] text-sm font-medium rounded-md text-[#006837] bg-white hover:bg-[#006837] hover:text-white"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Menu Button - Shows only on small screens */}
            <div className="flex items-center space-x-2 pl-2 relative">
              {/* Mobile Search Button - Shows expanded search on small screens */}
              <button
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className="p-2 rounded-md text-gray-700 hover:text-[#006837] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#006837] md:hidden"
              >
                <Search className="h-6 w-6" />
              </button>

              {/* Hamburger Menu Button - Shows only on mobile screens with notification badge */}
              <div className="relative">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-md text-gray-700 hover:text-[#006837] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#006837] md:hidden"
                >
                  <Menu className="h-6 w-6" />
                </button>
                {session?.user && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-white text-[8px] flex items-center justify-center text-white font-bold md:hidden">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Mobile Search Bar - Only visible when search is active on small screens */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 pb-4">
            <div className="max-w-md mx-auto">
              <GlobalSearch />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const getLinkClasses = (href: string) => {
    const isActive = pathname === href;
    return `block py-3 px-4 text-sm font-medium transition-colors ${
      isActive
        ? "bg-[#006837] text-white rounded-md"
        : "text-[#080808] hover:bg-[#006837]/10 rounded-md"
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

  const getUserInitials = (name: string | null | undefined) => {
    if (!name) return "UN";
    const parts = name.split(" ");
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-md z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-64 bg-white/90 backdrop-blur-md z-50 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Link href="/" className="text-lg font-bold text-[#006837]">
              University HRIS
            </Link>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <Link href="/" className={getLinkClasses("/")} onClick={onClose}>
            Home
          </Link>
          {session?.user && (
            <Link
              href={getDashboardHref()}
              className={getLinkClasses(getDashboardHref())}
              onClick={onClose}
            >
              Dashboard
            </Link>
          )}
          <Link href="/about" className={getLinkClasses("/about")} onClick={onClose}>
            About
          </Link>
          <Link href="/contact" className={getLinkClasses("/contact")} onClick={onClose}>
            Contact
          </Link>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={session.user.image || undefined}
                      alt={session.user.name || "User Avatar"}
                    />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 backdrop-blur-md">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">
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
                <DropdownMenuItem onClick={async () => {
                  const toastId = toast.loading('Logging out...');
                  await signOut({ callbackUrl: '/' });
                  toast.success('Logged out successfully!', { id: toastId });
                }}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="w-full">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
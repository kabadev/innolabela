"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Ship,
  Route,
  Ticket,
  FileText,
  X,
  Group,
  Users,
  Search,
  ShieldCheck,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";

type UserRole = "Admin" | "Supervisor" | "Project Lead" | "Annotators";

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  allowedRoles: UserRole[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { isMenuOpen, closeMenu } = useAppContext();
  const { user } = useUser();

  // Get user role from Clerk metadata
  const userRole = (user?.publicMetadata?.role as UserRole) || "Annotators";

  const navigation: NavigationItem[] = [
    {
      name: "Dashboard",
      href: "/controls",
      icon: LayoutDashboard,
      allowedRoles: ["Admin", "Supervisor", "Project Lead", "Project Lead"],
    },
    {
      name: "Audio Groups",
      href: "/controls/groups",
      icon: Group,
      allowedRoles: ["Admin", "Supervisor", "Project Lead", "Project Lead"],
    },

    {
      name: "Annotations",
      href: "/controls/annotations",
      icon: FileText,
      allowedRoles: ["Admin", "Supervisor", "Project Lead", "Project Lead"],
    },
    {
      name: "Users",
      href: "/controls/users",
      icon: Users,
      allowedRoles: ["Admin"],
    },
    {
      name: "Search",
      href: "/controls/search",
      icon: Search,
      allowedRoles: ["Admin", "Supervisor", "Project Lead"],
    },
    {
      name: "Review Queue",
      href: "/controls/review",
      icon: ShieldCheck,
      allowedRoles: ["Admin", "Supervisor", "Project Lead"],
    },
    {
      name: "Audit Logs",
      href: "/controls/audit",
      icon: History,
      allowedRoles: ["Admin"],
    },
  ];

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) =>
    item.allowedRoles.includes(userRole)
  );

  return (
    <>
      <div
        onClick={closeMenu}
        className={`fixed w-full h-screen opacity-0 invisible bg-white/80 z-40 ${
          isMenuOpen && "opacity-100 pointer-events-auto visible"
        }`}
      ></div>

      <div
        className={`fixed top-0 left-0  w-[250px] bg-primary dark:bg-primary/20 border-white h-screen  max-md:z-50 ${
          isMenuOpen ? "max-md:left-0" : "max-md:-left-full"
        } transition-all duration-300 ease-in-out backdrop-blur-md border-r-2 flex flex-col justify-between`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-300/30 px-6">
          <Link href="/controls">
            <Image
              src="/logohsloganwhite.jpg"
              alt="FerryWave Logo"
              width={1000}
              height={1000}
              className=" p-2 w-[150px] h-full object-contain"
            />
          </Link>

          <Button
            className="text-white md:hidden"
            variant={"ghost"}
            onClick={closeMenu}
          >
            <X />
          </Button>
        </div>
        <nav className="flex-1 space-y-3 px-3 py-4">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                onClick={closeMenu}
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-4 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/90 dark:bg-card "
                    : "text-white hover:bg-accent/50 "
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-primary" : "text-white"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-300/30  p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
              {user?.imageUrl && (
                <Image
                  src={user?.imageUrl!}
                  alt={user?.fullName || "Admin User"}
                  width={40}
                  height={40}
                  className="object-cover rounded-full"
                />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white ">
                {user?.fullName || "Admin User"}
              </p>
              <p className="text-xs text-slate-300">
                {user?.emailAddresses[0].emailAddress || "admin@ferry.gm"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

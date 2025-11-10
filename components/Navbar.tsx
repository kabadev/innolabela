"use client";
import Image from "next/image";
import React from "react";
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import { Calendar, Home, Ticket, User } from "lucide-react";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Home",
    href: "/",
    icon: <Home />,
  },
  {
    label: "Bookings",
    href: "/booking",
    icon: <Ticket />,
  },
  {
    label: "Schedules",
    href: "/schedules",
    icon: <Calendar />,
  },
  {
    label: "Profile",
    href: "/account",
    icon: <User />,
  },
];

const Navbar = () => {
  const { user } = useUser();
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 flex h-16 justify-between items-center px-6 py-4 bg-card">
      <div className="flex items-center">
        <Image
          src="/tlogohslogan.png"
          alt="FerryWave Logo"
          width={1000}
          height={1000}
          className=" p-2 w-[150px] h-full object-contain"
        />
      </div>

      {/* <div className="max-md:fixed max-md:border-t bottom-0 left-0 right-0 flex md:gap-6 justify-between max-md:z-30 max-md:bg-accent p-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center flex-col gap-2 hover:text-primary transition-colors ${
                isActive ? "text-primary" : ""
              }`}
            >
              <span className="md:hidden">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div> */}

      <div className="flex items-center gap-6">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <UserButton />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.publicMetadata.role !== "Annotators" && (
                <DropdownMenuItem asChild>
                  <Link href="/controls">Control Panel</Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild>
                <Link href="/account">Account</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="mt-4" asChild>
                <SignOutButton>
                  <Button className="w-full text-xs">Logout</Button>
                </SignOutButton>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 max-md:hidden">
              <Link href="/sign-in">
                <Button>Sign In</Button>
              </Link>
            </div>

            <Link href="/sign-in" className="md:hidden">
              <Button className="bg-primary text-white">
                <User />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

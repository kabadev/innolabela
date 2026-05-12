"use client";

import { Bell, MenuIcon, Plus, Search, Ticket, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";

export function AdminHeader() {
  const { user } = useUser();
  const { openMenu } = useAppContext();
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-2 md:px-6">
      <div className="flex flex-1 items-center gap-4">
        <Button
          className="h-8 w-8 md:hidden"
          variant="ghost"
          onClick={openMenu}
        >
          <MenuIcon className="h-8 w-8" />
        </Button>
        {/* <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search bookings, ferries, routes..."
            className="pl-10"
          />
        </div> */}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-6">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <UserButton />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href={`/`} target="_blank">Home</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href={"/account"}>Account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="mt-4 ">
                  <SignOutButton>
                    <Button className=" text-xs">Logout</Button>
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
      </div>
    </header>
  );
}

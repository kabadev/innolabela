"use client";
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import React from "react";
import { AdminSidebar } from "./components/Sidebar";
import { AdminHeader } from "./components/Navbar";

const layout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  useEffect(() => {
    // Wait for user data to load
    if (!isLoaded) return;

    // Check if user exists and has a role
    const userRole = user?.publicMetadata?.role;

    // Redirect to home if no user or no role assigned
    if (!user || !userRole) {
      router.push("/");
    }

    // Allow access for any user with a role (admin, Supervisor, TicketOfficer)
    // const allowedRoles = ["admin", "Supervisor", "TicketOfficer"];
    if (userRole === undefined || userRole === "Annotators") {
      router.push("/");
    }
  }, [user, isLoaded, router]);

  return (
    <div className="flex  h-screen overflow-hidden ">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden md:w-[calc(100%-250px)] md:ml-[250px] ">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto bg-[url('/bg.png')] bg-cover bg-no-repeat ">
          {children}
        </main>
      </div>
    </div>
  );
};

export default layout;

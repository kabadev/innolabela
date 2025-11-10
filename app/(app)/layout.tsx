import Navbar from "@/components/Navbar";
import React from "react";

const layout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <div className="bg-[url('/bg.png')] bg-cover bg-no-repeat">
      <Navbar />
      <div className="mt-16 max-md:mb-16 ">{children}</div>
    </div>
  );
};

export default layout;

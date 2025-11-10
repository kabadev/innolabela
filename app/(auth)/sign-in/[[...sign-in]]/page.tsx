import React from "react";
import { SignIn } from "@clerk/nextjs";
const page = () => {
  return (
    <div className="flex h-screen">
      <div className="flex items-center justify-center w-full md:w-[50%]">
        <SignIn />
      </div>
      <div className="hidden bg-primary h-full md:flex items-center justify-center w-full md:w-[50%]">
        <div className="w-full text-center">
          <h2 className="text-6xl text-white font-bold mb-4">Welcome Back!</h2>
          <p className="text-gray-300 mb-8">
            Please enter your credentials to access your account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default page;

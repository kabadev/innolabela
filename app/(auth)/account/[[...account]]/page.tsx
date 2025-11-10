import { UserProfile } from "@clerk/nextjs";
import React from "react";

const page = () => {
  return (
    <div className="flex h-screen">
      <div className="flex items-center justify-center w-full md:w-[60%]">
        <UserProfile
          appearance={{
            elements: {
              avatarBox: {
                display: "none",
              },

              profileSection__profile: {
                display: "none",
              },
            },
          }}
        />
      </div>
      <div className="hidden bg-primary h-full md:flex items-center justify-center w-full md:w-[40%]">
        <div className="w-full text-center">
          <h2 className="text-6xl text-white font-bold mb-4">Your account!</h2>
          <p className="text-gray-300 mb-8">
            Please update your account information and settings here.
          </p>
        </div>
      </div>
    </div>

    // <div className="w-full z-40">
    //   <UserProfile
    //     appearance={{
    //       elements: {
    //         avatarBox: {
    //           display: "none",
    //         },

    //         profileSection__profile: {
    //           display: "none",
    //         },
    //       },
    //     }}
    //   />
    // </div>
  );
};

export default page;

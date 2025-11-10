import Image from "next/image";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="">
      {/* <Navbar /> */}
      {/* Image Column */}
      <div className=" ">{children}</div>
    </div>
  );
}

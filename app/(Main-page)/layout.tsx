import React from "react";
import AuthNavbar from "@/components/auth/AuthNavbarMain";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="main-page text-gray-800">
      <div className="main-bg-glow left-[-120px] top-24 h-72 w-72 bg-[#f4c9a6]" />
      <div className="main-bg-glow right-[-120px] top-16 h-80 w-80 bg-[#d8e7ff]" />
      <div className="main-bg-glow bottom-10 left-[28%] h-64 w-64 bg-[#f7dcc3]" />
      <AuthNavbar />
      <div className="main-stage">{children}</div>
    </div>
  );
}

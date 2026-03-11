import React from "react";
import AuthNavbar from "@/components/auth/AuthNavbar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page min-h-screen text-gray-800">
      <div className="auth-bg-glow left-[-80px] top-28 h-64 w-64 bg-[#f4c9a6]" />
      <div className="auth-bg-glow bottom-12 right-[-120px] h-72 w-72 bg-[#d8e7ff]" />
      <AuthNavbar />
      <div className="auth-stage">{children}</div>
    </div>
  );
}

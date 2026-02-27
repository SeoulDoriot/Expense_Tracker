import React from "react";
import AuthNavbar from "@/components/auth/AuthNavbar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F8F8F8] text-gray-800">
      <AuthNavbar />
      {children}
    </div>
  );
}
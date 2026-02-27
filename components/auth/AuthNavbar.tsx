"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`relative text-sm transition ${
        active ? "text-white font-semibold" : "text-black-100 hover:text-white"
      }`}
    >
      {label}
      {active && (
        <span className="absolute -bottom-2 left-0 h-[2px] w-full rounded-full bg-white" />
      )}
    </Link>
  );
}

export default function AuthNavbar() {
  return (
    <header className="sticky top-0 z-50" >
      {/* glass bar (light gray like Figma) */}
      <div className="border-b shadow-md" style={{ backgroundColor: "#cccccc", borderColor: "#E5E5E5" }}>
        <div className="mx-auto max-w-7xl px-0 py-4 flex items-center">
          {/* left logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/image.png"
              alt="Smart Expense"
              width={42}
              height={42}
              className="rounded-xl"
              priority
            />
            <div className="leading-tight">
              <p className="text-1sm  -mt-0.5 text-black">Smart</p>
              <p className="text-3sm font-semibold text-black">Expense</p>
            </div>
          </div>

          {/* center nav */}
          <nav className="hidden md:flex items-center gap-8 ml-auto px-10">
            <NavItem href="/Welcome_Page" label="Welcome" />
            <NavItem href="/Log_in" label="Log-in" />
            <NavItem href="/Sign_up" label="Register" />
            <NavItem href="/support" label="Support" />
          </nav>

          {/* right search */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center gap-2 rounded-full px-5 py-2 shadow-sm" style={{ backgroundColor: "#ffffff"}}>
              <span style={{ color: "#a8a8a8" }}>⌕</span>
              <input
                className="w-44 bg-transparent outline-none text-sm text-white placeholder:text-blue-100"
                placeholder="Search"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
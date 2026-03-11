"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`relative pb-1 text-sm font-medium tracking-[0.01em] transition ${
        active ? "text-zinc-950" : "text-zinc-600 hover:text-zinc-950"
      }`}
    >
      {label}
      <span
        className={`absolute -bottom-1 left-0 h-0.5 rounded-full bg-zinc-950 transition-all ${
          active ? "w-full opacity-100" : "w-0 opacity-0"
        }`}
      />
    </Link>
  );
}

export default function AuthNavbar() {
  return (
    <header className="auth-nav-enter sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="chrome-bar mx-auto max-w-7xl rounded-[28px] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/Welcome_Page" className="flex items-center gap-3">
            <Image
              src="/image.png"
              alt="Smart Expense"
              width={42}
              height={42}
              className="rounded-2xl"
              priority
            />
            <div className="leading-tight">
              <p className="text-[13px] uppercase tracking-[0.22em] text-zinc-500">Smart</p>
              <p className="text-lg font-semibold text-zinc-950">Expense</p>
            </div>
          </Link>

          <nav className="ml-auto hidden items-center gap-8 lg:flex">
            <NavItem href="/Welcome_Page" label="Welcome" />
            <NavItem href="/Log_in" label="Log in" />
            <NavItem href="/Sign_up" label="Register" />
            <NavItem href="/support" label="Support" />
          </nav>

          <div className="chrome-search ml-auto hidden items-center gap-2 rounded-full px-4 py-2.5 md:flex lg:ml-8">
            <span className="text-zinc-400">⌕</span>
            <input
              className="w-40 bg-transparent text-sm text-zinc-700 outline-none"
              placeholder="Search pages"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

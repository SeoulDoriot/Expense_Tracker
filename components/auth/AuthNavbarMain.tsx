"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`text-[14px] transition font-medium ${
        active
          ? "text-zinc-900"
          : "text-zinc-600 hover:text-zinc-900"
      }`}
    >
      {label}
    </Link>
  );
}

export default function MainNavbar() {
  const router = useRouter();

  function handleLogout() {
    // later connect to supabase.auth.signOut()
    router.push("/Log_in");
  }

  function goProfile() {
    router.push("/Profile");
  }

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b shadow-sm" style={{ backgroundColor: "#cccccc", borderColor: "#E5E5E5" }}>
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/image.png"
              alt="Smart Expense"
              width={38}
              height={38}
              className="rounded-xl"
              priority
            />
            <div>
              <p className="text-[13px] text-zinc-700">Smart</p>
              <p className="text-[15px] font-semibold text-zinc-900">
                Expense
              </p>
            </div>
          </div>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-6 ml-auto">
            <NavItem href="/dashboard" label="Dashboard" />
            <NavItem href="/transactions" label="Transactions" />
            <NavItem href="/goals" label="Goals" />
            <NavItem href="/Report" label="Report" />
          </nav>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-4 ml-6">

            {/* Search */}
            <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-full px-4 py-2">
              <span className="text-zinc-400">⌕</span>
              <input
                className="w-40 bg-transparent outline-none text-sm text-zinc-700 placeholder:text-zinc-400"
                placeholder="Search"
              />
            </div>

            {/* Profile */}
            <div className="relative flex items-center gap-2">
              {/* Main profile button: goes to /Profile */}
              <button
                type="button"
                onClick={goProfile}
                className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 bg-white hover:bg-zinc-50 transition"
              >
                <div className="h-9 w-9 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-semibold text-zinc-700">
                  SE
                </div>
                <span className="text-sm text-zinc-800 font-medium">Seoul</span>
              </button>

              {/* Small menu button for logout */}
              <details className="relative">
                <summary
                  className="list-none cursor-pointer h-10 w-10 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 transition flex items-center justify-center text-zinc-700"
                  title="Menu"
                >
                  <span className="text-lg leading-none">⋯</span>
                </summary>

                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-zinc-200 p-4">
                  <p className="text-sm font-semibold text-zinc-900">Account</p>
                  <p className="text-xs text-zinc-500 mt-1">your@email.com</p>

                  <div className="mt-4 space-y-2 text-sm text-zinc-700">
                    <div className="flex justify-between">
                      <span>Plan</span>
                      <span className="font-medium">Free</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Theme</span>
                      <span className="font-medium">Light</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Budget</span>
                      <span className="font-medium">$0</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-4 w-full rounded-xl bg-zinc-900 text-white py-2 text-sm font-semibold hover:opacity-90"
                  >
                    Log out
                  </button>
                </div>
              </details>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
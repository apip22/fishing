"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Package,
  PackagePlus,
  RotateCcw,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

import LogoutButton from "@/components/layout/logout-button";
import ThemeToggle from "@/components/layout/theme-toggle";

type SidebarProps = {
  role: "owner" | "cashier" | "developer";
};

const ownerMenus = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "POS", href: "/pos", icon: ShoppingCart },
  { name: "Produk", href: "/products", icon: Package },
  { name: "Penjualan", href: "/sales", icon: FileText },
  { name: "Retur", href: "/returns", icon: RotateCcw },
  { name: "Pembelian", href: "/purchases", icon: PackagePlus },
  { name: "Supplier", href: "/suppliers", icon: Truck },
  { name: "Laporan", href: "/reports", icon: BarChart3 },
  { name: "User", href: "/users", icon: Users },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

const cashierMenus = [
  { name: "POS", href: "/pos", icon: ShoppingCart },
  { name: "Riwayat Penjualan Saya", href: "/sales", icon: FileText },
  { name: "Retur Saya", href: "/returns", icon: RotateCcw },
];

export default function Sidebar({ role }: SidebarProps) {
  const menus = role === "cashier" ? cashierMenus : ownerMenus;
  const pathname = usePathname();

  return (
    <aside className="w-full min-w-0 border-b border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 lg:min-h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-5">
      <div className="mb-4 flex items-center justify-between gap-3 lg:mb-10 lg:block">
        <div className="flex items-center justify-between gap-3 lg:block">
          <div>
            <h1 className="font-sans text-[26px] font-extrabold leading-none tracking-wide text-teal-700 dark:text-teal-400 md:text-[30px]">
              MEIJRVERSE°
            </h1>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Retail System
            </p>
          </div>
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </div>

        {role === "developer" ? (
          <span className="rounded-full border border-teal-200 px-3 py-1 text-xs font-medium text-teal-700 dark:border-teal-800 dark:text-teal-400 lg:mt-4 lg:inline-flex">
            Developer
          </span>
        ) : null}
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
        {menus.map((menu) => {
          const Icon = menu.icon;
          const isActive =
            pathname === menu.href ||
            (menu.href !== "/" && pathname.startsWith(`${menu.href}/`));

          return (
            <Link
              key={menu.name}
              href={menu.href}
              className={
                isActive
                  ? "flex min-h-11 shrink-0 items-center gap-3 rounded-xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700 transition-colors duration-200 dark:bg-teal-500/10 dark:text-teal-400 lg:w-full"
                  : "flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:w-full"
              }
            >
              <Icon className="h-5 w-5" />
              <span>{menu.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 hidden lg:block">
        <ThemeToggle />
      </div>

      <LogoutButton />
    </aside>
  );
}

"use client";

import { Sidebar, MobileHeader } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <MobileHeader />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">{children}</main>
    </div>
  );
}

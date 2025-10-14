import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <section className="min-h-screen grid grid-rows-[auto_1fr]">
      <header className="border-b p-4 font-semibold">Signage Dashboard</header>
      <div className="p-4">{children}</div>
    </section>
  );
}

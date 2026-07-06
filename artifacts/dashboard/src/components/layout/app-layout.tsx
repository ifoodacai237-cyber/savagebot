import React, { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensure dark mode is applied
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background relative selection:bg-primary/30">
      {/* Subtle ambient glow effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative z-0">
        <Header />
        <main className="flex-1 overflow-y-auto focus:outline-none p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

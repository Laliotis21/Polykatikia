"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";

type AppShellProps = {
  user: { email: string; role: string } | null;
  children: ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const closeNav = useCallback(() => setNavOpen(false), []);

  const openNav = useCallback(() => {
    triggerRef.current = document.activeElement;
    setNavOpen(true);
  }, []);

  useEffect(() => {
    if (!navOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    drawerRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [navOpen]);

  // Return focus to the control that opened the drawer.
  useEffect(() => {
    if (navOpen) return;
    const trigger = triggerRef.current;
    if (trigger instanceof HTMLElement) trigger.focus();
    triggerRef.current = null;
  }, [navOpen]);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-62 border-r border-border-soft bg-white/55 backdrop-blur-sm lg:block">
        <Sidebar />
      </aside>

      {navOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Κλείσιμο πλοήγησης"
            onClick={closeNav}
            className="absolute inset-0 cursor-default bg-marble-950/40 backdrop-blur-[2px]"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Πλοήγηση"
            tabIndex={-1}
            className="rise absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border-soft bg-white shadow-xl outline-none"
          >
            <button
              type="button"
              onClick={closeNav}
              aria-label="Κλείσιμο πλοήγησης"
              className="absolute top-3 right-3 flex size-10 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors duration-200 hover:bg-marble-100 hover:text-ink"
            >
              <X className="size-5" aria-hidden strokeWidth={2} />
            </button>
            <Sidebar onNavigate={closeNav} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-62">
        <TopBar onOpenNav={openNav} user={user} />
        <main
          id="main"
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8 md:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

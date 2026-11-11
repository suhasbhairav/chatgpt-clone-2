"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import AppProvider, { useApp } from "./AppProvider";
import Sidebar, { SidebarRail } from "./Sidebar";
import { DeleteDialog, RenameDialog, SearchDialog, SettingsModal } from "./Dialogs";

function Shell({ children }) {
  const { settings, updateSettings, ui, setUi, toast, streaming, stop } = useApp();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // URL-addressable UI state: ?search=<q>, ?settings=general|data|shortcuts, ?drawer=1
  useEffect(() => {
    const search = params.get("search");
    const s = params.get("settings");
    const drawer = params.get("drawer");
    if (search !== null || s !== null || drawer !== null) {
      setUi((u) => ({
        ...u,
        search: search !== null ? true : u.search,
        searchQuery: search ?? u.searchQuery,
        settings: s !== null ? true : u.settings,
        settingsTab: s && s !== "1" ? s : u.settingsTab,
        drawer: drawer !== null ? true : u.drawer,
      }));
    }
  }, [params, setUi]);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setUi((u) => (u.drawer ? { ...u, drawer: false } : u));
  }, [pathname, setUi]);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setUi((u) => ({ ...u, search: !u.search }));
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        router.push("/");
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed });
      } else if (e.key === "Escape" && streaming && !document.querySelector('[role="dialog"]')) {
        stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, setUi, settings.sidebarCollapsed, streaming, stop, updateSettings]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg font-sans text-fg">
      <div className="hidden h-full md:flex">{settings.sidebarCollapsed ? <SidebarRail /> : <Sidebar />}</div>

      {ui.drawer ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-[var(--overlay)]" onClick={() => setUi((u) => ({ ...u, drawer: false }))} />
          <div className="assist-fade absolute inset-y-0 left-0 shadow-2xl">
            <Sidebar mobile onClose={() => setUi((u) => ({ ...u, drawer: false }))} />
          </div>
        </div>
      ) : null}

      <main className="flex h-full min-w-0 flex-1 flex-col">{children}</main>

      <SearchDialog />
      <SettingsModal />
      <RenameDialog />
      <DeleteDialog />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
        {toast ? (
          <div key={toast.id} className="assist-fade rounded-full bg-[#0D0D0D] px-4 py-2 text-[14px] text-white shadow-lg dark:bg-[#ECECEC] dark:text-[#0D0D0D]">
            {toast.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}

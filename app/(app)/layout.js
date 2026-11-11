import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import ShellFallback from "@/components/ShellFallback";

export default function AppLayout({ children }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

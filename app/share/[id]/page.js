import { Suspense } from "react";
import ShareView from "@/components/ShareView";

export const metadata = { title: "Shared chat · Assist" };

export default function SharePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[14px] text-[#5D5D5D]">Loading shared chat...</div>}>
      <ShareView />
    </Suspense>
  );
}

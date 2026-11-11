"use client";

import { useParams } from "next/navigation";
import ChatView from "./ChatView";

export default function ChatRoute() {
  const { id } = useParams();
  return <ChatView key={id} id={id} />;
}

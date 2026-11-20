"use client";

import { useParams } from "next/navigation";
import { DayScreen } from "@/components/day-screen";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <DayScreen id={params.id} />;
}

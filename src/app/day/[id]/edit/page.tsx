"use client";

import { useParams } from "next/navigation";
import { WorkoutEditScreen } from "@/components/workout-edit-screen";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <WorkoutEditScreen id={params.id} />;
}

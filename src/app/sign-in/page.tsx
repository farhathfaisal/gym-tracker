"use client";

import { Suspense } from "react";
import { SignInScreen } from "@/components/sign-in-screen";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="boot">
          <div className="spinner" />
        </div>
      }
    >
      <SignInScreen />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import ApplyPage from "./apply";

export default function Careers() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <ApplyPage />
    </Suspense>
  );
}

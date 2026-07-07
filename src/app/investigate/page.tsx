"use client";

import React from "react";
import { InvestigationViewer } from "@/components/live-viewer";

export default function InvestigatePage() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <InvestigationViewer />
    </div>
  );
}

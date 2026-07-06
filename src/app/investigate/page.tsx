"use client";

import React from "react";
import { InvestigationProvider, InvestigationViewer } from "@/components/live-viewer";

export default function InvestigatePage() {
  return (
    <InvestigationProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <InvestigationViewer />
      </div>
    </InvestigationProvider>
  );
}

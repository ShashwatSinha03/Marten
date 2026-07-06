"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { InvestigationProvider, InvestigationViewer, useInvestigation } from "@/components/live-viewer";

function InvestigationContent() {
  const params = useParams();
  const { dispatch } = useInvestigation();

  useEffect(() => {
    if (params?.id && typeof params.id === "string") {
      dispatch({ type: "SET_ID", payload: params.id });
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "connected" });
    }
  }, [params?.id, dispatch]);

  return <InvestigationViewer />;
}

export default function InvestigationDetailPage() {
  return (
    <InvestigationProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <InvestigationContent />
      </div>
    </InvestigationProvider>
  );
}

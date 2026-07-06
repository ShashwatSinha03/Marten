"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from "react";
import type {
  InvestigationStatus,
  InvestigationDepth,
  EvidenceItem,
  GraphNode,
  GraphEdge,
  Finding,
  FindingSeverity,
} from "@/types";
import config from "@/lib/config";

// ─── State ──────────────────────────────────────────────────────

interface InvestigationState {
  id: string | null;
  url: string;
  depth: InvestigationDepth;
  phase: InvestigationStatus;
  progress: number;
  evidence: EvidenceItem[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  findings: Finding[];
  llmTokens: string[];
  connectionStatus: "connected" | "reconnecting" | "disconnected";
  error: string | null;
  startTime: number | null;
  duration: number;
}

const initialState: InvestigationState = {
  id: null,
  url: "",
  depth: "quick",
  phase: "pending",
  progress: 0,
  evidence: [],
  graph: { nodes: [], edges: [] },
  findings: [],
  llmTokens: [],
  connectionStatus: "disconnected",
  error: null,
  startTime: null,
  duration: 0,
};

// ─── Actions ─────────────────────────────────────────────────────

type Action =
  | { type: "RESET" }
  | { type: "SET_ID"; payload: string }
  | { type: "SET_URL"; payload: string }
  | { type: "SET_DEPTH"; payload: InvestigationDepth }
  | { type: "PHASE_CHANGE"; payload: InvestigationStatus }
  | { type: "SET_PROGRESS"; payload: number }
  | { type: "EVIDENCE_COLLECTED"; payload: EvidenceItem }
  | { type: "GRAPH_NODE_ADDED"; payload: GraphNode }
  | { type: "GRAPH_EDGE_ADDED"; payload: GraphEdge }
  | { type: "FINDING_DISCOVERED"; payload: Finding }
  | { type: "LLM_TOKEN"; payload: string }
  | { type: "SET_CONNECTION_STATUS"; payload: InvestigationState["connectionStatus"] }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "COMPLETE" }
  | { type: "SET_DURATION"; payload: number };

function reducer(state: InvestigationState, action: Action): InvestigationState {
  switch (action.type) {
    case "RESET":
      return { ...initialState };
    case "SET_ID":
      return { ...state, id: action.payload, startTime: Date.now() };
    case "SET_URL":
      return { ...state, url: action.payload };
    case "SET_DEPTH":
      return { ...state, depth: action.payload };
    case "PHASE_CHANGE":
      return { ...state, phase: action.payload };
    case "SET_PROGRESS":
      return { ...state, progress: action.payload };
    case "EVIDENCE_COLLECTED":
      return { ...state, evidence: [...state.evidence, action.payload] };
    case "GRAPH_NODE_ADDED":
      return {
        ...state,
        graph: { ...state.graph, nodes: [...state.graph.nodes, action.payload] },
      };
    case "GRAPH_EDGE_ADDED":
      return {
        ...state,
        graph: { ...state.graph, edges: [...state.graph.edges, action.payload] },
      };
    case "FINDING_DISCOVERED":
      return { ...state, findings: [...state.findings, action.payload] };
    case "LLM_TOKEN":
      return { ...state, llmTokens: [...state.llmTokens, action.payload] };
    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, phase: "failed" };
    case "COMPLETE":
      return {
        ...state,
        phase: "complete",
        duration: state.startTime ? Date.now() - state.startTime : 0,
      };
    case "SET_DURATION":
      return { ...state, duration: action.payload };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────

interface InvestigationContextValue {
  state: InvestigationState;
  dispatch: React.Dispatch<Action>;
  startInvestigation: (url: string, depth: InvestigationDepth) => void;
  abort: () => void;
}

const InvestigationContext = createContext<InvestigationContextValue | null>(
  null
);

export function useInvestigation() {
  const ctx = useContext(InvestigationContext);
  if (!ctx) {
    throw new Error(
      "useInvestigation must be used within InvestigationProvider"
    );
  }
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────

export function InvestigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);

  const connectSSE = useCallback(
    (investigationId: string) => {
      const sseConfig = config.sse;
      const url = `${config.app.url}/api/v1/investigations/${investigationId}/stream`;

      function connect() {
        dispatch({ type: "SET_CONNECTION_STATUS", payload: "reconnecting" });

        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
          dispatch({ type: "SET_CONNECTION_STATUS", payload: "connected" });
          retryCountRef.current = 0;
        };

        es.addEventListener("phase_change", (e) => {
          const data = JSON.parse(e.data);
          dispatch({ type: "PHASE_CHANGE", payload: data.phase });
        });

        es.addEventListener("progress_update", (e) => {
          const data = JSON.parse(e.data);
          dispatch({ type: "SET_PROGRESS", payload: data.progress });
        });

        es.addEventListener("evidence_collected", (e) => {
          const data = JSON.parse(e.data);
          dispatch({ type: "EVIDENCE_COLLECTED", payload: data.evidence });
        });

        es.addEventListener("graph_node_added", (e) => {
          const data = JSON.parse(e.data);
          dispatch({ type: "GRAPH_NODE_ADDED", payload: data.node });
        });

        es.addEventListener("graph_edge_added", (e) => {
          const data = JSON.parse(e.data);
          dispatch({ type: "GRAPH_EDGE_ADDED", payload: data.edge });
        });

        es.addEventListener("finding_discovered", (e) => {
          const data = JSON.parse(e.data);
          dispatch({ type: "FINDING_DISCOVERED", payload: data.finding });
        });

        es.addEventListener("llm_token", (e) => {
          const data = JSON.parse(e.data);
          dispatch({ type: "LLM_TOKEN", payload: data.token });
        });

        es.addEventListener("complete", () => {
          dispatch({ type: "COMPLETE" });
          es.close();
          eventSourceRef.current = null;
        });

        es.addEventListener("error", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            dispatch({ type: "SET_ERROR", payload: data.message || "An error occurred" });
          } catch {
            // Native error event without data — handled by onerror below
            return;
          }
          es.close();
          eventSourceRef.current = null;
        });

        es.onerror = () => {
          es.close();
          eventSourceRef.current = null;

          if (retryCountRef.current < sseConfig.maxRetries) {
            retryCountRef.current++;
            const backoff = Math.min(
              sseConfig.backoffBaseMs * Math.pow(2, retryCountRef.current - 1),
              sseConfig.backoffMaxMs
            );
            dispatch({
              type: "SET_CONNECTION_STATUS",
              payload: "reconnecting",
            });
            setTimeout(connect, backoff);
          } else {
            dispatch({
              type: "SET_CONNECTION_STATUS",
              payload: "disconnected",
            });
            dispatch({
              type: "SET_ERROR",
              payload: "Connection lost. Please try again.",
            });
          }
        };
      }

      connect();
    },
    []
  );

  const startInvestigation = useCallback(
    async (url: string, depth: InvestigationDepth) => {
      dispatch({ type: "RESET" });
      dispatch({ type: "SET_URL", payload: url });
      dispatch({ type: "SET_DEPTH", payload: depth });
      dispatch({ type: "PHASE_CHANGE", payload: "url_validating" });

      try {
        const response = await fetch("/api/v1/investigations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, depth }),
        });

        if (!response.ok) {
          const err = await response.json();
          dispatch({
            type: "SET_ERROR",
            payload: err.error?.message || "Failed to start investigation",
          });
          return;
        }

        const data = await response.json();
        dispatch({ type: "SET_ID", payload: data.investigationId });
        connectSSE(data.investigationId);
      } catch {
        dispatch({
          type: "SET_ERROR",
          payload: "Failed to start investigation. Please check the URL and try again.",
        });
      }
    },
    [connectSSE]
  );

  const abort = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });
    dispatch({ type: "PHASE_CHANGE", payload: "aborted" });
  }, []);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <InvestigationContext.Provider
      value={{ state, dispatch, startInvestigation, abort }}
    >
      {children}
    </InvestigationContext.Provider>
  );
}

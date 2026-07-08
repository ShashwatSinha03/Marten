const config = {
  app: {
    name: "Marten",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    isDev: process.env.NODE_ENV === "development",
    isProd: process.env.NODE_ENV === "production",
  },

  database: {
    url: process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/marten",
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || "s3",
    endpoint: process.env.STORAGE_ENDPOINT || "",
    region: process.env.STORAGE_REGION || "auto",
    accessKey: process.env.STORAGE_ACCESS_KEY || "",
    secretKey: process.env.STORAGE_SECRET_KEY || "",
    bucket: process.env.STORAGE_BUCKET || "marten-evidence",
    publicUrl: process.env.STORAGE_PUBLIC_URL || "",
  },

  llm: {
    provider: process.env.LLM_PROVIDER || "openai",
    apiKey: process.env.LLM_API_KEY || "",
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || "50000", 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || "0.1"),
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || "60000", 10),
  },

  browser: {
    maxConcurrent: parseInt(process.env.BROWSER_MAX_CONCURRENT || "3", 10),
    timeoutMs: parseInt(process.env.BROWSER_TIMEOUT_MS || "120000", 10),
    headless: process.env.BROWSER_HEADLESS !== "false",
  },

  limits: {
    maxInvestigationsPerMinute: parseInt(
      process.env.LIMIT_INVESTIGATIONS_PER_MINUTE || "10",
      10
    ),
    maxConcurrentPerUser: parseInt(
      process.env.LIMIT_CONCURRENT_PER_USER || "3",
      10
    ),
    maxConcurrentTotal: parseInt(
      process.env.LIMIT_CONCURRENT_TOTAL || "30",
      10
    ),
    evidencePackageMaxBytes: parseInt(
      process.env.LIMIT_EVIDENCE_PACKAGE_MB || "50",
      10
    ) * 1024 * 1024,
    graphMaxNodes: parseInt(process.env.LIMIT_GRAPH_NODES || "500", 10),
    graphMaxEdges: parseInt(process.env.LIMIT_GRAPH_EDGES || "2000", 10),
    investigationRetentionDays: parseInt(
      process.env.LIMIT_RETENTION_DAYS || "90",
      10
    ),
  },

  pipeline: {
    quickTimeoutMs: 30000,
    standardTimeoutMs: 300000,
    evidenceQuickTimeoutMs: 15000,
    evidenceStandardTimeoutMs: 60000,
    graphBuildTimeoutMs: 60000,
    llmTimeoutMs: 180000,
    reportGenerationTimeoutMs: 30000,
  },

  sse: {
    heartbeatIntervalMs: 15000,
    maxRetries: 5,
    backoffBaseMs: 1000,
    backoffMaxMs: 30000,
  },
} as const;

export default config;

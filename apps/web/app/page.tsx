import { MartenApp } from "../components/marten-app";
import { readAuthConfig } from "../lib/auth-config";
export const dynamic = "force-dynamic";
export default function Home() {
  return <MartenApp authConfigured={Boolean(readAuthConfig(process.env))} />;
}

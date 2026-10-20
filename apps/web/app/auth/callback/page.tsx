import { redirect } from "next/navigation";
import { getAuth } from "../../../lib/auth-server";
export const dynamic = "force-dynamic";
export default async function AuthCallback() {
  const auth = getAuth();
  if (!auth) return <main><h1>Sign-in is not configured</h1><a href="/">Return to Marten</a></main>;
  const { data, error } = await auth.getSession();
  if (error || !data?.user) return <main><h1>Sign-in could not be completed</h1><a href="/">Return to Marten and try again</a></main>;
  redirect("/");
}

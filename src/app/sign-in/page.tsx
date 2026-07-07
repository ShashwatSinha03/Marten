"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Logo, Button, Card } from "@/components/shared";
import { Github, Chrome, ArrowLeft } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-4" />
          <h1 className="text-xl font-semibold text-text-primary mb-1 font-display">
            Welcome back
          </h1>
          <p className="text-sm text-text-secondary">
            Sign in to access your investigations
          </p>
        </div>

        <Card padding="lg">
          <div className="space-y-3">
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              icon={<Github className="h-5 w-5" />}
              onClick={() => {
                // In production: signIn("github")
                console.log("Sign in with GitHub");
              }}
            >
              Continue with GitHub
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              icon={<Chrome className="h-5 w-5" />}
              onClick={() => {
                // In production: signIn("google")
                console.log("Sign in with Google");
              }}
            >
              Continue with Google
            </Button>
          </div>

          <p className="mt-6 text-xs text-text-tertiary text-center leading-relaxed">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </Card>
      </div>
    </div>
  );
}

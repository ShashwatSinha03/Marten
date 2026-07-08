import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/shared";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-canvas">
      <div className="mb-8">
        <Logo size="lg" className="justify-center" />
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-surface border border-border-subtle shadow-none",
            headerTitle: "font-display text-text-primary text-xl",
            headerSubtitle: "text-text-secondary text-sm",
            formButtonPrimary:
              "bg-accent hover:bg-accent-hover text-white border-none",
            formFieldLabel: "text-text-secondary text-sm",
            formFieldInput:
              "bg-transparent border border-border-subtle text-text-primary rounded-lg focus:border-accent",
            footerActionLink: "text-accent hover:text-accent-hover",
            dividerLine: "bg-border-subtle",
            dividerText: "text-text-tertiary",
            socialButtonsBlockButton:
              "border border-border-subtle bg-surface-elevated hover:bg-surface-overlay text-text-primary",
            socialButtonsBlockButtonText: "text-text-primary",
            formFieldLabelRow: "text-text-secondary",
            identityPreviewText: "text-text-primary",
            identityPreviewEditButton: "text-accent",
            formResendCodeLink: "text-accent",
            formFieldError: "text-critical",
            otpCodeFieldInput:
              "bg-transparent border border-border-subtle text-text-primary",
          },
        }}
      />
    </div>
  );
}

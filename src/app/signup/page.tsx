import { Suspense } from "react";
import { AuthForm } from "@/components/preship/auth/auth-form";

export const metadata = {
  title: "Join Preship",
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}

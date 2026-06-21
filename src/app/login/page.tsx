import { Suspense } from "react";
import { AuthForm } from "@/components/preship/auth/auth-form";

export const metadata = {
  title: "Log in · Preship",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="login" />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm, AuthFormFromParams } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Acceso · Arcade Vault",
  description: "Inicia sesión, crea tu cuenta o juega como invitado en Arcade Vault.",
};

export default function AccessPage() {
  return (
    <Suspense fallback={<AuthForm />}>
      <AuthFormFromParams />
    </Suspense>
  );
}

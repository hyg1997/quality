"use client";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, Suspense, useState, useEffect } from "react";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { Factory, Lock } from "lucide-react";
type LoginState = {
  error?: string;
  success?: boolean;
  requires2FA?: boolean;
  username?: string;
  password?: string;
} | null;
async function handleLogin(
  _: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  if (!username || !password) {
    return { error: "Todos los campos son requeridos" };
  }
  try {
    const checkResponse = await fetch("/api/auth/2fa/check-required", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData.requires2FA) {
        return {
          error: undefined,
          success: false,
          requires2FA: true,
          username,
          password,
        };
      }
    }
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    if (result?.error) {
      return { error: "Credenciales incorrectas" };
    }
    if (result?.ok) {
      return { success: true };
    }
    return { error: "Error desconocido" };
  } catch {
    return { error: "Error de conexión" };
  }
}
function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(handleLogin, null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState("");
  useEffect(() => {
    const message = searchParams.get("message");
    
    if (message === "session_expired") {
      setSessionExpiredMessage("Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.");
    }
  }, [searchParams]);

  if (state?.success) {
    router.push("/dashboard");
  }
  if (state?.requires2FA && state.username && state.password) {
    const params = new URLSearchParams({
      username: state.username,
      password: state.password,
      callbackUrl: searchParams.get("callbackUrl") || "/dashboard",
    });
    router.push(`/auth/2fa-verify?${params.toString()}`);
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Factory className="text-white h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Iniciar Sesión</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de Control de Calidad
          </p>
          
          {sessionExpiredMessage && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    {sessionExpiredMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <Card className="mt-8 shadow-lg">
          <CardContent className="p-8">
            <form className="space-y-6" action={formAction}>
              <div className="space-y-4">
                <Input
                  id="username"
                  name="username"
                  type="text"
                  label="Usuario o Email"
                  placeholder="Ingresa tu usuario o email"
                  autoComplete="username"
                  required
                />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  label="Contraseña"
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  required
                />
              </div>
              {state?.error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {state.error}
                </div>
              )}
              {searchParams.get("error") && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  Error de autenticación
                </div>
              )}
              <div className="space-y-4">
                <Button
                  type="submit"
                  loading={isPending}
                  className="w-full transform hover:scale-105 disabled:hover:scale-100"
                  icon={!isPending ? <Lock className="h-4 w-4" /> : undefined}
                >
                  {isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
                <div className="text-center">
                  <a
                    href="/auth/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
export default function SignIn() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}

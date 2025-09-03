"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useActionState } from "react";
type ResetPasswordState = {
  error?: string;
  success?: boolean;
  message?: string;
} | null;
async function handleResetPassword(
  prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  if (!token || !password || !confirmPassword) {
    return { error: "Todos los campos son requeridos" };
  }
  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden" };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }
  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json();
    if (response.ok) {
      return {
        success: true,
        message:
          "Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.",
      };
    } else {
      return { error: data.error || "Error al restablecer la contraseña" };
    }
  } catch {
    return { error: "Error de conexión. Inténtalo de nuevo." };
  }
}
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    handleResetPassword,
    null
  );
  const [token, setToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      verifyToken(tokenParam);
    } else {
      setTokenValid(false);
    }
  }, [searchParams]);
  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch("/api/auth/verify-reset-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: tokenToVerify }),
      });
      setTokenValid(response.ok);
    } catch {
      setTokenValid(false);
    }
  };
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Enlace Inválido
            </h2>
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>El enlace de recuperación es inválido o ha expirado.</p>
            </div>
            <div className="mt-6">
              <Link
                href="/auth/forgot-password"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Solicitar nuevo enlace de recuperación
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Restablecer Contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa tu nueva contraseña
          </p>
        </div>
        {state?.success ? (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Contraseña restablecida
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>{state.message}</p>
                  <p className="mt-2">
                    Serás redirigido al login en unos segundos...
                  </p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/auth/signin"
                    className="text-sm font-medium text-green-800 hover:text-green-600"
                  >
                    Ir al login ahora
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" action={formAction}>
            <input type="hidden" name="token" value={token || ""} />
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nueva Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Mínimo 8 caracteres"
                  disabled={isPending}
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirmar Nueva Contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirma tu nueva contraseña"
                  disabled={isPending}
                />
              </div>
            </div>
            {state?.error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {state.error}
              </div>
            )}
            <div>
              <button
                type="submit"
                disabled={isPending}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Restableciendo...
                  </div>
                ) : (
                  "Restablecer Contraseña"
                )}
              </button>
            </div>
            <div className="text-center">
              <Link
                href="/auth/signin"
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                ← Volver al login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
export default function ResetPassword() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

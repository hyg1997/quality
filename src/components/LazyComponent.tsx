"use client";

import { lazy, Suspense, ComponentType } from "react";
import { Loading } from "./ui";
import ErrorBoundary from "./ErrorBoundary";

interface LazyComponentProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export function createLazyComponent(
  importFunc: () => Promise<{ default: ComponentType }>,
  options: LazyComponentProps = {}
) {
  const LazyComponent = lazy(importFunc);

  return function WrappedLazyComponent(props: Record<string, unknown>) {
    const { fallback = <Loading />, errorFallback } = options;

    return (
      <ErrorBoundary fallback={errorFallback}>
        <Suspense fallback={fallback}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

export const LazyUserManagement = createLazyComponent(
  () => import("../app/(dashboard)/users/page"),
  { fallback: <Loading text="Cargando gestión de usuarios..." /> }
);

export const LazyDashboard = createLazyComponent(
  () => import("../app/(dashboard)/dashboard/page"),
  { fallback: <Loading text="Cargando dashboard..." /> }
);

export const LazySettings = createLazyComponent(
  () => import("../app/(dashboard)/settings/page"),
  { fallback: <Loading text="Cargando configuración..." /> }
);

export const Lazy2FASetup = createLazyComponent(
  () => import("../app/(dashboard)/settings/2fa/page"),
  { fallback: <Loading text="Cargando configuración 2FA..." /> }
);

export default createLazyComponent;

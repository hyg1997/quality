import { Suspense } from "react";
import ErrorBoundary from "../ErrorBoundary";
import { PageLoading } from "../ui";
interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  loading?: boolean;
}
export function PageLayout({
  children,
  title,
  actions,
  loading = false,
}: PageLayoutProps) {
  if (loading) {
    return <PageLoading />;
  }
  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {(title || actions) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-3">{actions}</div>
          )}
        </div>
      )}
      <ErrorBoundary>
        <Suspense fallback={<PageLoading />}>{children}</Suspense>
      </ErrorBoundary>
    </div>
  );
}

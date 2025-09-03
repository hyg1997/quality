import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { RotateCw } from "lucide-react";
interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "spinner" | "dots" | "pulse" | "bars";
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}
export function Loading({
  className,
  variant = "spinner",
  size = "md",
  text,
  fullScreen = false,
  ...props
}: LoadingProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };
  const containerClasses = cn(
    "flex items-center justify-center",
    fullScreen && "fixed inset-0 bg-white/80 backdrop-blur-sm z-50",
    !fullScreen && "p-4",
    className
  );
  const renderLoader = () => {
    switch (variant) {
      case "spinner":
        return (
          <RotateCw className={cn("animate-spin text-blue-600", sizes[size])} />
        );
      case "dots":
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "bg-blue-600 rounded-full animate-pulse",
                  size === "sm"
                    ? "w-2 h-2"
                    : size === "md"
                    ? "w-3 h-3"
                    : "w-4 h-4"
                )}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: "1s",
                }}
              />
            ))}
          </div>
        );
      case "pulse":
        return (
          <div
            className={cn(
              "bg-blue-600 rounded-full animate-pulse",
              sizes[size]
            )}
          />
        );
      case "bars":
        return (
          <div className="flex space-x-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "bg-blue-600 animate-pulse",
                  size === "sm"
                    ? "w-1 h-4"
                    : size === "md"
                    ? "w-1 h-6"
                    : "w-2 h-8"
                )}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: "0.8s",
                }}
              />
            ))}
          </div>
        );
      default:
        return (
          <RotateCw className={cn("animate-spin text-blue-600", sizes[size])} />
        );
    }
  };
  return (
    <div className={containerClasses} {...props}>
      <div className="flex flex-col items-center space-y-2">
        {renderLoader()}
        {text && (
          <p
            className={cn(
              "text-gray-600 font-medium",
              size === "sm"
                ? "text-xs"
                : size === "md"
                ? "text-sm"
                : "text-base"
            )}
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
}
export function PageLoading({ text = "Cargando..." }: { text?: string }) {
  return (
    <Loading
      variant="spinner"
      size="lg"
      text={text}
      fullScreen
      className="bg-white/90"
    />
  );
}
export function InlineLoading({ text }: { text?: string }) {
  return <Loading variant="spinner" size="sm" text={text} className="py-2" />;
}
export default Loading;

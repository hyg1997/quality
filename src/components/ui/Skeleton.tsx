import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  lines?: number;
}
export function Skeleton({
  className,
  variant = "default",
  width,
  height,
  lines = 1,
  ...props
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-gray-700";
  const variants = {
    default: "rounded-md",
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-none",
  };
  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };
  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              variants.text,
              index === lines - 1 ? "w-3/4" : "w-full",
              className
            )}
            style={style}
            {...props}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={cn(baseClasses, variants[variant], className)}
      style={style}
      {...props}
    />
  );
}
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="text" lines={3} />
      <div className="flex space-x-2">
        <Skeleton width={80} height={32} />
        <Skeleton width={80} height={32} />
      </div>
    </div>
  );
}
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <Skeleton variant="text" width="30%" />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="p-4 flex items-center space-x-4">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" width="50%" />
            </div>
            <div className="flex space-x-2">
              <Skeleton width={60} height={24} />
              <Skeleton width={60} height={24} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default Skeleton;

"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Check, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationItemProps {
  notification: Notification;
  onClose: (id: string) => void;
  index: number;
  position:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
}

const typeConfig = {
  success: {
    icon: Check,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-600",
    titleColor: "text-green-900",
    messageColor: "text-green-700",
  },
  error: {
    icon: AlertTriangle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
    titleColor: "text-red-900",
    messageColor: "text-red-700",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-600",
    titleColor: "text-yellow-900",
    messageColor: "text-yellow-700",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    titleColor: "text-blue-900",
    messageColor: "text-blue-700",
  },
};

const getAnimationClasses = (position: string, isVisible: boolean) => {
  const isRight = position.includes("right");
  const isLeft = position.includes("left");
  const isCenter = position.includes("center");

  if (!isVisible) {
    if (isRight) return "translate-x-full opacity-0";
    if (isLeft) return "-translate-x-full opacity-0";
    if (isCenter) return "scale-95 opacity-0";
    return "translate-x-full opacity-0";
  }

  return "translate-x-0 opacity-100 scale-100";
};

export function NotificationItem({
  notification,
  onClose,
  index,
  position,
}: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const config = typeConfig[notification.type];
  const Icon = config.icon;

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  }, [onClose, notification.id]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration, handleClose]);

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full max-w-sm overflow-hidden rounded-lg shadow-lg transition-all duration-300 ease-in-out transform",
        config.bgColor,
        config.borderColor,
        "border",
        getAnimationClasses(position, isVisible && !isLeaving),
        isLeaving && "opacity-0 scale-95"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex w-full p-4">
        <div className="flex-shrink-0">
          <Icon className={cn("h-5 w-5", config.iconColor)} />
        </div>

        <div className="ml-3 flex-1">
          <p className={cn("text-sm font-medium", config.titleColor)}>
            {notification.title}
          </p>
          {notification.message && (
            <p className={cn("mt-1 text-sm", config.messageColor)}>
              {notification.message}
            </p>
          )}
        </div>

        <div className="ml-4 flex flex-shrink-0">
          <button
            type="button"
            className={cn(
              "inline-flex rounded-md p-1.5 transition-colors duration-200",
              "hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2",
              config.iconColor.replace("text-", "focus:ring-")
            )}
            onClick={handleClose}
            aria-label="Cerrar notificación"
          >
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </div>
      </div>

      {/* Progress bar for timed notifications */}
      {notification.duration && notification.duration > 0 && (
        <div className="absolute bottom-0 left-0 h-1 w-full bg-black/10">
          <div
            className={cn(
              "h-full transition-all ease-linear",
              config.iconColor.replace("text-", "bg-")
            )}
            style={{
              width: "100%",
              animation: `shrink ${notification.duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

export default NotificationItem;

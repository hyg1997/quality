"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/contexts/AppContext";
import { NotificationItem } from "./NotificationItem";
import { cn } from "@/lib/utils";

interface NotificationContainerProps {
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
  maxNotifications?: number;
  className?: string;
}

const positionClasses = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-center": "top-4 left-1/2 transform -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 transform -translate-x-1/2",
};

export function NotificationContainer({
  position = "top-right",
  maxNotifications = 5,
  className,
}: NotificationContainerProps) {
  const { state, removeNotification } = useApp();

  const visibleNotifications = state.notifications.slice(0, maxNotifications);

  useEffect(() => {
    if (typeof window === "undefined") return;
  }, []);

  if (typeof window === "undefined") {
    return null;
  }

  if (visibleNotifications.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed z-50 flex flex-col space-y-2 pointer-events-none",
        positionClasses[position],
        className
      )}
      role="region"
      aria-label="Notificaciones"
    >
      {visibleNotifications.map((notification, index) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
          index={index}
          position={position}
        />
      ))}
    </div>,
    document.body
  );
}

export default NotificationContainer;

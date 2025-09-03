"use client";
import { useEffect } from "react";
import { Plus, Check, AlertTriangle, Info } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
interface NotificationProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  onClose: (id: string) => void;
}
function NotificationItem({
  id,
  type,
  title,
  message,
  onClose,
}: NotificationProps) {
  const icons = {
    success: Check,
    error: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
  };
  const colors = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };
  const iconColors = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
    info: "text-blue-400",
  };
  const Icon = icons[type];
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);
  return (
    <div
      className={cn(
        "max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden",
        "transform transition-all duration-300 ease-in-out"
      )}
    >
      <div className={cn("p-4 border-l-4", colors[type])}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={cn("h-5 w-5", iconColors[type])} />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => onClose(id)}
            >
              <span className="sr-only">Cerrar</span>
              <Plus className="h-5 w-5 rotate-45" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export function NotificationContainer() {
  const { state, removeNotification } = useApp();
  if (state.notifications.length === 0) {
    return null;
  }
  return (
    <div className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50">
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        {state.notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            {...notification}
            onClose={removeNotification}
          />
        ))}
      </div>
    </div>
  );
}
export default NotificationContainer;

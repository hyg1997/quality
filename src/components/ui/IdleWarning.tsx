"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface IdleWarningProps {
  remainingTime: number;
  onExtendSession: () => void;
  onLogout: () => void;
  isVisible: boolean;
}

export function IdleWarning({
  remainingTime,
  onExtendSession,
  onLogout,
  isVisible,
}: IdleWarningProps) {
  const [timeLeft, setTimeLeft] = useState(remainingTime);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          onLogout();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, onLogout]);

  useEffect(() => {
    setTimeLeft(remainingTime);
  }, [remainingTime]);

  if (!isVisible) return null;

  const seconds = Math.ceil(timeLeft / 1000);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Sesión por Expirar
            </h3>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            Tu sesión expirará por inactividad en:
          </p>
          <div className="text-center">
            <span className="text-3xl font-bold text-red-600">{seconds}</span>
            <span className="text-sm text-gray-500 ml-1">segundos</span>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onExtendSession}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Continuar Sesión
          </button>
          <button
            onClick={onLogout}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export default IdleWarning;

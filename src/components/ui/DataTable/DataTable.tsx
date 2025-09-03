"use client";
import { ReactNode, useCallback, memo } from "react";
import { ArrowLeft, ArrowRight, Menu, Search, X } from "lucide-react";
import Button from "../Button";
import { cn } from "@/lib/utils";
export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  cell?: (item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  width?: string;
}
export interface ActionDef<T> {
  label: string;
  onClick: (item: T) => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: (item: T) => boolean;
  hidden?: (item: T) => boolean;
}
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  actions?: ActionDef<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    pageSize: number;
    totalItems: number;
  };
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onClear?: () => void;
    isSearching?: boolean;
  };
}
function DataTableComponent<T extends Record<string, unknown>>({
  data,
  columns,
  actions,
  loading = false,
  emptyMessage = "No hay datos disponibles",
  onRowClick,
  className,
  pagination,
  search,
}: DataTableProps<T>) {
  const getCellValue = useCallback((item: T, column: ColumnDef<T>) => {
    if (column.cell) {
      return column.cell(item);
    }
    const value = item[column.key as keyof T];
    if (value === null || value === undefined) {
      return "-";
    }
    return String(value);
  }, []);
  const getVisibleActions = useCallback(
    (item: T) => {
      if (!actions) return [];
      return actions.filter((action) => !action.hidden?.(item));
    },
    [actions]
  );
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-100 overflow-hidden",
        className
      )}
    >
      {}
      {search && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder || "Buscar..."}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {search.value && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {search.isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                ) : (
                  <button
                    onClick={() => {
                      search.onChange("");
                      search.onClear?.();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={String(column.key) + index}
                  className={cn(
                    "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          {}
          {loading ? (
            <tbody>
              {[...Array(5)].map((_, index) => (
                <tr key={index}>
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="px-6 py-4">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4">
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-20"></div>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          ) : !data || data.length === 0 ? (
            <tbody>
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="p-12 text-center"
                >
                  <div className="text-gray-400 mb-4">
                    <Menu className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sin datos
                  </h3>
                  <p className="text-gray-600">{emptyMessage}</p>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y divide-gray-200">
              {data.map((item, rowIndex) => {
                const visibleActions = getVisibleActions(item);
                return (
                  <tr
                    key={rowIndex}
                    className={cn(
                      "hover:bg-gray-50 transition-colors",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((column, colIndex) => (
                      <td
                        key={String(column.key) + colIndex}
                        className={cn(
                          "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                          column.className
                        )}
                      >
                        {getCellValue(item, column)}
                      </td>
                    ))}
                    {actions && actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {visibleActions.map((action, actionIndex) => (
                            <Button
                              key={actionIndex}
                              size="sm"
                              variant={action.variant || "secondary"}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(item);
                              }}
                              disabled={action.disabled?.(item)}
                              icon={action.icon}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>
      {pagination && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {(pagination.currentPage - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(
              pagination.currentPage * pagination.pageSize,
              pagination.totalItems
            )}{" "}
            de {pagination.totalItems} resultados
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                pagination.onPageChange(pagination.currentPage - 1)
              }
              disabled={pagination.currentPage <= 1}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-700">
              Página {pagination.currentPage} de {pagination.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                pagination.onPageChange(pagination.currentPage + 1)
              }
              disabled={pagination.currentPage >= pagination.totalPages}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
export default DataTable;

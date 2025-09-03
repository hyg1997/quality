import { apiClient, type ApiResponse } from "./base";
export interface Control {
  id: string;
  recordId: string;
  parameterId?: string;
  parameterName: string;
  fullRange: string;
  controlValue?: number;
  textControl?: string;
  parameterType?: string;
  observation?: string;
  outOfRange: boolean;
  alertMessage?: string;
  createdAt: string;
  parameter?: {
    id: string;
    name: string;
    type: string;
    expectedValue?: string;
    minRange?: number;
    maxRange?: number;
    unit?: string;
  };
}
export interface Photo {
  id: string;
  recordId: string;
  filename: string;
  base64Data: string;
  createdAt: string;
}
export interface QualityControlRecord {
  id?: string;
  productId: string;
  internalLot: string;
  supplierLot?: string;
  quantity: number;
  registrationDate?: string;
  observations?: string;
  verifiedBy: string;
  controls: CreateControlData[];
  photos: CreatePhotoData[];
}
export interface CreateControlData {
  parameterId?: string;
  parameterName: string;
  fullRange: string;
  controlValue?: number;
  textControl?: string;
  parameterType: string;
  observation?: string;
  outOfRange?: boolean;
  alertMessage?: string;
}
export interface CreatePhotoData {
  filename: string;
  base64Data: string;
}
export interface ParameterForControl {
  id: string;
  name: string;
  type: "range" | "text" | "numeric";
  expectedValue?: string;
  minRange?: number;
  maxRange?: number;
  unit?: string;
  required: boolean;
  active: boolean;
}
export class ControlService {
  async getParametersForControl(
    productId: string
  ): Promise<ApiResponse<ParameterForControl[]>> {
    return apiClient.get<ParameterForControl[]>(`/api/controls/parameters/${productId}`);
  }
  async createQualityControl(
    data: QualityControlRecord
  ): Promise<ApiResponse<{ recordId: string; message: string }>> {
    return apiClient.post<{ recordId: string; message: string }>("/api/controls", data);
  }
  async getQualityControl(recordId: string): Promise<ApiResponse<{
    record: {
      id: string;
      productId: string;
      internalLot: string;
      supplierLot?: string;
      quantity: number;
      registrationDate: string;
      observations?: string;
      userId: string;
      createdAt: string;
      product?: {
        id: string;
        name: string;
        code?: string;
      };
      user?: {
        id: string;
        fullName: string;
        email: string;
      };
    };
    controls: Control[];
    photos: Photo[];
  }>> {
    return apiClient.get<{
      record: {
        id: string;
        productId: string;
        internalLot: string;
        supplierLot?: string;
        quantity: number;
        registrationDate: string;
        observations?: string;
        userId: string;
        createdAt: string;
        product?: {
          id: string;
          name: string;
          code?: string;
        };
        user?: {
          id: string;
          fullName: string;
          email: string;
        };
      };
      controls: Control[];
      photos: Photo[];
    }>(`/api/controls/${recordId}`);
  }
  validateControlValue(
    value: string,
    parameterType: string,
    expectedValue?: string,
    minRange?: number,
    maxRange?: number
  ): { isValid: boolean; message?: string } {
    if (!value || value.trim() === '') {
      return { isValid: true };
    }
    if (parameterType === "range" || parameterType === "numeric") {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return {
          isValid: false,
          message: `Valor '${value}' no es numérico.`
        };
      }
      if (parameterType === "range" && minRange !== undefined && maxRange !== undefined) {
        if (numValue < minRange || numValue > maxRange) {
          return {
            isValid: false,
            message: `Valor ${numValue} está fuera de rango (${minRange} - ${maxRange}).`
          };
        }
      }
    } else if (parameterType === "text") {
      if (expectedValue) {
        const normalizedExpected = this.normalizeText(expectedValue);
        const normalizedEntered = this.normalizeText(value);
        if (normalizedEntered !== normalizedExpected) {
          return {
            isValid: false,
            message: `El valor '${value}' no coincide con el esperado '${expectedValue}'.`
          };
        }
      }
    }
    return { isValid: true };
  }
  normalizeText(text: string): string {
    if (typeof text !== "string") return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "")
      .replace(/þ/g, "")
      .replace(/[\u00A0\u202F\u2000-\u200A\u205F\u3000]/g, " ")
      .replace(/[^a-z0-9\s.,\-/°²³ñ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }
  getFullRangeText(
    parameterType: string,
    expectedValue?: string,
    minRange?: number,
    maxRange?: number,
    unit?: string
  ): string {
    if (parameterType === "range" && minRange !== undefined && maxRange !== undefined) {
      return `${minRange} - ${maxRange}${unit ? ` ${unit}` : ''}`;
    } else if (parameterType === "text" && expectedValue) {
      return expectedValue;
    } else if (parameterType === "numeric" && expectedValue) {
      return expectedValue;
    }
    return "N/A";
  }
  formatParameterType(type: string): string {
    switch (type) {
      case "range":
        return "Rango";
      case "text":
        return "Texto";
      case "numeric":
        return "Numérico";
      default:
        return type;
    }
  }
  getValidationColor(isValid: boolean): string {
    return isValid ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
  }
  canGeneratePDF(record: QualityControlRecord): boolean {
    return !!(record.productId && record.internalLot && record.quantity && record.verifiedBy);
  }
}
export const controlService = new ControlService();
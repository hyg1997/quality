"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  Camera,
} from "lucide-react";
import Image from "next/image";
import { PageLayout } from "@/components/layouts/AppLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { useNotifications } from "@/hooks/useNotifications";
import {
  controlService,
  type QualityControlRecord,
  type ParameterForControl,
  type CreateControlData,
} from "@/services/api/controls";
import { productService, type Product } from "@/services/api/products";

interface ControlFormData {
  productId: string;
  internalLot: string;
  supplierLot: string;
  quantity: number;
  observations: string;
  verifiedBy: string;
}

interface ParameterControl {
  parameterId: string;
  parameterName: string;
  parameterType: string;
  fullRange: string;
  expectedValue?: string;
  minRange?: number;
  maxRange?: number;
  unit?: string;
  controlValue: string;
  observation: string;
  isValid: boolean;
  validationMessage?: string;
}

export default function QualityControlPage() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const { success, error } = useNotifications();

  const [formData, setFormData] = useState<ControlFormData>({
    productId: "",
    internalLot: "",
    supplierLot: "",
    quantity: 0,
    observations: "",
    verifiedBy: session?.user?.fullName || "",
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [parameters, setParameters] = useState<ParameterForControl[]>([]);
  const [controls, setControls] = useState<ParameterControl[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      photoUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoUrls]);

  useEffect(() => {
    if (session?.user?.fullName) {
      setFormData((prev) => ({
        ...prev,
        verifiedBy: session.user.fullName,
      }));
    }
  }, [session]);

  const loadProducts = useCallback(async () => {
    try {
      const response = await productService.getProducts({ limit: 100 });
      if (response.success && response.data) {
        setProducts(response.data.products);
      }
    } catch {
      error("Error al cargar productos", "No se pudieron cargar los productos");
    }
  }, [error]);

  useEffect(() => {
    if (session && hasPermission("content:read")) {
      loadProducts();
    }
  }, [session, hasPermission, loadProducts]);

  const loadParameters = async (productId: string) => {
    try {
      setLoading(true);
      const response = await controlService.getParametersForControl(productId);
      if (response.success && response.data) {
        setParameters(response.data);

        const initialControls: ParameterControl[] = response.data.map(
          (param) => ({
            parameterId: param.id,
            parameterName: param.name,
            parameterType: param.type,
            fullRange: controlService.getFullRangeText(
              param.type,
              param.expectedValue,
              param.minRange,
              param.maxRange,
              param.unit
            ),
            expectedValue: param.expectedValue,
            minRange: param.minRange,
            maxRange: param.maxRange,
            unit: param.unit,
            controlValue: "",
            observation: "",
            isValid: true,
            validationMessage: undefined,
          })
        );

        setControls(initialControls);
      }
    } catch {
      error(
        "Error al cargar parámetros",
        "No se pudieron cargar los parámetros del producto"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productId: string) => {
    setFormData((prev) => ({ ...prev, productId }));
    if (productId) {
      loadParameters(productId);
    } else {
      setParameters([]);
      setControls([]);
    }
  };

  const handleControlValueChange = (index: number, value: string) => {
    setControls((prev) => {
      const updated = [...prev];
      const control = updated[index];

      control.controlValue = value;

      const validation = controlService.validateControlValue(
        value,
        control.parameterType,
        control.expectedValue,
        control.minRange,
        control.maxRange
      );

      control.isValid = validation.isValid;
      control.validationMessage = validation.message;

      return updated;
    });
  };

  const handleObservationChange = (index: number, observation: string) => {
    setControls((prev) => {
      const updated = [...prev];
      updated[index].observation = observation;
      return updated;
    });
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newPhotos = [...photos, ...files].slice(0, 2);
    setPhotos(newPhotos);

    const newUrls = [...photoUrls];
    files.forEach((file, index) => {
      if (photos.length + index < 2) {
        newUrls.push(URL.createObjectURL(file));
      }
    });
    setPhotoUrls(newUrls.slice(0, 2));
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      const modal = document.createElement("div");
      modal.className =
        "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-4 max-w-md w-full mx-4">
          <div class="text-center mb-4">
            <h3 class="text-lg font-semibold">Tomar Foto</h3>
          </div>
          <div class="relative">
            <video id="camera-video" class="w-full rounded-lg" autoplay playsinline></video>
            <canvas id="camera-canvas" class="hidden"></canvas>
          </div>
          <div class="flex justify-center space-x-4 mt-4">
            <button id="capture-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              📷 Capturar
            </button>
            <button id="cancel-btn" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              Cancelar
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      const modalVideo = modal.querySelector(
        "#camera-video"
      ) as HTMLVideoElement;
      const canvas = modal.querySelector("#camera-canvas") as HTMLCanvasElement;
      const captureBtn = modal.querySelector("#capture-btn");
      const cancelBtn = modal.querySelector("#cancel-btn");

      modalVideo.srcObject = stream;

      const cleanup = () => {
        stream.getTracks().forEach((track) => track.stop());
        document.body.removeChild(modal);
      };

      captureBtn?.addEventListener("click", () => {
        const context = canvas.getContext("2d");
        canvas.width = modalVideo.videoWidth;
        canvas.height = modalVideo.videoHeight;
        context?.drawImage(modalVideo, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob && photos.length < 2) {
              const file = new File([blob], `photo-${Date.now()}.jpg`, {
                type: "image/jpeg",
              });
              const newPhotos = [...photos, file];
              const newUrls = [...photoUrls, URL.createObjectURL(file)];
              setPhotos(newPhotos);
              setPhotoUrls(newUrls);
            }
            cleanup();
          },
          "image/jpeg",
          0.8
        );
      });

      cancelBtn?.addEventListener("click", cleanup);
    } catch {
      error(
        "Error de cámara",
        "No se pudo acceder a la cámara. Verifica los permisos."
      );
    }
  };

  const removePhoto = (index: number) => {
    if (photoUrls[index]) {
      URL.revokeObjectURL(photoUrls[index]);
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (
      !formData.productId ||
      !formData.internalLot ||
      !formData.quantity ||
      !formData.verifiedBy
    ) {
      error(
        "Campos requeridos",
        "Por favor completa todos los campos obligatorios"
      );
      return false;
    }

    if (formData.quantity <= 0) {
      error("Cantidad inválida", "La cantidad debe ser mayor a 0");
      return false;
    }

    return true;
  };

  const handleSaveAndGeneratePDF = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      console.log("Preparing photos data, count:", photos.length);
      const photosData = await Promise.all(
        photos.map(async (photo, index) => {
          console.log(`Processing photo ${index + 1}:`, {
            name: photo.name,
            size: photo.size,
            type: photo.type,
          });

          const base64 = await controlService.fileToBase64(photo);
          const base64Data = base64.split(",")[1];

          console.log(`Photo ${index + 1} base64 length:`, base64Data.length);

          return {
            filename: photo.name,
            base64Data: base64Data,
          };
        })
      );

      console.log(
        "Final photos data:",
        photosData.map((p) => ({
          filename: p.filename,
          base64Length: p.base64Data.length,
        }))
      );

      const controlsData: CreateControlData[] = controls.map((control) => ({
        parameterId: control.parameterId,
        parameterName: control.parameterName,
        fullRange: control.fullRange,
        controlValue:
          control.parameterType === "text"
            ? undefined
            : parseFloat(control.controlValue) || undefined,
        textControl:
          control.parameterType === "text" ? control.controlValue : undefined,
        parameterType: control.parameterType,
        observation: control.observation,
        outOfRange: !control.isValid,
        alertMessage: control.validationMessage,
      }));

      const qualityRecord: QualityControlRecord = {
        productId: formData.productId,
        internalLot: formData.internalLot,
        supplierLot: formData.supplierLot,
        quantity: formData.quantity,
        observations: formData.observations,
        verifiedBy: formData.verifiedBy,
        controls: controlsData,
        photos: photosData,
      };

      console.log("Sending quality record with photos:", {
        photosCount: qualityRecord.photos.length,
        controlsCount: qualityRecord.controls.length,
        internalLot: qualityRecord.internalLot,
      });

      const response = await controlService.createQualityControl(qualityRecord);

      console.log("Response from server:", response);

      if (response.success) {
        success(
          "Registro guardado",
          "El control de calidad ha sido guardado exitosamente"
        );

        clearForm();
      } else {
        error(
          "Error al guardar",
          response.error || "No se pudo guardar el registro"
        );
      }
    } catch {
      error("Error inesperado", "Ha ocurrido un error al guardar el registro");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      productId: "",
      internalLot: "",
      supplierLot: "",
      quantity: 0,
      observations: "",
      verifiedBy: session?.user?.fullName || "",
    });
    setParameters([]);
    setControls([]);
    setPhotos([]);
  };

  const getValidationIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-red-500" />
    );
  };

  const getOutOfRangeCount = () => {
    return controls.filter(
      (control) => !control.isValid && control.controlValue
    ).length;
  };

  if (status === "loading") {
    return (
      <PageLayout title="Cargando...">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </PageLayout>
    );
  }

  if (!session || !hasPermission("content:create")) {
    return (
      <PageLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acceso Restringido
          </h3>
          <p className="text-gray-600">
            No tienes permisos para acceder al control de calidad.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Control de Calidad">
      <div className="max-w-6xl mx-auto">
        {/* Header with date/time */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Registro de Producto
          </h2>
          <p className="text-lg font-semibold text-blue-600">
            {currentDateTime.toLocaleString()}
          </p>
        </div>

        {/* Basic Information Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Información Básica
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lote Interno *
              </label>
              <input
                type="text"
                value={formData.internalLot}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    internalLot: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingrese el lote interno"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guía
              </label>
              <input
                type="text"
                value={formData.supplierLot}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    supplierLot: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Número de guía (opcional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad *
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Cantidad del producto"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto *
              </label>
              <select
                value={formData.productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccione un producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.code ? `(${product.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verificado por *
            </label>
            <input
              type="text"
              value={formData.verifiedBy}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, verifiedBy: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              placeholder="Nombre del verificador"
              readOnly
              required
            />
          </div>
        </div>

        {/* Parameters Control Table */}
        {parameters.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Control de Calidad
              </h3>
              {getOutOfRangeCount() > 0 && (
                <div className="flex items-center text-red-600">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  <span className="font-medium">
                    {getOutOfRangeCount()} valor(es) fuera de rango
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="border border-gray-300 px-4 py-3 text-left">
                      Parámetro
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left">
                      Rango
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left">
                      Control
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left">
                      Observaciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {controls.map((control, index) => (
                    <tr key={control.parameterId} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium">
                        {control.parameterName}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        {control.fullRange}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type={
                              control.parameterType === "text"
                                ? "text"
                                : "number"
                            }
                            step={
                              control.parameterType !== "text"
                                ? "0.01"
                                : undefined
                            }
                            value={control.controlValue}
                            onChange={(e) =>
                              handleControlValueChange(index, e.target.value)
                            }
                            className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              control.isValid
                                ? "border-gray-300"
                                : "border-red-500 bg-red-50"
                            }`}
                            placeholder={
                              control.parameterType === "text"
                                ? `Verificar: ${control.expectedValue || ""}`
                                : "Ingrese valor"
                            }
                            title={control.validationMessage}
                          />
                          {getValidationIcon(control.isValid)}
                        </div>
                        {!control.isValid && control.validationMessage && (
                          <p className="text-red-600 text-xs mt-1">
                            {control.validationMessage}
                          </p>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <textarea
                          value={control.observation}
                          onChange={(e) =>
                            handleObservationChange(index, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="Observaciones..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* General Observations */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Observaciones Generales
          </h3>
          <textarea
            value={formData.observations}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, observations: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Observaciones generales del registro..."
          />
        </div>

        {/* Photo Upload */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Evidencia Fotográfica
          </h3>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subir Fotos (máximo 2)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={photos.length >= 2}
                />
              </div>

              <div className="flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  O tomar foto
                </label>
                <button
                  type="button"
                  onClick={handleCameraCapture}
                  disabled={photos.length >= 2}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Tomar Foto
                </button>
              </div>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative border border-gray-300 rounded-lg overflow-hidden"
                  >
                    {/* Image Preview */}
                    {photoUrls[index] && (
                      <div className="aspect-video bg-gray-100 relative">
                        <Image
                          src={photoUrls[index]}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}

                    {/* Photo Info */}
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-600 truncate block">
                            {photo.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(photo.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <button
                          onClick={() => removePhoto(index)}
                          className="ml-2 text-red-600 hover:text-red-800 font-bold text-lg leading-none"
                          title="Eliminar foto"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {photos.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  No hay fotos seleccionadas
                </p>
                <p className="text-xs text-gray-500">
                  Puedes subir archivos o tomar fotos con la cámara
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center">
          <button
            onClick={handleSaveAndGeneratePDF}
            disabled={loading || !formData.productId}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Guardar y Generar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}

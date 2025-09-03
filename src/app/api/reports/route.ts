import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session, PERMISSIONS.ANALYTICS?.READ)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");
    const reportType = searchParams.get("type") || "summary";

    const where: {
      registrationDate?: {
        gte?: Date;
        lte?: Date;
      };
      productId?: string;
      status?: string;
    } = {};

    if (startDate && endDate) {
      where.registrationDate = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    if (productId) {
      where.productId = productId;
    }

    if (status) {
      where.status = status;
    }

    switch (reportType) {
      case "summary":
        const [totalRecords, recordsByStatus, recordsByProduct] = await Promise.all([
          prisma.record.count({ where }),
          prisma.record.groupBy({
            by: ['status'],
            where,
            _count: {
              id: true,
            },
          }),
          prisma.record.groupBy({
            by: ['productId'],
            where,
            _count: {
              id: true,
            },
          }),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            totalRecords,
            recordsByStatus,
            recordsByProduct,
          },
        });

      case "detailed":
        const records = await prisma.record.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                _count: {
                  select: {
                    parameters: true,
                  },
                },
              },
            },
            _count: {
              select: {
                controls: true,
              },
            },
          },
          orderBy: {
            registrationDate: 'desc',
          },
        });

        const transformedRecords = records.map((record: {
          id: string;
          internalLot: string;
          supplierLot?: string | null;
          quantity: number;
          registrationDate: Date;
          status: string;
          product?: {
            id: string;
            name: string;
            code?: string | null;
            _count?: {
              parameters: number;
            };
          } | null;
          _count?: {
            controls: number;
          };
        }) => ({
          id: record.id,
          productName: record.product?.name || 'Producto no encontrado',
          productCode: record.product?.code || 'N/A',
          internalLot: record.internalLot,
          supplierLot: record.supplierLot,
          quantity: record.quantity,
          registrationDate: record.registrationDate,
          status: record.status,
          parametersCount: record.product?._count?.parameters || 0,
          controlsCount: record._count?.controls || 0,
        }));

        return NextResponse.json({
          success: true,
          data: {
            records: transformedRecords,
            total: records.length,
          },
        });

      case "analytics":
        const analyticsData = await Promise.all([
          prisma.record.groupBy({
            by: ['status'],
            where,
            _count: {
              id: true,
            },
          }),
          prisma.record.findMany({
            where,
            select: {
              registrationDate: true,
              status: true,
            },
            orderBy: {
              registrationDate: 'asc',
            },
          }),
          prisma.product.count({
            where: {
              records: {
                some: where,
              },
            },
          }),
        ]);

        const [statusCounts, timeSeriesData, uniqueProducts] = analyticsData;

        const dailyStats = timeSeriesData.reduce((acc: Record<string, {
          date: string;
          total: number;
          approved: number;
          pending: number;
          rejected: number;
        }>, record: {
          registrationDate: Date;
          status: string;
        }) => {
          const date = record.registrationDate.toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { date, total: 0, approved: 0, pending: 0, rejected: 0 };
          }
          acc[date].total++;
          if (record.status === 'approved') acc[date].approved++;
           else if (record.status === 'pending') acc[date].pending++;
           else if (record.status === 'rejected') acc[date].rejected++;
          return acc;
        }, {});

        return NextResponse.json({
          success: true,
          data: {
            statusCounts,
            dailyStats: Object.values(dailyStats),
            uniqueProducts,
            totalRecords: timeSeriesData.length,
          },
        });

      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
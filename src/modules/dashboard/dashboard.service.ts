import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BankOrder } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip } from '@modules/bip/schemas/bip.schema';
import { Product } from '@modules/products/schemas/product.schema';
import { Vendor } from '@modules/vendors/schemas/vendor.schema';
import { PurchaseOrder } from '@modules/purchase-orders/schemas/purchase-order.schema';
import { Bank } from '@modules/banks/schemas/bank.schema';
import { Shipment } from '@modules/shipments/schemas/shipment.schema';
import { OrderStatus } from '@common/enums/order-status.enum';
import { VendorStatus } from '@modules/vendors/schemas/vendor.schema';
import { OrderType } from './dto/stats-query.dto';

export interface DashboardStats {
  bankOrders: {
    total: number;
    completed: number;
    active: number;
  };
  products: {
    total: number;
    inStock: number;
    active: number;
  };
  vendors: {
    total: number;
    newVendors: number;
    active: number;
  };
  purchaseOrders: {
    total: number;
    capacityPercentage: number;
    active: number;
  };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(BankOrder.name) private bankOrderModel: Model<BankOrder>,
    @InjectModel(Bip.name) private bipModel: Model<Bip>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Vendor.name) private vendorModel: Model<Vendor>,
    @InjectModel(PurchaseOrder.name)
    private purchaseOrderModel: Model<PurchaseOrder>,
    @InjectModel(Bank.name) private bankModel: Model<Bank>,
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
  ) {}

  async getStats(): Promise<DashboardStats> {
    // Get bank orders stats (including both BankOrder and Bip)
    const [
      totalBankOrders,
      completedBankOrders,
      activeBankOrders,
      totalBipOrders,
      completedBipOrders,
      activeBipOrders,
    ] = await Promise.all([
      this.bankOrderModel.countDocuments({ isDeleted: false }),
      this.bankOrderModel.countDocuments({
        isDeleted: false,
        status: OrderStatus.DELIVERED,
      }),
      this.bankOrderModel.countDocuments({
        isDeleted: false,
        status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
      }),
      this.bipModel.countDocuments({ isDeleted: false }),
      this.bipModel.countDocuments({
        isDeleted: false,
        status: OrderStatus.DELIVERED,
      }),
      this.bipModel.countDocuments({
        isDeleted: false,
        status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
      }),
    ]);

    // Get products stats
    const [totalProducts, activeProducts] = await Promise.all([
      this.productModel.countDocuments({ isDeleted: false }),
      this.productModel.countDocuments({ isDeleted: false }),
    ]);

    // Get vendors stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalVendors, newVendors, activeVendors] = await Promise.all([
      this.vendorModel.countDocuments({ isDeleted: false }),
      this.vendorModel.countDocuments({
        isDeleted: false,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      this.vendorModel.countDocuments({
        isDeleted: false,
        status: VendorStatus.ACTIVE,
      }),
    ]);

    // Get purchase orders stats
    const [totalPurchaseOrders, activePurchaseOrders] = await Promise.all([
      this.purchaseOrderModel.countDocuments({ isDeleted: false }),
      this.purchaseOrderModel.countDocuments({ isDeleted: false }),
    ]);

    // Calculate capacity percentage (active POs / total possible capacity)
    // For now, we'll calculate it as a simple percentage of active POs
    const capacityPercentage =
      totalPurchaseOrders > 0
        ? Math.round((activePurchaseOrders / totalPurchaseOrders) * 100)
        : 0;

    return {
      bankOrders: {
        total: totalBankOrders + totalBipOrders,
        completed: completedBankOrders + completedBipOrders,
        active: activeBankOrders + activeBipOrders,
      },
      products: {
        total: totalProducts,
        inStock: totalProducts, // Since we don't have stock tracking, all products are considered "in stock"
        active: activeProducts,
      },
      vendors: {
        total: totalVendors,
        newVendors: newVendors,
        active: activeVendors,
      },
      purchaseOrders: {
        total: totalPurchaseOrders,
        capacityPercentage: capacityPercentage,
        active: activePurchaseOrders,
      },
    };
  }

  async getComprehensiveStats(
    startDate?: string,
    endDate?: string,
    orderType: OrderType = OrderType.ALL,
  ) {
    // Build date filter
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    // Build base filters for both order types
    const baseFilter = { isDeleted: false, ...dateFilter };

    // Get today's date range for "today" stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayFilter = {
      isDeleted: false,
      createdAt: { $gte: today, $lt: tomorrow },
    };

    // Determine which models to query based on orderType
    const includeBankOrders =
      orderType === OrderType.ALL || orderType === OrderType.BANK_ORDERS;
    const includeBipOrders =
      orderType === OrderType.ALL || orderType === OrderType.BIP_ORDERS;

    // Helper function to aggregate from both models
    const aggregateOrders = async (matchFilter: any) => {
      const bankOrdersPromise = includeBankOrders
        ? this.bankOrderModel.aggregate([{ $match: matchFilter }])
        : Promise.resolve([]);
      const bipOrdersPromise = includeBipOrders
        ? this.bipModel.aggregate([{ $match: matchFilter }])
        : Promise.resolve([]);

      const [bankOrders, bipOrders] = await Promise.all([
        bankOrdersPromise,
        bipOrdersPromise,
      ]);

      return [...bankOrders, ...bipOrders];
    };

    // 1. TOP SECTION CARDS
    const [
      totalOrdersToday,
      awaitingConfirmation,
      pendingPurchase,
      pendingDispatch,
      deliveredToday,
      cancelledOrders,
    ] = await Promise.all([
      // Total Orders Today
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments(todayFilter)
            : 0,
          includeBipOrders ? this.bipModel.countDocuments(todayFilter) : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      // Awaiting Confirmation
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...baseFilter,
                status: OrderStatus.PENDING,
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...baseFilter,
                status: OrderStatus.PENDING,
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      // Pending Purchase
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...baseFilter,
                status: OrderStatus.CONFIRMED,
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...baseFilter,
                status: OrderStatus.CONFIRMED,
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      // Pending Dispatch
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...baseFilter,
                status: OrderStatus.PROCESSING,
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...baseFilter,
                status: OrderStatus.PROCESSING,
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      // Delivered Today
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...todayFilter,
                status: OrderStatus.DELIVERED,
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...todayFilter,
                status: OrderStatus.DELIVERED,
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      // Cancelled Orders
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...baseFilter,
                status: OrderStatus.CANCELLED,
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...baseFilter,
                status: OrderStatus.CANCELLED,
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
    ]);

    // 2. ORDER PIPELINE
    const [
      totalOrders,
      confirmedOrders,
      purchasedOrders,
      dispatchedOrders,
      deliveredOrders,
    ] = await Promise.all([
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments(baseFilter)
            : 0,
          includeBipOrders ? this.bipModel.countDocuments(baseFilter) : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...baseFilter,
                status: {
                  $in: [
                    OrderStatus.CONFIRMED,
                    OrderStatus.PROCESSING,
                    OrderStatus.DISPATCH,
                    OrderStatus.SHIPPED,
                    OrderStatus.DELIVERED,
                  ],
                },
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...baseFilter,
                status: {
                  $in: [
                    OrderStatus.CONFIRMED,
                    OrderStatus.PROCESSING,
                    OrderStatus.DISPATCH,
                    OrderStatus.SHIPPED,
                    OrderStatus.DELIVERED,
                  ],
                },
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...baseFilter,
                status: {
                  $in: [
                    OrderStatus.PROCESSING,
                    OrderStatus.DISPATCH,
                    OrderStatus.SHIPPED,
                    OrderStatus.DELIVERED,
                  ],
                },
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...baseFilter,
                status: {
                  $in: [
                    OrderStatus.PROCESSING,
                    OrderStatus.DISPATCH,
                    OrderStatus.SHIPPED,
                    OrderStatus.DELIVERED,
                  ],
                },
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...baseFilter,
                status: {
                  $in: [
                    OrderStatus.DISPATCH,
                    OrderStatus.SHIPPED,
                    OrderStatus.DELIVERED,
                  ],
                },
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...baseFilter,
                status: {
                  $in: [
                    OrderStatus.DISPATCH,
                    OrderStatus.SHIPPED,
                    OrderStatus.DELIVERED,
                  ],
                },
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...baseFilter,
                status: OrderStatus.DELIVERED,
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...baseFilter,
                status: OrderStatus.DELIVERED,
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
    ]);

    const pipeline = {
      imported: {
        count: totalOrders,
        percentage: 100,
      },
      confirmed: {
        count: confirmedOrders,
        percentage: totalOrders > 0 ? Math.round((confirmedOrders / totalOrders) * 100) : 0,
      },
      purchased: {
        count: purchasedOrders,
        percentage: totalOrders > 0 ? Math.round((purchasedOrders / totalOrders) * 100) : 0,
      },
      dispatched: {
        count: dispatchedOrders,
        percentage: totalOrders > 0 ? Math.round((dispatchedOrders / totalOrders) * 100) : 0,
      },
      delivered: {
        count: deliveredOrders,
        percentage: totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0,
      },
    };

    // 3. PENDING AGING
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const pendingAgingFilter = {
      ...baseFilter,
      status: OrderStatus.PENDING,
    };

    const [aging0to1, aging1to4, aging4to24, aging24plus] = await Promise.all([
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...pendingAgingFilter,
                createdAt: { $gte: oneHourAgo },
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...pendingAgingFilter,
                createdAt: { $gte: oneHourAgo },
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...pendingAgingFilter,
                createdAt: { $gte: fourHoursAgo, $lt: oneHourAgo },
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...pendingAgingFilter,
                createdAt: { $gte: fourHoursAgo, $lt: oneHourAgo },
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...pendingAgingFilter,
                createdAt: { $gte: twentyFourHoursAgo, $lt: fourHoursAgo },
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...pendingAgingFilter,
                createdAt: { $gte: twentyFourHoursAgo, $lt: fourHoursAgo },
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
      (async () => {
        const counts = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.countDocuments({
                ...pendingAgingFilter,
                createdAt: { $lt: twentyFourHoursAgo },
              })
            : 0,
          includeBipOrders
            ? this.bipModel.countDocuments({
                ...pendingAgingFilter,
                createdAt: { $lt: twentyFourHoursAgo },
              })
            : 0,
        ]);
        return counts[0] + counts[1];
      })(),
    ]);

    const pendingAging = {
      zeroToOneHour: aging0to1,
      oneToFourHours: aging1to4,
      fourToTwentyFourHours: aging4to24,
      moreThanTwentyFourHours: aging24plus,
    };

    // 4. DISPATCH TEAM (By Courier)
    const shipmentStats = await this.shipmentModel.aggregate([
      {
        $match: {
          isDeleted: false,
          ...(startDate || endDate ? dateFilter : {}),
        },
      },
      {
        $lookup: {
          from: 'couriers',
          localField: 'courierId',
          foreignField: '_id',
          as: 'courier',
        },
      },
      { $unwind: { path: '$courier', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$courier.name',
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'booked'] }, 1, 0],
            },
          },
          dispatched: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    ['in_transit', 'out_for_delivery', 'delivered'],
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalOrders: { $sum: 1 },
        },
      },
      {
        $project: {
          courierName: '$_id',
          pending: 1,
          dispatched: 1,
          avgDispatch: '6 hrs', // Placeholder - would need delivery time tracking
        },
      },
    ]);

    // 5. BANK PERFORMANCE
    const bankPerformance = await this.bankModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: 'bankorders',
          let: { bankId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$bankId', '$$bankId'] },
                isDeleted: false,
                ...baseFilter,
              },
            },
          ],
          as: 'orders',
        },
      },
      {
        $lookup: {
          from: 'bips',
          let: { bankId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$bankId', '$$bankId'] },
                isDeleted: false,
                ...baseFilter,
              },
            },
          ],
          as: 'bipOrders',
        },
      },
      {
        $project: {
          bankName: 1,
          totalOrders: {
            $size: {
              $concatArrays: [
                includeBankOrders ? '$orders' : [],
                includeBipOrders ? '$bipOrders' : [],
              ],
            },
          },
          confirmedOrders: {
            $size: {
              $filter: {
                input: {
                  $concatArrays: [
                    includeBankOrders ? '$orders' : [],
                    includeBipOrders ? '$bipOrders' : [],
                  ],
                },
                as: 'order',
                cond: {
                  $in: [
                    '$$order.status',
                    [
                      'confirmed',
                      'processing',
                      'dispatched',
                      'shipped',
                      'delivered',
                    ],
                  ],
                },
              },
            },
          },
          cancelledOrders: {
            $size: {
              $filter: {
                input: {
                  $concatArrays: [
                    includeBankOrders ? '$orders' : [],
                    includeBipOrders ? '$bipOrders' : [],
                  ],
                },
                as: 'order',
                cond: { $eq: ['$$order.status', 'cancelled'] },
              },
            },
          },
        },
      },
      {
        $project: {
          bankName: 1,
          orders: '$totalOrders',
          confirmedPercentage: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              {
                $multiply: [
                  { $divide: ['$confirmedOrders', '$totalOrders'] },
                  100,
                ],
              },
              0,
            ],
          },
          cancelRate: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              {
                $multiply: [
                  { $divide: ['$cancelledOrders', '$totalOrders'] },
                  100,
                ],
              },
              0,
            ],
          },
          avgDelivery: '3.5 days', // Placeholder
        },
      },
      { $match: { orders: { $gt: 0 } } },
    ]);

    // 6. TOP PRODUCTS WITH DELAYS
    const topProductsDelays = await this.bankOrderModel.aggregate([
      {
        $match: {
          ...baseFilter,
          status: { $in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
        },
      },
      {
        $group: {
          _id: '$product',
          ordersCount: { $sum: 1 },
          pendingPurchase: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.CONFIRMED] }, 1, 0],
            },
          },
        },
      },
      { $sort: { pendingPurchase: -1 } },
      { $limit: 10 },
      {
        $project: {
          product: '$_id',
          ordersCount: 1,
          pendingPurchase: 1,
        },
      },
    ]);

    // 7. FINANCIAL OVERVIEW
    const financialOverview = await Promise.all([
      // Total Orders Value (using redeemedPoints for bank orders, amount for BIP)
      (async () => {
        const [bankTotal, bipTotal] = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.aggregate([
                { $match: baseFilter },
                {
                  $group: {
                    _id: null,
                    total: { $sum: '$redeemedPoints' },
                  },
                },
              ])
            : Promise.resolve([{ total: 0 }]),
          includeBipOrders
            ? this.bipModel.aggregate([
                { $match: baseFilter },
                { $group: { _id: null, total: { $sum: '$amount' } } },
              ])
            : Promise.resolve([{ total: 0 }]),
        ]);
        return (
          (bankTotal[0]?.total || 0) + (bipTotal[0]?.total || 0)
        );
      })(),
      // Pending Purchase Value
      (async () => {
        const [bankTotal, bipTotal] = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.aggregate([
                { $match: { ...baseFilter, status: OrderStatus.CONFIRMED } },
                {
                  $group: {
                    _id: null,
                    total: { $sum: '$redeemedPoints' },
                  },
                },
              ])
            : Promise.resolve([{ total: 0 }]),
          includeBipOrders
            ? this.bipModel.aggregate([
                { $match: { ...baseFilter, status: OrderStatus.CONFIRMED } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
              ])
            : Promise.resolve([{ total: 0 }]),
        ]);
        return (
          (bankTotal[0]?.total || 0) + (bipTotal[0]?.total || 0)
        );
      })(),
      // Pending Dispatch Value
      (async () => {
        const [bankTotal, bipTotal] = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.aggregate([
                {
                  $match: { ...baseFilter, status: OrderStatus.PROCESSING },
                },
                {
                  $group: {
                    _id: null,
                    total: { $sum: '$redeemedPoints' },
                  },
                },
              ])
            : Promise.resolve([{ total: 0 }]),
          includeBipOrders
            ? this.bipModel.aggregate([
                {
                  $match: { ...baseFilter, status: OrderStatus.PROCESSING },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
              ])
            : Promise.resolve([{ total: 0 }]),
        ]);
        return (
          (bankTotal[0]?.total || 0) + (bipTotal[0]?.total || 0)
        );
      })(),
      // Delivered Value
      (async () => {
        const [bankTotal, bipTotal] = await Promise.all([
          includeBankOrders
            ? this.bankOrderModel.aggregate([
                { $match: { ...baseFilter, status: OrderStatus.DELIVERED } },
                {
                  $group: {
                    _id: null,
                    total: { $sum: '$redeemedPoints' },
                  },
                },
              ])
            : Promise.resolve([{ total: 0 }]),
          includeBipOrders
            ? this.bipModel.aggregate([
                { $match: { ...baseFilter, status: OrderStatus.DELIVERED } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
              ])
            : Promise.resolve([{ total: 0 }]),
        ]);
        return (
          (bankTotal[0]?.total || 0) + (bipTotal[0]?.total || 0)
        );
      })(),
    ]);

    // ==================== WEEKLY BREAKDOWN ====================
    // Calculate date range for weekly breakdown
    let weekStartDate: Date;
    let weekEndDate: Date;

    if (startDate && endDate) {
      // Use provided date range
      weekStartDate = new Date(startDate);
      weekEndDate = new Date(endDate);
      weekEndDate.setHours(23, 59, 59, 999);
    } else {
      // Default to last 7 days
      weekEndDate = new Date();
      weekEndDate.setHours(23, 59, 59, 999);
      weekStartDate = new Date();
      weekStartDate.setDate(weekStartDate.getDate() - 6); // Last 7 days including today
      weekStartDate.setHours(0, 0, 0, 0);
    }

    const weeklyDateFilter = {
      isDeleted: false,
      orderDate: {
        $gte: weekStartDate,
        $lte: weekEndDate,
      },
    };

    // Aggregate orders by date and status for both order types
    const [bankWeeklyStats, bipWeeklyStats] = await Promise.all([
      includeBankOrders
        ? this.bankOrderModel.aggregate([
            { $match: weeklyDateFilter },
            {
              $group: {
                _id: {
                  date: {
                    $dateToString: { format: '%Y-%m-%d', date: '$orderDate' },
                  },
                  status: '$status',
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { '_id.date': 1 } },
          ])
        : Promise.resolve([]),
      includeBipOrders
        ? this.bipModel.aggregate([
            { $match: weeklyDateFilter },
            {
              $group: {
                _id: {
                  date: {
                    $dateToString: { format: '%Y-%m-%d', date: '$orderDate' },
                  },
                  status: '$status',
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { '_id.date': 1 } },
          ])
        : Promise.resolve([]),
    ]);

    // Combine and structure weekly stats
    const weeklyStatsMap = new Map<
      string,
      {
        date: string;
        total: number;
        confirmed: number;
        processing: number;
        dispatched: number;
        cancelled: number;
      }
    >();

    // Process bank orders
    for (const stat of bankWeeklyStats) {
      const date = stat._id.date;
      if (!weeklyStatsMap.has(date)) {
        weeklyStatsMap.set(date, {
          date,
          total: 0,
          confirmed: 0,
          processing: 0,
          dispatched: 0,
          cancelled: 0,
        });
      }
      const dayStats = weeklyStatsMap.get(date)!;
      dayStats.total += stat.count;

      if (stat._id.status === OrderStatus.CONFIRMED) {
        dayStats.confirmed += stat.count;
      } else if (stat._id.status === OrderStatus.PROCESSING) {
        dayStats.processing += stat.count;
      } else if (stat._id.status === OrderStatus.DISPATCH) {
        dayStats.dispatched += stat.count;
      } else if (stat._id.status === OrderStatus.CANCELLED) {
        dayStats.cancelled += stat.count;
      }
    }

    // Process BIP orders
    for (const stat of bipWeeklyStats) {
      const date = stat._id.date;
      if (!weeklyStatsMap.has(date)) {
        weeklyStatsMap.set(date, {
          date,
          total: 0,
          confirmed: 0,
          processing: 0,
          dispatched: 0,
          cancelled: 0,
        });
      }
      const dayStats = weeklyStatsMap.get(date)!;
      dayStats.total += stat.count;

      if (stat._id.status === OrderStatus.CONFIRMED) {
        dayStats.confirmed += stat.count;
      } else if (stat._id.status === OrderStatus.PROCESSING) {
        dayStats.processing += stat.count;
      } else if (stat._id.status === OrderStatus.DISPATCH) {
        dayStats.dispatched += stat.count;
      } else if (stat._id.status === OrderStatus.CANCELLED) {
        dayStats.cancelled += stat.count;
      }
    }

    // Convert map to array and sort by date
    const weeklyBreakdown = Array.from(weeklyStatsMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date),
    );

    return {
      topCards: {
        totalOrdersToday,
        awaitingConfirmation,
        pendingPurchase,
        pendingDispatch,
        deliveredToday,
        cancelledOrders,
      },
      pipeline,
      pendingAging,
      dispatchTeam: shipmentStats,
      bankPerformance,
      topProductsDelays,
      financialOverview: {
        totalOrdersValue: financialOverview[0],
        pendingPurchaseValue: financialOverview[1],
        pendingDispatchValue: financialOverview[2],
        deliveredValue: financialOverview[3],
      },
      weeklyBreakdown,
    };
  }
}

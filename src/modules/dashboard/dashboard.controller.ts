import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';
import { StatsQueryDto } from './dto/stats-query.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          bankOrders: {
            total: 150,
            completed: 120,
            active: 30,
          },
          products: {
            total: 45,
            inStock: 45,
            active: 45,
          },
          vendors: {
            total: 12,
            newVendors: 3,
            active: 10,
          },
          purchaseOrders: {
            total: 25,
            capacityPercentage: 80,
            active: 20,
          },
        },
      },
    },
  })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('comprehensive-stats')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({
    summary: 'Get comprehensive dashboard statistics with date and order type filtering',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering (ISO date format: YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering (ISO date format: YYYY-MM-DD)',
    example: '2024-01-31',
  })
  @ApiQuery({
    name: 'orderType',
    required: false,
    enum: ['all', 'bank_orders', 'bip_orders'],
    description: 'Filter by order type',
    example: 'all',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive dashboard statistics retrieved successfully',
    schema: {
      example: {
        topCards: {
          totalOrdersToday: 320,
          awaitingConfirmation: 87,
          pendingPurchase: 55,
          pendingDispatch: 28,
          deliveredToday: 10,
          cancelledOrders: 20,
        },
        pipeline: {
          imported: { count: 1000, percentage: 100 },
          confirmed: { count: 780, percentage: 78 },
          purchased: { count: 600, percentage: 60 },
          dispatched: { count: 450, percentage: 45 },
          delivered: { count: 420, percentage: 42 },
        },
        pendingAging: {
          zeroToOneHour: 25,
          oneToFourHours: 40,
          fourToTwentyFourHours: 15,
          moreThanTwentyFourHours: 7,
        },
        dispatchTeam: [
          {
            courierName: 'TCS',
            pending: 40,
            dispatched: 120,
            avgDispatch: '6 hrs',
          },
          {
            courierName: 'Leopards',
            pending: 15,
            dispatched: 30,
            avgDispatch: '2 hrs',
          },
        ],
        bankPerformance: [
          {
            bankName: 'HBL',
            orders: 500,
            confirmedPercentage: 82,
            cancelRate: 10,
            avgDelivery: '3.2 days',
          },
          {
            bankName: 'Alfalah',
            orders: 200,
            confirmedPercentage: 65,
            cancelRate: 22,
            avgDelivery: '5.8 days',
          },
        ],
        topProductsDelays: [
          {
            product: 'iPhone 15',
            ordersCount: 120,
            pendingPurchase: 70,
          },
          {
            product: 'AirPods',
            ordersCount: 80,
            pendingPurchase: 5,
          },
        ],
        financialOverview: {
          totalOrdersValue: 12000000,
          pendingPurchaseValue: 3200000,
          pendingDispatchValue: 1100000,
          deliveredValue: 7700000,
        },
      },
    },
  })
  async getComprehensiveStats(@Query() query: StatsQueryDto) {
    return this.dashboardService.getComprehensiveStats(
      query.startDate,
      query.endDate,
      query.orderType,
    );
  }
}

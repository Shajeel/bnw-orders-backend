import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BankOrder } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip } from '@modules/bip/schemas/bip.schema';
import { PurchaseOrder } from '@modules/purchase-orders/schemas/purchase-order.schema';
import { Bank } from '@modules/banks/schemas/bank.schema';
import { OrderStatus } from '@common/enums/order-status.enum';
import { InvoiceOrderType } from './dto/generate-invoice.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(BankOrder.name) private bankOrderModel: Model<BankOrder>,
    @InjectModel(Bip.name) private bipModel: Model<Bip>,
    @InjectModel(PurchaseOrder.name) private purchaseOrderModel: Model<PurchaseOrder>,
    @InjectModel(Bank.name) private bankModel: Model<Bank>,
  ) {}

  async generateInvoice(
    bankId: string,
    startDate: string,
    endDate: string,
    orderType: InvoiceOrderType,
  ) {
    // Validate bank exists
    const bank = await this.bankModel.findOne({
      _id: bankId,
      isDeleted: false,
    });

    if (!bank) {
      throw new NotFoundException(`Bank with ID ${bankId} not found`);
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all dispatched and cancelled orders for this bank within date range
    let dispatchedOrders: any[];
    let cancelledOrders: any[];

    if (orderType === InvoiceOrderType.BANK_ORDERS) {
      [dispatchedOrders, cancelledOrders] = await Promise.all([
        this.bankOrderModel
          .find({
            bankId: new Types.ObjectId(bankId),
            status: OrderStatus.DISPATCH,
            isDeleted: false,
            orderDate: {
              $gte: start,
              $lte: end,
            },
          })
          .populate('productId', 'name')
          .populate({
            path: 'shipmentId',
            select: 'trackingNumber consignmentNumber courierId',
            populate: {
              path: 'courierId',
              select: 'courierName',
            },
          })
          .sort({ orderDate: 1 })
          .exec(),
        this.bankOrderModel
          .find({
            bankId: new Types.ObjectId(bankId),
            status: OrderStatus.CANCELLED,
            isDeleted: false,
            orderDate: {
              $gte: start,
              $lte: end,
            },
          })
          .populate('productId', 'name')
          .sort({ orderDate: 1 })
          .exec(),
      ]);
    } else {
      // BIP Orders
      [dispatchedOrders, cancelledOrders] = await Promise.all([
        this.bipModel
          .find({
            bankId: new Types.ObjectId(bankId),
            status: OrderStatus.DISPATCH,
            isDeleted: false,
            orderDate: {
              $gte: start,
              $lte: end,
            },
          })
          .populate('productId', 'name')
          .populate({
            path: 'shipmentId',
            select: 'trackingNumber consignmentNumber courierId',
            populate: {
              path: 'courierId',
              select: 'courierName',
            },
          })
          .sort({ orderDate: 1 })
          .exec(),
        this.bipModel
          .find({
            bankId: new Types.ObjectId(bankId),
            status: OrderStatus.CANCELLED,
            isDeleted: false,
            orderDate: {
              $gte: start,
              $lte: end,
            },
          })
          .populate('productId', 'name')
          .sort({ orderDate: 1 })
          .exec(),
      ]);
    }

    // Generate Excel workbook with 2 sheets
    const workbook = new ExcelJS.Workbook();

    // ==================== SHEET 1: INVOICE ====================
    const invoiceSheet = workbook.addWorksheet('Invoice');

    // Add header information
    const orderTypeLabel = orderType === InvoiceOrderType.BANK_ORDERS ? 'Bank Orders' : 'BIP Orders';
    const colSpan = orderType === InvoiceOrderType.BANK_ORDERS ? 'I' : 'I';
    invoiceSheet.mergeCells(`A1:${colSpan}1`);
    invoiceSheet.getCell('A1').value = `Invoice - ${bank.bankName} (${orderTypeLabel})`;
    invoiceSheet.getCell('A1').font = { size: 16, bold: true };
    invoiceSheet.getCell('A1').alignment = { horizontal: 'center' };

    invoiceSheet.mergeCells(`A2:${colSpan}2`);
    invoiceSheet.getCell('A2').value = `Period: ${startDate} to ${endDate}`;
    invoiceSheet.getCell('A2').font = { size: 12 };
    invoiceSheet.getCell('A2').alignment = { horizontal: 'center' };

    invoiceSheet.addRow([]); // Empty row

    // Add column headers based on order type
    let invoiceHeaderRow;
    if (orderType === InvoiceOrderType.BANK_ORDERS) {
      // Bank Orders: CNIC, CUSTOMER_NAME, CITY, PRODUCT, GIFTCODE, Ref No., PO #, ORDER DATE, Redeemed Points
      invoiceHeaderRow = invoiceSheet.addRow([
        'CNIC',
        'CUSTOMER NAME',
        'CITY',
        'PRODUCT',
        'GIFTCODE',
        'Ref No.',
        'PO #',
        'ORDER DATE',
        'Redeemed Points',
      ]);
    } else {
      // BIP Orders: EFORMS, CNIC, CUSTOMER_NAME, CITY, PRODUCT, GIFTCODE, PO #, ORDER DATE, AMOUNT
      invoiceHeaderRow = invoiceSheet.addRow([
        'EFORMS',
        'CNIC',
        'CUSTOMER NAME',
        'CITY',
        'PRODUCT',
        'GIFTCODE',
        'PO #',
        'ORDER DATE',
        'AMOUNT',
      ]);
    }

    invoiceHeaderRow.font = { bold: true };
    invoiceHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Add DISPATCHED orders
    invoiceSheet.addRow(['DISPATCHED ORDERS']).font = { bold: true, size: 12 };

    for (const order of dispatchedOrders) {
      const productName = orderType === InvoiceOrderType.BANK_ORDERS
        ? `${order.brand} ${order.product}`
        : order.product;

      const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '';

      if (orderType === InvoiceOrderType.BANK_ORDERS) {
        invoiceSheet.addRow([
          order.cnic,
          order.customerName,
          order.city,
          productName,
          order.giftCode,
          order.refNo,
          order.poNumber,
          orderDate,
          order.redeemedPoints,
        ]);
      } else {
        invoiceSheet.addRow([
          order.eforms,
          order.cnic,
          order.customerName,
          order.city,
          productName,
          order.giftCode,
          order.poNumber,
          orderDate,
          order.amount,
        ]);
      }
    }

    // Add blank row
    invoiceSheet.addRow([]);

    // Add CANCELLED orders
    if (cancelledOrders.length > 0) {
      invoiceSheet.addRow(['CANCELLED ORDERS']).font = { bold: true, size: 12 };

      for (const order of cancelledOrders) {
        const productName = orderType === InvoiceOrderType.BANK_ORDERS
          ? `${order.brand} ${order.product}`
          : order.product;

        const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '';

        if (orderType === InvoiceOrderType.BANK_ORDERS) {
          invoiceSheet.addRow([
            order.cnic,
            order.customerName,
            order.city,
            productName,
            order.giftCode,
            order.refNo,
            order.poNumber,
            orderDate,
            order.redeemedPoints,
          ]);
        } else {
          invoiceSheet.addRow([
            order.eforms,
            order.cnic,
            order.customerName,
            order.city,
            productName,
            order.giftCode,
            order.poNumber,
            orderDate,
            order.amount,
          ]);
        }
      }
    }

    // Set column widths for invoice sheet
    invoiceSheet.columns = [
      { width: 18 }, // CNIC/EFORMS
      { width: 25 }, // CUSTOMER NAME (or CNIC for BIP)
      { width: 15 }, // CITY (or CUSTOMER NAME for BIP)
      { width: 30 }, // PRODUCT (or CITY for BIP)
      { width: 15 }, // GIFTCODE (or PRODUCT for BIP)
      { width: 15 }, // Ref No/GIFTCODE
      { width: 15 }, // PO # (or PO # for BIP)
      { width: 15 }, // ORDER DATE
      { width: 15 }, // Redeemed Points/AMOUNT
    ];

    // Add borders to all data cells
    invoiceSheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber >= 4) {
        row.eachCell((cell: any) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    });

    // ==================== SHEET 2: TRACKING ====================
    const trackingSheet = workbook.addWorksheet('Tracking');

    // Add header
    trackingSheet.mergeCells('A1:D1');
    trackingSheet.getCell('A1').value = `Tracking Details - ${bank.bankName} (${orderTypeLabel})`;
    trackingSheet.getCell('A1').font = { size: 16, bold: true };
    trackingSheet.getCell('A1').alignment = { horizontal: 'center' };

    trackingSheet.mergeCells('A2:D2');
    trackingSheet.getCell('A2').value = `Period: ${startDate} to ${endDate}`;
    trackingSheet.getCell('A2').font = { size: 12 };
    trackingSheet.getCell('A2').alignment = { horizontal: 'center' };

    trackingSheet.addRow([]); // Empty row

    // Add column headers based on order type
    let trackingHeaderRow;
    if (orderType === InvoiceOrderType.BANK_ORDERS) {
      // Bank Orders: CNIC, CUSTOMER_NAME, CITY, Tracking Details
      trackingHeaderRow = trackingSheet.addRow([
        'CNIC',
        'CUSTOMER NAME',
        'CITY',
        'Tracking Details',
      ]);
    } else {
      // BIP Orders: EFORMS, CNIC, CUSTOMER_NAME, CITY, Tracking Details
      trackingHeaderRow = trackingSheet.addRow([
        'EFORMS',
        'CNIC',
        'CUSTOMER NAME',
        'CITY',
        'Tracking Details',
      ]);
    }

    trackingHeaderRow.font = { bold: true };
    trackingHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Add tracking data (only for dispatched orders with shipment)
    for (const order of dispatchedOrders) {
      const shipment = order.shipmentId as any;
      const courierName = shipment?.courierId?.courierName || 'N/A';
      const trackingNumber = shipment
        ? shipment.consignmentNumber || shipment.trackingNumber
        : 'N/A';
      const trackingDetails = `${courierName} - ${trackingNumber}`;

      if (orderType === InvoiceOrderType.BANK_ORDERS) {
        trackingSheet.addRow([
          order.cnic,
          order.customerName,
          order.city,
          trackingDetails,
        ]);
      } else {
        trackingSheet.addRow([
          order.eforms,
          order.cnic,
          order.customerName,
          order.city,
          trackingDetails,
        ]);
      }
    }

    // Set column widths for tracking sheet
    if (orderType === InvoiceOrderType.BANK_ORDERS) {
      trackingSheet.columns = [
        { width: 18 }, // CNIC
        { width: 25 }, // CUSTOMER NAME
        { width: 15 }, // CITY
        { width: 35 }, // Tracking Details (Courier Name - Tracking Number)
      ];
    } else {
      trackingSheet.columns = [
        { width: 15 }, // EFORMS
        { width: 18 }, // CNIC
        { width: 25 }, // CUSTOMER NAME
        { width: 15 }, // CITY
        { width: 35 }, // Tracking Details (Courier Name - Tracking Number)
      ];
    }

    // Add borders to all data cells
    trackingSheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber >= 4) {
        row.eachCell((cell: any) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}

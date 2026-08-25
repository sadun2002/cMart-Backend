import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StorefrontService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getOrders(userId: number) {
    return this.prisma.onlineOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true, history: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async getAddresses(userId: number) {
    return this.prisma.userAddress.findMany({
      where: { userId },
    });
  }

  async addAddress(userId: number, data: any) {
    const existingCount = await this.prisma.userAddress.count({ where: { userId } });
    
    let isDefault = data.isDefault;
    if (existingCount === 0) {
      isDefault = true; // First address is always default
    }

    if (isDefault) {
      // Unset default from all other addresses
      await this.prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.userAddress.create({
      data: {
        ...data,
        isDefault,
        userId,
      },
    });
  }

  async deleteAddress(userId: number, addressId: number) {
    const address = await this.prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return this.prisma.userAddress.delete({
      where: { id: addressId },
    });
  }

  async getCards(userId: number) {
    return this.prisma.userCard.findMany({
      where: { userId },
    });
  }

  async addCard(userId: number, data: any) {
    const existingCount = await this.prisma.userCard.count({ where: { userId } });

    let isDefault = data.isDefault;
    if (existingCount === 0) {
      isDefault = true; // First card is always default
    }

    if (isDefault) {
      // Unset default from all other cards
      await this.prisma.userCard.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.userCard.create({
      data: {
        ...data,
        isDefault,
        userId,
      },
    });
  }

  async deleteCard(userId: number, cardId: number) {
    const card = await this.prisma.userCard.findFirst({
      where: { id: cardId, userId },
    });
    if (!card) throw new NotFoundException('Card not found');
    return this.prisma.userCard.delete({
      where: { id: cardId },
    });
  }

  async createOrder(userId: number | null, tenantId: number, data: any) {
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const { items, ...orderData } = data;

    return this.prisma.onlineOrder.create({
      data: {
        ...orderData,
        tenantId,
        orderNumber,
        userId: userId || undefined,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
        },
        history: {
          create: [
            {
              status: 'PENDING',
              note: 'Order created',
            }
          ]
        }
      },
      include: {
        items: true,
      },
    });
  }

  async cancelOrder(userId: number, orderId: number) {
    const order = await this.prisma.onlineOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (order.status !== 'PENDING') {
      throw new Error('Only pending orders can be cancelled');
    }

    const updateData: any = {
      status: 'CANCELLED',
      history: {
        create: [{ status: 'CANCELLED', note: 'Cancelled by customer' }]
      }
    };

    if (order.paymentStatus === 'COMPLETED') {
      updateData.paymentStatus = 'REFUNDED';
    }

    return this.prisma.onlineOrder.update({
      where: { id: orderId },
      data: updateData,
    });
  }

  async returnOrder(userId: number, orderId: number) {
    const order = await this.prisma.onlineOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (order.status !== 'DELIVERED') {
      throw new Error('Only delivered orders can be returned');
    }

    const updateData: any = {
      status: 'RETURNED',
      history: {
        create: [{ status: 'RETURNED', note: 'Returned by customer' }]
      }
    };

    updateData.paymentStatus = 'REFUNDED';

    return this.prisma.onlineOrder.update({
      where: { id: orderId },
      data: updateData,
    });
  }

  // Admin / Store Owner Methods

  async getStoreOrders(tenantId: number) {
    return this.prisma.onlineOrder.findMany({
      where: { tenantId },
      include: {
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
        customer: true,
        user: {
          include: {
            _count: {
              select: { onlineOrders: true }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStoreOrderStatus(tenantId: number, orderId: number, status?: string, paymentStatus?: string) {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const data: any = {};
    if (status) {
      data.status = status;
      data.history = {
        create: [{ status, note: 'Status updated by store owner' }]
      };

      if (order.paymentMethod === 'CARD' && ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status.toUpperCase())) {
        data.paymentStatus = 'PAID';
      }
    }
    if (paymentStatus) data.paymentStatus = paymentStatus;

    return this.prisma.onlineOrder.update({
      where: { id: orderId },
      data,
    });
  }

  async deleteStoreOrder(tenantId: number, orderId: number) {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Delete related items first
    await this.prisma.onlineOrderItem.deleteMany({
      where: { orderId },
    });

    // Then delete the order
    return this.prisma.onlineOrder.delete({
      where: { id: orderId },
    });
  }

  async getStoreCustomers(tenantId: number) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        role: 'CUSTOMER',
      },
      include: {
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
        onlineOrders: {
          select: {
            total: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

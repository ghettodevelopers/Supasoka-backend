const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * ZenoPay Payment Callback Handler
 * 
 * This endpoint receives payment notifications from ZenoPay
 * when a payment is completed, failed, or pending
 */

// ZenoPay Webhook Endpoint
router.post('/callback', async (req, res) => {
  try {
    const {
      order_id,
      payment_status,
      reference,
      metadata,
    } = req.body;

    logger.info('📥 ZenoPay webhook received:', {
      order_id,
      payment_status,
      reference,
    });

    // Verify webhook authenticity using x-api-key header
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== 'y25RazuSLyAS4bTd4Y9s3XIlSt_MBgUsf4pmSixXXSprbSzIyunQ_vzyiKJgbgMAH3c6a3sDBfsa-qqe1sVTjQ') {
      logger.error('❌ Invalid webhook authentication');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Validate required fields
    if (!order_id || !payment_status) {
      logger.error('❌ Invalid callback data - missing order_id or payment_status');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Find the payment record by order_id
    let payment = await prisma.payment.findUnique({
      where: { reference: order_id },
      include: { user: true },
    });

    if (!payment) {
      logger.warn('⚠️ Payment record not found for order_id:', order_id);
      // Payment might not exist yet, just acknowledge webhook
      return res.json({
        success: true,
        message: 'Webhook received',
      });
    }

    // Update payment status
    payment = await prisma.payment.update({
      where: { reference: order_id },
      data: {
        status: payment_status.toLowerCase(),
        transactionId: reference,
        updatedAt: new Date(),
      },
      include: { user: true },
    });

    // Handle payment status
    if (payment_status.toUpperCase() === 'COMPLETED') {
      logger.info('✅ Payment completed:', order_id);

      // Activate subscription
      const subscriptionDays = calculateSubscriptionDays(payment.amount);
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + subscriptionDays);

      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          isSubscribed: true,
          subscriptionEnd,
          remainingTime: subscriptionDays * 24 * 60, // Convert to minutes
        },
      });

      // Create subscription record
      await prisma.subscription.create({
        data: {
          userId: payment.userId,
          paymentId: payment.id,
          startDate: new Date(),
          endDate: subscriptionEnd,
          plan: getSubscriptionPlan(payment.amount),
          amount: payment.amount,
          status: 'active',
        },
      });

      logger.info(`✅ Subscription activated for user ${payment.userId} - ${subscriptionDays} days`);

      // Send success notification (optional - implement if you have push notifications)
      // await sendPushNotification(payment.user, 'Payment Successful', 'Your subscription is now active!');

    } else if (status.toLowerCase() === 'failed' || status.toLowerCase() === 'cancelled') {
      logger.warn('❌ Payment failed or cancelled:', reference);
      
      // Send failure notification (optional)
      // await sendPushNotification(payment.user, 'Payment Failed', 'Your payment was not successful.');
    }

    // Respond to ZenoPay
    res.json({
      success: true,
      message: 'Callback processed successfully',
      reference,
      status: payment.status,
    });

  } catch (error) {
    logger.error('❌ Error processing ZenoPay callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process callback',
      details: error.message,
    });
  }
});

// Manual Payment Verification Endpoint
router.post('/verify', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference is required',
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            phone: true,
            isSubscribed: true,
            subscriptionEnd: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    res.json({
      success: true,
      payment: {
        reference: payment.reference,
        status: payment.status,
        amount: payment.amount,
        network: payment.network,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
      },
      user: payment.user,
    });

  } catch (error) {
    logger.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
    });
  }
});

// Helper function to calculate subscription days based on amount
function calculateSubscriptionDays(amount) {
  if (amount >= 15000) return 365; // Year
  if (amount >= 7000) return 30;   // Month
  if (amount >= 3000) return 7;    // Week
  return 7; // Default to week
}

// Helper function to get subscription plan name
function getSubscriptionPlan(amount) {
  if (amount >= 15000) return 'year';
  if (amount >= 7000) return 'month';
  if (amount >= 3000) return 'week';
  return 'week';
}

module.exports = router;

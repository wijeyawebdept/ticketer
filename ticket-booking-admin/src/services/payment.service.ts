import api from './api';

// Types for MPGS Payment Integration
export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nic?: string;
}

export interface SharedAreaTicketRequest {
  categoryId?: string;
  categoryName: string;
  sharedAreaNumber: number;
  ticketCount: number;
  pricePerTicket: number;
}

export interface InitiatePaymentRequest {
  eventId: string;
  scheduleId: string;
  seatIds?: string[];
  sharedAreaTickets?: SharedAreaTicketRequest[];
  totalAmount: number;
  currency: string;
  customerInfo: CustomerInfo;
}

export interface MPGSSessionResponse {
  sessionId: string;
  merchantId: string;
  checkoutScriptUrl: string;
  amount: number;
  currency: string;
  bookingId: string;
  successUrl: string;
  cancelUrl: string;
  errorUrl: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  status: string;
  transactionId?: string;
  bookingId?: string;
  bookingReference?: string;
  message: string;
  amount?: number;
  paymentMethod?: string;
}

export interface RefundRequest {
  bookingId: string;
  amount?: number;
  reason: string;
  notes?: string;
}

// Declare MPGS Checkout on window
declare global {
  interface Window {
    Checkout?: {
      configure: (config: any) => void;
      showLightbox: () => void;
      showPaymentPage: () => void;
    };
  }
}

class PaymentService {
  /**
   * Initiate payment - creates pending booking and MPGS session
   */
  async initiatePayment(request: InitiatePaymentRequest): Promise<MPGSSessionResponse> {
    const response = await api.post<MPGSSessionResponse>('/api/payments/initiate', request);
    return response.data;
  }

  /**
   * Verify payment after MPGS redirect/completion
   */
  async verifyPayment(sessionId: string): Promise<PaymentVerificationResponse> {
    const response = await api.get<PaymentVerificationResponse>(
      `/api/payments/verify?sessionId=${sessionId}`
    );
    return response.data;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(sessionId: string): Promise<PaymentVerificationResponse> {
    const response = await api.get<PaymentVerificationResponse>(
      `/api/payments/status?sessionId=${sessionId}`
    );
    return response.data;
  }

  /**
   * Load MPGS Checkout script dynamically
   */
  loadMPGSScript(scriptUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already loaded
      if (document.getElementById('mpgs-checkout-script')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'mpgs-checkout-script';
      script.src = scriptUrl;
      script.async = true;
      script.onload = () => {
        console.log('MPGS Checkout script loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load MPGS Checkout script');
        reject(new Error('Failed to load MPGS script'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Configure and show MPGS Lightbox
   */
  showMPGSCheckout(
    sessionId: string,
    merchantId: string,
    callbacks: {
      onComplete: (resultIndicator: string, sessionVersion: string) => void;
      onError: (error: any) => void;
      onCancel: () => void;
    }
  ): void {
    if (!window.Checkout) {
      callbacks.onError(new Error('MPGS Checkout not loaded'));
      return;
    }

    try {
      window.Checkout.configure({
        merchant: merchantId,
        session: {
          id: sessionId,
        },
        interaction: {
          merchant: {
            name: 'Ticket Booking System',
            address: {
              line1: 'Online Ticket Booking',
              line2: 'Sri Lanka',
            },
          },
          displayControl: {
            billingAddress: 'HIDE',
            customerEmail: 'HIDE',
            orderSummary: 'SHOW',
            shipping: 'HIDE',
          },
        },
      });

      // Set up event handlers for Lightbox
      // Note: MPGS uses callbacks via Configure options, not events
      // The result will be returned via redirect or postMessage

      window.Checkout.showLightbox();

      // MPGS doesn't expose event listeners directly in Lightbox mode
      // Instead, we handle the result via URL redirect or polling
      console.log('MPGS Lightbox opened');

    } catch (error) {
      console.error('Error showing MPGS Lightbox:', error);
      callbacks.onError(error);
    }
  }

  /**
   * Show MPGS Payment Page (alternative to Lightbox)
   */
  showMPGSPaymentPage(
    sessionId: string,
    merchantId: string,
    successUrl: string,
    errorUrl: string
  ): void {
    if (!window.Checkout) {
      throw new Error('MPGS Checkout not loaded');
    }

    window.Checkout.configure({
      merchant: merchantId,
      session: {
        id: sessionId,
      },
      interaction: {
        merchant: {
          name: 'Ticket Booking System',
        },
        action: 'PAY',
        timeout: 600, // 10 minutes
      },
      order: {
        description: 'Event Ticket Booking',
      },
    });

    window.Checkout.showPaymentPage();
  }

  /**
   * Initiate refund (admin/organizer only)
   */
  async initiateRefund(request: RefundRequest): Promise<PaymentVerificationResponse> {
    const response = await api.post<PaymentVerificationResponse>(
      '/api/refunds/initiate',
      request
    );
    return response.data;
  }

  /**
   * Get refund status for a booking
   */
  async getRefundStatus(bookingId: string): Promise<PaymentVerificationResponse> {
    const response = await api.get<PaymentVerificationResponse>(
      `/api/refunds/booking/${bookingId}`
    );
    return response.data;
  }

  /**
   * Poll for payment completion
   * Used when MPGS redirects back to check payment status
   */
  async pollPaymentStatus(
    sessionId: string,
    maxAttempts: number = 10,
    intervalMs: number = 2000
  ): Promise<PaymentVerificationResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await this.verifyPayment(sessionId);

        // If status is not pending, return the result
        if (result.status !== 'PENDING') {
          return result;
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error(`Payment poll attempt ${attempt + 1} failed:`, error);

        // Only throw on last attempt
        if (attempt === maxAttempts - 1) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    // Max attempts reached, return pending status
    return {
      success: false,
      status: 'PENDING',
      message: 'Payment is still being processed. Please check back later.',
    };
  }
}

const paymentService = new PaymentService();
export default paymentService;

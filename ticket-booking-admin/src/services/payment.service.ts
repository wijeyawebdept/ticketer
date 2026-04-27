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

  returnUrl: string;
  cancelUrl: string;
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
  orderReference?: string;
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
  // Receipt fields
  eventName?: string;
  eventDate?: string;
  eventTime?: string;
  venueName?: string;
  ticketCount?: number;
  seatDetails?: string;
  paymentDate?: string;
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
      showPaymentPage: () => void;
    };
  }
}

class PaymentService {
async initiatePayment(request: InitiatePaymentRequest): Promise<MPGSSessionResponse> {
  const returnUrl = `${window.location.origin}/booking/payment-success`;
  const cancelUrl = `${window.location.origin}/booking/payment-cancel`;

  const response = await api.post<MPGSSessionResponse>('/api/payments/initiate', {
    ...request,
    returnUrl,
    cancelUrl,
  });

  return response.data;
}

    async verifyPayment(sessionId: string): Promise<PaymentVerificationResponse> {
    const response = await api.get<PaymentVerificationResponse>(
      `/api/payments/verify?sessionId=${encodeURIComponent(sessionId)}`
    );
    return response.data;
  }

  async verifyPaymentByBooking(bookingId: string, resultIndicator?: string): Promise<PaymentVerificationResponse> {
    const params = new URLSearchParams({ bookingId });
    if (resultIndicator) params.append('resultIndicator', resultIndicator);
    const response = await api.get<PaymentVerificationResponse>(
      `/api/payments/verify-by-booking?${params.toString()}`
    );
    return response.data;
  }

  async getPaymentStatus(sessionId: string): Promise<PaymentVerificationResponse> {
    const response = await api.get<PaymentVerificationResponse>(
      `/api/payments/status?sessionId=${encodeURIComponent(sessionId)}`
    );
    return response.data;
  }

  loadMPGSScript(scriptUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById('mpgs-checkout-script')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'mpgs-checkout-script';
      script.src = scriptUrl;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load MPGS script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Opens MPGS Hosted Checkout payment page.
   * For MPGS v67+, only session.id is passed to configure().
   * All order details are sent during session creation on the backend.
   */
  startCheckout(session: MPGSSessionResponse) {
    if (!(window as any).Checkout) {
      return;
    }
    
    (window as any).Checkout.configure({
      session: { id: session.sessionId }
    });

    (window as any).Checkout.showPaymentPage();
  }
}

const paymentService = new PaymentService();
export default paymentService;


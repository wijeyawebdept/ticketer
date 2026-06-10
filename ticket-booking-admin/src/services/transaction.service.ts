import api from './api';
import { Transaction, TransactionStatus } from '../types';

class TransactionService {
  async getAllTransactions(): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>('/api/admin/transactions');
    return response.data;
  }

  async getTransactionById(id: string): Promise<Transaction> {
    const response = await api.get<Transaction>(`/api/admin/transactions/${id}`);
    return response.data;
  }

  async changeTransactionStatus(id: string, status: TransactionStatus): Promise<Transaction> {
    const response = await api.patch<Transaction>(`/api/admin/transactions/${id}/status`, { status });
    return response.data;
  }

  async getTransactionsForBooking(bookingId: string): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>(`/api/admin/bookings/${bookingId}/transactions`);
    return response.data;
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>(
      `/api/admin/transactions/by-date?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }
}

const transactionService = new TransactionService();
export default transactionService;

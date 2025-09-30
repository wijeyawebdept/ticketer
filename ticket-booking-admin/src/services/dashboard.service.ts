import api from './api';
import { DashboardOverview, Analytics } from '../types';

class DashboardService {
  async getDashboardOverview(): Promise<DashboardOverview> {
    const response = await api.get<DashboardOverview>('/api/admin/dashboard/overview');
    return response.data;
  }

  async getAnalytics(period: string = 'week'): Promise<Analytics> {
    const response = await api.get<Analytics>(`/api/admin/dashboard/analytics?period=${period}`);
    return response.data;
  }

  async getRevenueChartData(
    period: string = 'month',
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    let url = `/api/admin/dashboard/revenue-chart?period=${period}`;
    
    if (startDate) {
      url += `&startDate=${startDate}`;
    }
    
    if (endDate) {
      url += `&endDate=${endDate}`;
    }
    
    const response = await api.get(url);
    return response.data;
  }

  async getRecentTransactions(count: number = 10): Promise<any> {
    const response = await api.get(`/api/admin/dashboard/recent-transactions?count=${count}`);
    return response.data;
  }

  async getUpcomingEvents(count: number = 5): Promise<any> {
    const response = await api.get(`/api/admin/dashboard/upcoming-events?count=${count}`);
    return response.data;
  }

  async getTopSellingEvents(count: number = 5): Promise<any> {
    const response = await api.get(`/api/admin/dashboard/top-selling-events?count=${count}`);
    return response.data;
  }
}

const dashboardService = new DashboardService();
export default dashboardService;
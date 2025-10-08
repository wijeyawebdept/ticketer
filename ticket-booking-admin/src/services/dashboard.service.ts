import api from './api';
import { DashboardOverview } from '../types';

class DashboardService {
  async getDashboardOverview(): Promise<DashboardOverview> {
    const response = await api.get<DashboardOverview>('/api/admin/dashboard/overview');
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
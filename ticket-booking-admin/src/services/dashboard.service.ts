import api from './api';
import { DashboardOverview, UserRole } from '../types';

class DashboardService {
  // Helper method to get the base path based on user role
  private getBasePath(): string {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === UserRole.ORGANIZER || user.role === 'ROLE_ORGANIZER') {
          return '/api/organizer';
        }
      } catch (e) {
        console.error('Error parsing user role:', e);
      }
    }
    return '/api/admin';
  }

  async getDashboardOverview(): Promise<DashboardOverview> {
    const basePath = this.getBasePath();
    const response = await api.get<DashboardOverview>(`${basePath}/dashboard/overview`);
    return response.data;
  }

  async getRecentTransactions(count: number = 10): Promise<any> {
    const basePath = this.getBasePath();
    const response = await api.get(`${basePath}/dashboard/recent-transactions?count=${count}`);
    return response.data;
  }

  async getUpcomingEvents(count: number = 5): Promise<any> {
    const basePath = this.getBasePath();
    const response = await api.get(`${basePath}/dashboard/upcoming-events?count=${count}`);
    return response.data;
  }

  async getTopSellingEvents(count: number = 5): Promise<any> {
    const basePath = this.getBasePath();
    const response = await api.get(`${basePath}/dashboard/top-selling-events?count=${count}`);
    return response.data;
  }

  async getTrendData(): Promise<any> {
    const basePath = this.getBasePath();
    const response = await api.get(`${basePath}/dashboard/trends`);
    return response.data;
  }

  async getAnalytics(period: string = 'week'): Promise<any> {
    const basePath = this.getBasePath();
    const response = await api.get(`${basePath}/dashboard/analytics?period=${period}`);
    return response.data;
  }

  async getRevenueChartData(period: string = 'month', startDate?: string, endDate?: string): Promise<any> {
    const basePath = this.getBasePath();
    let url = `${basePath}/dashboard/revenue-chart?period=${period}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    const response = await api.get(url);
    return response.data;
  }
}

const dashboardService = new DashboardService();
export default dashboardService;
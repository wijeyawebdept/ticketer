// Dashboard related types
export interface DashboardOverview {
  totalRevenue: number;
  totalUsers: number;
  activeEventsCount: number;
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
  // SUPER_ADMIN exclusive fields
  superAdminCount?: number;
  adminCount?: number;
  organizerCount?: number;
}
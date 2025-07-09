export type User = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "agent" | "admin";
  status: "active" | "inactive" | "suspended";
  createdAt: string;
};

export type Booking = {
  id: string;
  routeId: string;
  routeName: string;
  customerId: string;
  customerName: string;
  date: string;
  departureTime: string;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  paymentStatus: "paid" | "pending" | "refunded" | "failed";
  passengers: number;
  totalAmount: number;
  createdAt: string;
};

export type Route = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  status: "active" | "inactive";
};

export type Vessel = {
  id: string;
  name: string;
  capacity: number;
  status: "active" | "maintenance" | "inactive";
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
};

export type Trip = {
  id: string;
  routeId: string;
  routeName: string;
  vesselId: string;
  vesselName: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  bookings: number;
  capacity: number;
};

export type DashboardStats = {
  dailyBookings: {
    count: number;
    revenue: number;
  };
  activeTrips: number;
  activeUsers: number;
  paymentStatus: {
    completed: number;
    pending: number;
    failed: number;
  };
};

export type Alert = {
  id: string;
  type: "schedule" | "payment" | "system" | "capacity";
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: string;
  read: boolean;
};
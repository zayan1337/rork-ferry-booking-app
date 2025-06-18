export interface Agent {
    id: string;
    name: string;
    email: string;
    agentId: string;
    creditCeiling: number;
    creditBalance: number;
    discountRate: number;
    freeTicketsAllocation: number;
    freeTicketsRemaining: number;
}

export interface AgentStats {
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    totalCommission: number;
    uniqueClients: number;
}

export interface Booking {
    id: string;
    clientId: string;
    clientName: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengerCount: number;
    totalAmount: number;
    discountedAmount: number;
    status: "confirmed" | "completed" | "cancelled" | "pending";
    bookingDate: string;
    paymentMethod: "credit" | "gateway" | "free";
    commission: number;
}

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    bookingsCount: number;
}

export interface CreditTransaction {
    id: string;
    date: string;
    amount: number;
    type: "refill" | "deduction";
    bookingId?: string;
    description: string;
    balance: number;
} 
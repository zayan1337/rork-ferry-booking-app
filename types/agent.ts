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
    clientId: string; // This can be user_profiles.id OR agent_clients.id
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
    userId?: string; // user_profiles.id for clients with accounts
    agentClientId?: string; // agent_clients.id for clients without accounts
    clientHasAccount?: boolean; // Whether this booking is for a client with account
}

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    bookingsCount: number;
    hasAccount?: boolean; // Whether the client has a user account
    agentClientId?: string; // The agent_clients record ID
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
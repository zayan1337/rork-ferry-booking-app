import { formatCurrency as baseCurrencyFormatter } from './currencyUtils';
import { Agent, CreditTransaction } from '@/types/agent';

/**
 * Format currency for agent interface
 */
export const formatCurrency = (amount: number): string => {
  return baseCurrencyFormatter(amount);
};

/**
 * Format agent display name
 */
export const formatAgentDisplayName = (agent: Agent | null): string => {
  if (!agent) return 'User';

  if (agent.name) {
    // Extract first name from full name
    return agent.name.split(' ')[0];
  }

  if (agent.email) {
    // Extract name from email if no name available
    return agent.email.split('@')[0];
  }

  return 'Agent';
};

/**
 * Format agent ID for display
 */
export const formatAgentId = (agentId: string): string => {
  if (!agentId) return 'N/A';

  // Format as AG-XXXX if not already formatted
  if (agentId.startsWith('AG-')) {
    return agentId;
  }

  return `AG-${agentId.slice(-4).toUpperCase()}`;
};

/**
 * Format credit utilization percentage
 */
export const formatCreditUtilization = (
  creditBalance: number,
  creditCeiling: number
): number => {
  if (creditCeiling <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, ((creditCeiling - creditBalance) / creditCeiling) * 100)
  );
};

/**
 * Check if agent credit is low (below 20% of ceiling)
 */
export const isAgentCreditLow = (agent: Agent | null): boolean => {
  if (!agent || !agent.creditCeiling || agent.creditCeiling <= 0) return false;

  const utilizationPercentage = formatCreditUtilization(
    agent.creditBalance,
    agent.creditCeiling
  );
  return utilizationPercentage > 80; // Low if used more than 80% of ceiling
};

/**
 * Calculate credit summary from transactions
 */
export const calculateCreditSummary = (
  agent: Agent | null,
  transactions: CreditTransaction[]
) => {
  if (!agent) {
    return {
      creditBalance: 0,
      creditCeiling: 0,
      creditUtilization: 0,
      isLowCredit: false,
      totalCreditAdded: 0,
      totalCreditUsed: 0,
    };
  }

  const totalCreditAdded = transactions
    .filter(t => t.type === 'refill')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCreditUsed = transactions
    .filter(t => t.type === 'deduction')
    .reduce((sum, t) => sum + t.amount, 0);

  const creditUtilization = formatCreditUtilization(
    agent.creditBalance,
    agent.creditCeiling
  );
  const isLowCredit = isAgentCreditLow(agent);
  return {
    creditBalance: agent.creditBalance,
    creditCeiling: agent.creditCeiling,
    creditUtilization,
    isLowCredit,
    totalCreditAdded,
    totalCreditUsed,
  };
};

/**
 * Format booking date for display
 */
export const formatBookingDate = (date: string | null): string => {
  if (!date) return 'N/A';

  try {
    return new Date(date).toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Format route display
 */
export const formatRouteDisplay = (route: any): string => {
  if (!route) return 'Unknown Route';

  const fromName = route.fromIsland?.name || route.origin || 'Unknown';
  const toName = route.toIsland?.name || route.destination || 'Unknown';

  return `${fromName} → ${toName}`;
};

/**
 * Format seat numbers for display
 */
export const formatSeatNumbers = (seats: any[]): string => {
  if (!seats || seats.length === 0) return 'N/A';

  return seats
    .map(seat => seat.number || seat.seat_number || '')
    .filter(Boolean)
    .join(', ');
};

/**
 * Format agent initials for avatar
 */
export const formatAgentInitials = (agent: Agent | null): string => {
  if (!agent) return '??';

  if (agent.name) {
    const nameParts = agent.name.trim().split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return nameParts[0].slice(0, 2).toUpperCase();
  }

  if (agent.email) {
    return agent.email.slice(0, 2).toUpperCase();
  }

  return 'AG';
};

/**
 * Format discount rate for display
 */
export const formatDiscountRate = (rate: number | null | undefined): string => {
  if (!rate) return '0%';
  return `${Number(rate).toFixed(1)}%`;
};

/**
 * Format commission amount for display
 */
export const formatCommission = (amount: number | null | undefined): string => {
  if (!amount) return formatCurrency(0);
  return formatCurrency(Number(amount));
};

/**
 * Format free tickets remaining display
 */
export const formatFreeTickets = (
  remaining: number | null | undefined,
  allocation: number | null | undefined
): string => {
  const remainingCount = Number(remaining) || 0;
  const totalAllocation = Number(allocation) || 0;

  if (totalAllocation === 0) return '0';

  return `${remainingCount} / ${totalAllocation}`;
};

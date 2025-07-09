export interface FAQ {
  question: string;
  answer: string;
  category: 'booking' | 'payment' | 'general' | 'account';
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactFormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
} 
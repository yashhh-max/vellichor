export type Role = 'customer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Table {
  _id: string;
  tableNumber: number;
  capacity: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ReservationStatus = 'confirmed' | 'cancelled';

export interface Reservation {
  _id: string;
  user?: { _id: string; name: string; email: string } | string;
  table: { _id: string; tableNumber: number; capacity: number } | string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:MM
  guests: number;
  status: ReservationStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

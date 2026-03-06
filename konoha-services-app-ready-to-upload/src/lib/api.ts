import { useState, useEffect } from 'react';
import { ServiceRates, Booking } from './types';

export function useSettings() {
  const [settings, setSettings] = useState<ServiceRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSettings(data.settings);
        } else {
          throw new Error(data.error || 'Failed to fetch settings');
        }
      })
      .catch(err => {
        console.error('Error fetching settings:', err);
        setError(err);
        // Fallback for development if API fails
        setSettings({
          price_ac_1_2: 2.5,
          price_sofa_seat: 1.5,
          price_mattress_big: 5.0,
          price_mattress_small: 3.0,
          price_curtains: 2.0,
          price_carpet_meter: 1.0,
          duration_ac_1_2: 30,
          duration_sofa_seat: 15,
          duration_mattress_big: 30,
          duration_mattress_small: 20,
          duration_curtains: 20,
          duration_carpet_meter: 10,
          bookings_enabled: true,
          whatsapp_number: '97333333333'
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading, error };
}

export async function createBooking(bookingData: any) {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Booking failed');
  }
  return data.booking;
}

export async function checkAvailability(date: string, duration: number, isTechnicianView: boolean = false): Promise<string[]> {
  const response = await fetch(`/api/availability?date=${date}&duration=${duration}&isTechnician=${isTechnicianView}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to check availability');
  }
  
  return data.slots;
}

export async function getBookings(filters: any = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.date) params.append('date', filters.date);
  if (filters.technician_id) params.append('technician_id', filters.technician_id.toString());

  const response = await fetch(`/api/bookings?${params.toString()}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch bookings');
  }
  
  return data.bookings;
}

export async function updateBooking(id: number, updates: any) {
  const response = await fetch(`/api/bookings/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update booking');
  }
  return data;
}

export async function getTechnicians() {
  const response = await fetch('/api/technicians');
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch technicians');
  }
  
  return data.technicians;
}

export async function createTechnician(technician: any) {
  const response = await fetch('/api/technicians', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(technician),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to create technician');
  }
  return data.technician;
}

export async function updateTechnician(id: number, updates: any) {
  const response = await fetch(`/api/technicians/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update technician');
  }
  return data.technician;
}

export async function updateSettings(settings: any) {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update settings');
  }
  return data;
}

export async function createExpense(expense: any) {
  const response = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to create expense');
  return data.expense;
}

export async function getExpenses(filters: any = {}) {
  const params = new URLSearchParams();
  if (filters.booking_id) params.append('booking_id', filters.booking_id);
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);

  const response = await fetch(`/api/expenses?${params.toString()}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch expenses');
  return data.expenses;
}

export async function getProfitabilityReport(filters: any = {}) {
  const params = new URLSearchParams();
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);

  const response = await fetch(`/api/reports/profitability?${params.toString()}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch report');
  return data;
}

export async function uploadBookingPhoto(bookingId: number, photoData: { url: string, type: 'before' | 'after' }) {
  const response = await fetch(`/api/bookings/${bookingId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(photoData),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to upload photo');
  return data;
}

export async function getBookingPhotos(bookingId: number) {
  const response = await fetch(`/api/bookings/${bookingId}/photos`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch photos');
  return data.photos;
}

export async function getAdminGallery() {
  const response = await fetch('/api/admin/gallery');
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch gallery');
  return data.photos;
}

export async function updateBookingQuality(id: number, status: string) {
  const response = await fetch(`/api/bookings/${id}/quality`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update quality status');
  return data;
}

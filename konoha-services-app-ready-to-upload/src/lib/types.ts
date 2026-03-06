export interface Location {
  en: string;
  ar: string;
}

export const LOCATIONS: Location[] = [
  { en: 'Manama', ar: 'المنامة' },
  { en: 'Riffa', ar: 'الرفاع' },
  { en: 'Muharraq', ar: 'المحرق' },
  { en: 'Hamad Town', ar: 'مدينة حمد' },
  { en: 'A\'ali', ar: 'عالي' },
  { en: 'Isa Town', ar: 'مدينة عيسى' },
  { en: 'Sitra', ar: 'سترة' },
  { en: 'Budaiya', ar: 'البديع' },
  { en: 'Jidhafs', ar: 'جدحفص' },
  { en: 'Al-Malikiyah', ar: 'المالكية' },
  { en: 'Adliya', ar: 'العدلية' },
  { en: 'Sanabis', ar: 'السنابس' },
  { en: 'Tubli', ar: 'توبلي' },
  { en: 'Salmabad', ar: 'سلماباد' },
  { en: 'Juffair', ar: 'الجفير' },
  { en: 'Hoora', ar: 'الحورة' },
  { en: 'Gudaibiya', ar: 'القضيبية' },
  { en: 'Zinj', ar: 'الزنج' },
  { en: 'Seef', ar: 'السيف' },
  { en: 'Amwaj', ar: 'جزر أمواج' },
  { en: 'Hidd', ar: 'الحد' },
  { en: 'Arad', ar: 'عراد' },
  { en: 'Busaiteen', ar: 'البسيتين' },
  { en: 'Galali', ar: 'قلالـي' },
  { en: 'Diyar Al Muharraq', ar: 'ديار المحرق' },
  { en: 'Durrat Al Bahrain', ar: 'درة البحرين' },
  { en: 'Zallaq', ar: 'الزلاق' },
  { en: 'Awali', ar: 'عوالي' },
  { en: 'Sakhir', ar: 'الصخير' },
  { en: 'Janabiya', ar: 'الجنبية' },
  { en: 'Saar', ar: 'سار' },
  { en: 'Hamala', ar: 'الهملة' },
  { en: 'Jasra', ar: 'الجسرة' },
  { en: 'Buri', ar: 'بوري' },
  { en: 'Dumistan', ar: 'دمستان' },
  { en: 'Karzakan', ar: 'كرزكان' },
  { en: 'Shahrakan', ar: 'شهركان' },
  { en: 'Dar Kulaib', ar: 'دار كليب' },
  { en: 'Sadad', ar: 'الصدد' },
  { en: 'Malkiya', ar: 'المالكية' },
];

export interface PricingRule {
  service: string;
  quantity: number;
  price: number;
}

export interface WorkingHours {
  [key: string]: { start: string; end: string; is_off: boolean };
}

export interface ServiceRates {
  price_ac_1_2: number;
  price_sofa_seat: number;
  price_mattress_big: number;
  price_mattress_small: number;
  price_curtains: number;
  price_carpet_meter: number;
  
  duration_ac_1_2: number;
  duration_sofa_seat: number;
  duration_mattress_big: number;
  duration_mattress_small: number;
  duration_curtains: number;
  duration_carpet_meter: number;

  bookings_enabled: boolean;
  whatsapp_number: string;
  
  pricing_rules?: PricingRule[];
  working_hours?: WorkingHours;
  reminder_months?: number;
}

export interface BookingServices {
  ac_count: number;
  sofa_seats: number;
  mattress_big: number;
  mattress_small: number;
  curtains: number;
  carpet_meters: number;
}

export interface Booking {
  id: number;
  customer_phone: string;
  location: string;
  service_date: string;
  service_time: string;
  services: BookingServices;
  total_duration_minutes: number;
  total_price_bhd: number;
  discount_amount: number;
  notes?: string;
  technician_id?: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  quality_status: 'pending_review' | 'approved' | 'flagged';
  created_at: string;
}

export interface Expense {
  id: number;
  booking_id?: number;
  category: 'fuel' | 'parts' | 'labor' | 'other';
  amount: number;
  description: string;
  date: string;
  logged_by: number;
}

export interface BookingPhoto {
  id: number;
  booking_id: number;
  url: string;
  type: 'before' | 'after';
  uploaded_at: string;
}

export interface ProfitabilityReport {
  revenue: number;
  expenses: number;
  net_profit: number;
  breakdown: { category: string; total: number }[];
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'technician';
}

export interface Technician {
  id: number;
  name: string;
  phone: string;
  role: 'technician';
}

import { ServiceRates, BookingServices } from './types';

export function calculatePrice(services: BookingServices, rates: ServiceRates): number {
  let total = 0;

  const getPrice = (serviceKey: keyof BookingServices, count: number, basePrice: number) => {
    if (count === 0) return 0;
    
    // Check for exact match rule first
    const rule = rates.pricing_rules?.find(r => r.service === serviceKey && r.quantity === count);
    if (rule) return rule.price;

    return count * basePrice;
  };

  total += getPrice('ac_count', services.ac_count, rates.price_ac_1_2);
  total += getPrice('sofa_seats', services.sofa_seats, rates.price_sofa_seat);
  total += getPrice('mattress_big', services.mattress_big, rates.price_mattress_big);
  total += getPrice('mattress_small', services.mattress_small, rates.price_mattress_small);
  total += getPrice('curtains', services.curtains, rates.price_curtains);
  total += getPrice('carpet_meters', services.carpet_meters, rates.price_carpet_meter);
  
  return total;
}

export function calculateDuration(services: BookingServices, rates: ServiceRates): number {
  let totalMinutes = 0;
  totalMinutes += services.ac_count * rates.duration_ac_1_2;
  totalMinutes += services.sofa_seats * rates.duration_sofa_seat;
  totalMinutes += services.mattress_big * rates.duration_mattress_big;
  totalMinutes += services.mattress_small * rates.duration_mattress_small;
  totalMinutes += services.curtains * rates.duration_curtains;
  totalMinutes += services.carpet_meters * rates.duration_carpet_meter;
  return totalMinutes;
}

export function calculateRegularPrice(services: BookingServices, rates: ServiceRates): number {
  let total = 0;
  total += services.ac_count * rates.price_ac_1_2;
  total += services.sofa_seats * rates.price_sofa_seat;
  total += services.mattress_big * rates.price_mattress_big;
  total += services.mattress_small * rates.price_mattress_small;
  total += services.curtains * rates.price_curtains;
  total += services.carpet_meters * rates.price_carpet_meter;
  return total;
}

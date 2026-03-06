import React, { useState, useEffect } from 'react';
import { useSettings, updateBooking } from '../../lib/api';
import { calculatePrice, calculateDuration } from '../../lib/pricing';
import { Booking } from '../../lib/types';
import { X, Wind, Armchair, BedDouble, BedSingle, Blinds, Grid3X3, DollarSign, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface EditServicesModalProps {
  booking: Booking;
  onClose: () => void;
  onUpdate: (updatedBooking: Booking) => void;
}

export default function EditServicesModal({ booking, onClose, onUpdate }: EditServicesModalProps) {
  const { settings } = useSettings();
  const [services, setServices] = useState(booking.services);
  const [manualDiscount, setManualDiscount] = useState(booking.discount_amount || 0);
  const [notes, setNotes] = useState(booking.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const totalDuration = settings ? calculateDuration(services, settings) : 0;
  const basePrice = settings ? calculatePrice(services, settings) : 0;
  const totalPrice = Math.max(0, basePrice - manualDiscount);

  const handleServiceChange = (field: string, value: number) => {
    setServices(prev => ({ ...prev, [field]: Math.max(0, value) }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const updates = {
        services,
        total_price_bhd: totalPrice,
        total_duration_minutes: totalDuration,
        notes,
        discount_amount: manualDiscount
      };
      await updateBooking(booking.id, updates);
      onUpdate({ ...booking, ...updates });
      onClose();
    } catch (error) {
      alert('Failed to update booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">Edit Services & Costs</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <ServiceInput 
              label="AC Cleaning" 
              subLabel="Deep cleaning & sanitization" 
              value={services.ac_count} 
              onChange={(v) => handleServiceChange('ac_count', v)}
              icon={<Wind size={20} />}
              price={settings?.pricing_rules.find(r => r.service_type === 'ac_count')?.price_per_unit || 0}
            />
            <ServiceInput 
              label="Sofa Cleaning" 
              subLabel="Per seat cleaning" 
              value={services.sofa_seats} 
              onChange={(v) => handleServiceChange('sofa_seats', v)}
              icon={<Armchair size={20} />}
              price={settings?.pricing_rules.find(r => r.service_type === 'sofa_seats')?.price_per_unit || 0}
            />
            <ServiceInput 
              label="Mattress (Big)" 
              subLabel="King/Queen size" 
              value={services.mattress_big} 
              onChange={(v) => handleServiceChange('mattress_big', v)}
              icon={<BedDouble size={20} />}
              price={settings?.pricing_rules.find(r => r.service_type === 'mattress_big')?.price_per_unit || 0}
            />
            <ServiceInput 
              label="Mattress (Small)" 
              subLabel="Single size" 
              value={services.mattress_small} 
              onChange={(v) => handleServiceChange('mattress_small', v)}
              icon={<BedSingle size={20} />}
              price={settings?.pricing_rules.find(r => r.service_type === 'mattress_small')?.price_per_unit || 0}
            />
            <ServiceInput 
              label="Curtains" 
              subLabel="Per panel" 
              value={services.curtains} 
              onChange={(v) => handleServiceChange('curtains', v)}
              icon={<Blinds size={20} />}
              price={settings?.pricing_rules.find(r => r.service_type === 'curtains')?.price_per_unit || 0}
            />
            <ServiceInput 
              label="Carpet" 
              subLabel="Per square meter" 
              value={services.carpet_meters} 
              onChange={(v) => handleServiceChange('carpet_meters', v)}
              icon={<Grid3X3 size={20} />}
              price={settings?.pricing_rules.find(r => r.service_type === 'carpet_meters')?.price_per_unit || 0}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Base Total</span>
              <span className="font-bold">{basePrice.toFixed(2)} BHD</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-600">Manual Discount</span>
              <div className="relative flex-1 max-w-[120px]">
                <input 
                  type="number" 
                  value={manualDiscount}
                  onChange={(e) => setManualDiscount(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-1 border border-gray-300 rounded-lg text-right"
                />
                <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-900">Final Price</span>
              <span className="text-xl font-bold text-emerald-600">{totalPrice.toFixed(2)} BHD</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Technician Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
              placeholder="Add any site observations or customer requests..."
            />
          </div>

          <button
            onClick={handleSave}
            disabled={submitting}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Update Booking'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ServiceInput({ label, subLabel, value, onChange, icon, price }: { label: string, subLabel: string, value: number, onChange: (v: number) => void, icon?: React.ReactNode, price: number }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${value > 0 ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${value > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
          {icon}
        </div>
        <div>
          <h4 className="font-bold text-sm text-gray-900">{label}</h4>
          <p className="text-xs text-gray-500">{price} BHD</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(value - 1)} disabled={value === 0} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30">-</button>
        <span className="w-4 text-center font-bold">{value}</span>
        <button onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700">+</button>
      </div>
    </div>
  );
}

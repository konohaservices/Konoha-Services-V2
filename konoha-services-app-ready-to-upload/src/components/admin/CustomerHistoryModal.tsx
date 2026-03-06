import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface BookingHistory {
  id: number;
  service_date: string;
  service_time: string;
  location: string;
  status: string;
  total_price_bhd: number;
  services: any;
}

interface CustomerHistoryModalProps {
  phone: string;
  onClose: () => void;
}

export default function CustomerHistoryModal({ phone, onClose }: CustomerHistoryModalProps) {
  const [history, setHistory] = useState<BookingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${phone}/history`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHistory(data.bookings);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [phone]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Customer History</h2>
            <p className="text-sm text-gray-500">{phone}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No booking history found.</div>
          ) : (
            <div className="space-y-4">
              {history.map(booking => (
                <div key={booking.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                      <Calendar size={14} />
                      {booking.service_date}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock size={14} />
                        {booking.service_time}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={14} />
                        <span className="truncate">{booking.location}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{booking.total_price_bhd.toFixed(2)} BHD</div>
                      <div className="text-[10px] text-gray-500">
                        {Object.entries(booking.services)
                          .filter(([_, v]) => (v as number) > 0)
                          .map(([k, v]) => `${k.replace(/_/g, ' ')} (x${v})`)
                          .join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { getBookings, useSettings } from '../../lib/api';
import { Booking } from '../../lib/types';
import { format, addMonths, isBefore, parseISO } from 'date-fns';
import { MessageCircle, Calendar, Phone, CheckCircle } from 'lucide-react';

export default function RemindersView() {
  const { settings } = useSettings();
  const [reminders, setReminders] = useState<{ booking: Booking, nextServiceDate: Date }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (settings) {
      fetchReminders();
    }
  }, [settings]);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const allBookings = await getBookings();
      const reminderMonths = settings?.reminder_months || 6;
      
      // 1. Filter for completed AC bookings
      const acBookings = allBookings.filter(b => 
        b.status === 'completed' && (b.services.ac_count || 0) > 0
      );

      // 2. Group by customer phone, keeping only the latest booking
      const latestBookings = new Map<string, Booking>();
      acBookings.forEach(booking => {
        const existing = latestBookings.get(booking.customer_phone);
        if (!existing || new Date(booking.service_date) > new Date(existing.service_date)) {
          latestBookings.set(booking.customer_phone, booking);
        }
      });

      // 3. Calculate next service date and filter if due
      const dueReminders: { booking: Booking, nextServiceDate: Date }[] = [];
      
      latestBookings.forEach(booking => {
        const serviceDate = parseISO(booking.service_date);
        const nextServiceDate = addMonths(serviceDate, reminderMonths);
        
        // Show if due or coming up in next 1 month
        if (isBefore(nextServiceDate, new Date()) || isBefore(nextServiceDate, addMonths(new Date(), 1))) {
           dueReminders.push({ booking, nextServiceDate });
        }
      });

      // Sort by due date (overdue first)
      dueReminders.sort((a, b) => a.nextServiceDate.getTime() - b.nextServiceDate.getTime());

      setReminders(dueReminders);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = (phone: string, lastDate: string) => {
    const reminderMonths = settings?.reminder_months || 6;
    const cleanPhone = phone.replace(/\D/g, '');
    const message = `Hello! It's been ${reminderMonths} months since your last AC service with Konoha Services on ${lastDate}. Regular maintenance ensures better cooling and lower electricity bills. Would you like to book a service?
    
مرحباً! لقد مرت ${reminderMonths} أشهر منذ آخر خدمة مكيفات مع كونوها للخدمات في ${lastDate}. الصيانة الدورية تضمن تبريد أفضل وفواتير كهرباء أقل. هل تود حجز موعد؟`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading && !reminders.length) return <div className="p-8 text-center">Loading reminders...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <MessageCircle className="text-emerald-600" />
          Service Reminders
        </h2>
        <p className="text-gray-500">Customers due for AC service ({settings?.reminder_months || 6} months since last visit).</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reminders.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No service reminders due at this time.</p>
          </div>
        ) : (
          reminders.map(({ booking, nextServiceDate }) => {
            const isOverdue = isBefore(nextServiceDate, new Date());
            return (
              <div key={booking.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-gray-900">{booking.customer_phone}</h3>
                    {isOverdue ? (
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded uppercase">Overdue</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded uppercase">Upcoming</span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-emerald-600" />
                      Last Service: <span className="font-medium">{booking.service_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-blue-600" />
                      Due Date: <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                        {format(nextServiceDate, 'yyyy-MM-dd')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">AC Units:</span>
                      <span className="font-medium">{booking.services.ac_count}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => sendWhatsApp(booking.customer_phone, booking.service_date)}
                  className="w-full bg-green-500 text-white py-2 rounded-lg font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} />
                  Send Reminder
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

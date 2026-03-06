import React, { useState, useEffect } from 'react';
import { getBookings } from '../../lib/api';
import { Booking } from '../../lib/types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarView({ technicianId }: { technicianId?: number }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(startOfDay(new Date()));

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  useEffect(() => {
    fetchBookings();
  }, [technicianId]);

  const fetchBookings = async () => {
    try {
      const data = await getBookings(technicianId ? { technician_id: technicianId } : {});
      setBookings(data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(b => {
      // Parse YYYY-MM-DD as local date to avoid UTC shift issues
      const [y, m, d] = b.service_date.split('-').map(Number);
      const bookingDate = new Date(y, m - 1, d);
      return isSameDay(bookingDate, day);
    });
  };

  const selectedDayBookings = selectedDate ? getBookingsForDay(selectedDate) : [];

  if (loading) return <div className="p-8 text-center">Loading calendar...</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <select 
                value={currentDate.getMonth()}
                onChange={(e) => setCurrentDate(new Date(currentDate.getFullYear(), Number(e.target.value), 1))}
                className="text-lg font-bold text-gray-900 border-none focus:ring-0 p-0 bg-transparent cursor-pointer"
              >
                {months.map((month, i) => (
                  <option key={month} value={i}>{month}</option>
                ))}
              </select>
              <select 
                value={currentDate.getFullYear()}
                onChange={(e) => setCurrentDate(new Date(Number(e.target.value), currentDate.getMonth(), 1))}
                className="text-lg font-bold text-gray-900 border-none focus:ring-0 p-0 bg-transparent cursor-pointer"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
              <CalendarIcon size={14} className="text-gray-400" />
              <input 
                type="date" 
                value={format(currentDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (e.target.value) {
                    const newDate = new Date(e.target.value);
                    setCurrentDate(newDate);
                    setSelectedDate(newDate);
                  }
                }}
                className="text-xs border-none bg-transparent focus:ring-0 p-0"
              />
            </div>
            <button 
              onClick={goToToday}
              className="text-xs font-medium px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
          {calendarDays.map((day, idx) => {
            const dayBookings = getBookingsForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={day.toString()} 
                onClick={() => {
                  setSelectedDate(day);
                  // If clicking a day from another month, switch to that month
                  if (!isSameMonth(day, currentDate)) {
                    setCurrentDate(startOfMonth(day));
                  }
                }}
                className={`
                  relative min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors
                  ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'bg-white'}
                  ${isSelected ? 'ring-2 ring-inset ring-emerald-500 z-10' : 'hover:bg-gray-50'}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-emerald-600 text-white' : 'text-gray-700'}
                  `}>
                    {format(day, 'd')}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {dayBookings.length}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map(booking => (
                    <div 
                      key={booking.id} 
                      className={`
                        text-[10px] px-1.5 py-0.5 rounded truncate border
                        ${booking.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          booking.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                          booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                          'bg-amber-50 text-amber-700 border-amber-100'}
                      `}
                    >
                      {booking.service_time} - {booking.customer_phone}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-[10px] text-gray-400 pl-1">
                      + {dayBookings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details */}
      <div className="w-full lg:w-80 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
          </h3>
          <p className="text-sm text-gray-500">
            {selectedDate ? `${selectedDayBookings.length} bookings scheduled` : 'Click on a date to view bookings'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedDayBookings.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Clock className="mx-auto mb-2 opacity-20" size={48} />
              <p>No bookings for this day</p>
            </div>
          ) : (
            selectedDayBookings.map(booking => (
              <div key={booking.id} className="p-3 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors bg-gray-50/50">
                <div className="flex justify-between items-start mb-2">
                  <span className={`
                    text-xs font-bold px-2 py-0.5 rounded capitalize
                    ${booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                      booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'}
                  `}>
                    {booking.status}
                  </span>
                  <span className="text-xs font-mono text-gray-500">#{booking.id}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <Clock size={14} className="text-emerald-600" />
                    {booking.service_time}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User size={14} className="text-gray-400" />
                    {booking.customer_phone}
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <MapPin size={14} className="text-gray-400 mt-0.5" />
                    <span className="line-clamp-2">{booking.location}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

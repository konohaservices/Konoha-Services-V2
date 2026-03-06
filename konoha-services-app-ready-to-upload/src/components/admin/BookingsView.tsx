import React, { useState, useEffect } from 'react';
import { getBookings, updateBooking, getTechnicians } from '../../lib/api';
import { Booking, Technician } from '../../lib/types';
import { format } from 'date-fns';
import { Search, Filter, CheckCircle, XCircle, Clock, User, MapPin, Phone, Calendar, Download, History } from 'lucide-react';
import { motion } from 'motion/react';
import CustomerHistoryModal from './CustomerHistoryModal';

export default function BookingsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingsData, techniciansData] = await Promise.all([
        getBookings(),
        getTechnicians()
      ]);
      setBookings(bookingsData);
      setTechnicians(techniciansData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Date', 'Time', 'Customer Phone', 'Location', 'Status', 'Total Price', 'Technician', 'Services', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredBookings.map(b => [
        b.id,
        b.service_date,
        b.service_time,
        b.customer_phone,
        `"${b.location.replace(/"/g, '""')}"`,
        b.status,
        b.total_price_bhd,
        technicians.find(t => t.id === b.technician_id)?.name || 'Unassigned',
        `"${Object.entries(b.services).filter(([_, v]) => (v as number) > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}"`,
        `"${(b.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `bookings_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    console.log(`Updating booking ${id} to ${newStatus}`);
    try {
      const result = await updateBooking(id, { status: newStatus });
      console.log('Update result:', result);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus as any } : b));
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  };

  const handleTechnicianAssign = async (id: number, technicianId: number) => {
    try {
      await updateBooking(id, { technician_id: technicianId });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, technician_id: technicianId } : b));
    } catch (error) {
      console.error('Failed to assign technician:', error);
      alert('Failed to assign technician');
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    const matchesSearch = 
      booking.customer_phone.includes(searchTerm) || 
      booking.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toString().includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) return <div className="p-8 text-center">Loading bookings...</div>;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 w-full md:w-64">
          <Search size={18} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search bookings..." 
            className="bg-transparent outline-none w-full text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"
          >
            <Download size={16} /> Export
          </button>
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                filterStatus === status 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No bookings found matching your filters.</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <motion.div 
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm text-gray-500">#{booking.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      {booking.customer_phone}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} className="text-emerald-600" />
                      {booking.service_date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={16} className="text-emerald-600" />
                      {booking.service_time}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 border-t border-gray-100 pt-4">
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Services</h4>
                    <div className="space-y-1 text-sm">
                      {Object.entries(booking.services).map(([key, value]) => {
                        if ((value as number) > 0) {
                          return (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="font-medium">x{value as number}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    {booking.notes && (
                      <div className="mt-3 bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-100">
                        <span className="font-bold">Note:</span> {booking.notes}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Location</h4>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <MapPin size={16} className="mt-0.5 text-gray-400 flex-shrink-0" />
                        {booking.location}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Assignment</h4>
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <select 
                          className="text-sm border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                          value={booking.technician_id || ''}
                          onChange={(e) => handleTechnicianAssign(booking.id, Number(e.target.value))}
                        >
                          <option value="">Unassigned</option>
                          {technicians.map(tech => (
                            <option key={tech.id} value={tech.id}>{tech.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <div className="font-bold text-lg text-emerald-600">
                    {booking.total_price_bhd.toFixed(2)} BHD
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedCustomerPhone(booking.customer_phone)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <History size={16} /> History
                    </button>
                    {booking.status === 'pending' && (
                      <button 
                        onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Confirm
                      </button>
                    )}
                    {booking.status === 'confirmed' && (
                      <button 
                        onClick={() => handleStatusUpdate(booking.id, 'completed')}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        Complete
                      </button>
                    )}
                    {booking.status === 'cancelled' && (
                      <button 
                        onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                        className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        Revert to Confirmed
                      </button>
                    )}
                    {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                      <button 
                        onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {selectedCustomerPhone && (
        <CustomerHistoryModal 
          phone={selectedCustomerPhone} 
          onClose={() => setSelectedCustomerPhone(null)} 
        />
      )}
    </div>
  );
}

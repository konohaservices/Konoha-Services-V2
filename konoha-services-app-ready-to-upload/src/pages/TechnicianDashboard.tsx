import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBookings, updateBooking, uploadBookingPhoto, createExpense } from '../lib/api';
import { Booking } from '../lib/types';
import { LogOut, Calendar, Clock, MapPin, Phone, CheckCircle, XCircle, Navigation, Camera, DollarSign, X, List, Map as MapIcon, Globe, Plus, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import CalendarView from '../components/admin/CalendarView';
import MapView from '../components/admin/MapView';
import { useLanguage } from '../context/LanguageContext';
import BookingForm from '../components/BookingForm';
import EditServicesModal from '../components/technician/EditServicesModal';

export default function TechnicianDashboard() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [mapDate, setMapDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (user?.id) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const data = await getBookings({ technician_id: user?.id });
      setBookings(data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      await updateBooking(id, { status: newStatus });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus as any } : b));
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const todayBookings = bookings.filter(b => b.service_date === format(new Date(), 'yyyy-MM-dd'));
  const upcomingBookings = bookings.filter(b => b.service_date > format(new Date(), 'yyyy-MM-dd'));

  if (loading) return <div className="p-8 text-center">{t('tech.loading')}</div>;

  return (
    <div className={`min-h-screen bg-gray-50 pb-20 ${isRTL ? 'font-arabic' : ''}`}>
      <header className="bg-emerald-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('tech.hello')}, {user?.name}</h1>
            <p className="text-emerald-100 text-sm">{t('tech.tasks')}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-emerald-600 p-2 rounded-lg hover:bg-emerald-50 transition-colors shadow-sm"
              title={t('tech.create_special')}
            >
              <Plus size={20} />
            </button>
            <button 
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="bg-emerald-700 p-2 rounded-lg hover:bg-emerald-800 transition-colors"
            >
              <Globe size={20} />
            </button>
            <button onClick={logout} className="bg-emerald-700 p-2 rounded-lg hover:bg-emerald-800 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex gap-4 overflow-x-auto pb-2">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl min-w-[140px] border border-white/20">
              <div className="text-3xl font-bold mb-1">{todayBookings.length}</div>
              <div className="text-xs text-emerald-100 uppercase tracking-wide">{t('tech.today')}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl min-w-[140px] border border-white/20">
              <div className="text-3xl font-bold mb-1">{upcomingBookings.length}</div>
              <div className="text-xs text-emerald-100 uppercase tracking-wide">{t('tech.upcoming')}</div>
            </div>
          </div>

          <div className="flex bg-emerald-700/50 p-1 rounded-lg backdrop-blur-sm">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-emerald-100 hover:bg-emerald-600/50'}`}
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white text-emerald-600 shadow-sm' : 'text-emerald-100 hover:bg-emerald-600/50'}`}
            >
              <Calendar size={20} />
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-md transition-all ${viewMode === 'map' ? 'bg-white text-emerald-600 shadow-sm' : 'text-emerald-100 hover:bg-emerald-600/50'}`}
            >
              <MapIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {viewMode === 'calendar' ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <CalendarView technicianId={user?.id} />
          </div>
        ) : viewMode === 'map' ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <MapIcon className="text-emerald-600" size={20} />
                {t('tech.route_view')}
              </h2>
              <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                <Calendar size={14} className="text-gray-400" />
                <input 
                  type="date" 
                  value={mapDate}
                  onChange={(e) => setMapDate(e.target.value)}
                  className="text-xs border-none bg-transparent focus:ring-0 p-0"
                />
              </div>
            </div>
            <MapView bookings={bookings.filter(b => b.service_date === mapDate)} />
          </div>
        ) : (
          <>
            <section>
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="text-emerald-600" size={20} />
                {t('tech.today_schedule')}
              </h2>
              
              <div className="space-y-4">
                {todayBookings.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl text-center text-gray-500 border border-dashed border-gray-200">
                    No tasks scheduled for today.
                  </div>
                ) : (
                  todayBookings.map((booking: Booking) => (
                    <BookingCard 
                      key={booking.id} 
                      booking={booking} 
                      onStatusUpdate={handleStatusUpdate}
                      onEditServices={(b) => setEditingBooking(b)}
                      userId={user?.id}
                    />
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="text-blue-600" size={20} />
                {t('tech.upcoming')}
              </h2>
              <div className="space-y-4">
                {upcomingBookings.map((booking: Booking) => (
                  <BookingCard 
                    key={booking.id} 
                    booking={booking} 
                    onStatusUpdate={handleStatusUpdate}
                    onEditServices={(b) => setEditingBooking(b)}
                    isUpcoming
                    userId={user?.id}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Create Booking Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl relative"
            >
              <button 
                onClick={() => setShowCreateModal(false)}
                className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 hover:bg-gray-100 rounded-full z-10`}
              >
                <X size={20} />
              </button>
              <div className="p-4">
                <BookingForm 
                  isTechnicianView={true} 
                  technicianId={user?.id} 
                  onComplete={() => {
                    setShowCreateModal(false);
                    fetchBookings();
                  }} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Services Modal */}
      {editingBooking && (
        <EditServicesModal 
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onUpdate={(updated) => {
            setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
            setEditingBooking(null);
          }}
        />
      )}
    </div>
  );
}

const BookingCard: React.FC<{ booking: Booking, onStatusUpdate: (id: number, status: string) => void, isUpcoming?: boolean, userId?: number, onEditServices: (b: Booking) => void }> = ({ booking, onStatusUpdate, isUpcoming, userId, onEditServices }) => {
  const { t } = useLanguage();
  const isCompleted = booking.status === 'completed';
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Helper to compress image
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024; // Resize to max 1024px width
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Compress to JPEG with 0.6 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      alert("Please select a photo");
      return;
    }

    setUploading(true);
    
    try {
      // Compress image before sending
      const compressedDataUrl = await compressImage(file);
      
      await uploadBookingPhoto(booking.id, {
        url: compressedDataUrl, // Send base64 string
        type: formData.get('type') as 'before' | 'after'
      });
      alert('Photo uploaded successfully!');
      setShowPhotoModal(false);
    } catch (error) {
      console.error(error);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleExpenseLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      await createExpense({
        booking_id: booking.id,
        category: formData.get('category'),
        amount: Number(formData.get('amount')),
        description: formData.get('description'),
        logged_by: userId
      });
      alert('Expense logged successfully!');
      setShowExpenseModal(false);
    } catch (error) {
      alert('Failed to log expense');
    }
  };

  const handleDiscountUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const amount = Number(new FormData(form).get('amount'));
    
    try {
      await updateBooking(booking.id, { discount_amount: amount });
      // Ideally update local state too, but parent will refresh or we can trigger a refresh
      alert('Discount applied successfully!');
      setShowDiscountModal(false);
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      alert('Failed to apply discount');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${isCompleted ? 'border-emerald-100 opacity-75' : 'border-gray-100'}`}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-lg text-sm">
              {booking.service_time}
            </div>
            {isUpcoming && (
              <div className="text-sm text-gray-500">
                {format(new Date(booking.service_date), 'MMM d')}
              </div>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
            booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
            booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {booking.status}
          </span>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <MapPin className="text-gray-400 mt-1 flex-shrink-0" size={18} />
            <div>
              <p className="text-gray-900 font-medium leading-snug">{booking.location}</p>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location)}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 flex items-center gap-1 mt-1 hover:underline"
              >
                <Navigation size={12} /> Open in Maps
              </a>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Phone className="text-gray-400 flex-shrink-0" size={18} />
            <a href={`tel:${booking.customer_phone}`} className="text-gray-900 font-medium hover:text-emerald-600">
              {booking.customer_phone}
            </a>
            <a 
              href={`https://wa.me/${booking.customer_phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 hover:bg-green-200 ml-2"
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-4">
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
            <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600 italic">
              "{booking.notes}"
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => onEditServices(booking)}
            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-200"
          >
            <Edit size={16} /> {t('tech.services')}
          </button>
          <button 
            onClick={() => setShowPhotoModal(true)}
            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-200"
          >
            <Camera size={16} /> {t('tech.photos')}
          </button>
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-200"
          >
            <DollarSign size={16} /> {t('tech.expense')}
          </button>
        </div>

        {/* Mark Completed - Only for today/past jobs that are confirmed */}
        {!isUpcoming && booking.status === 'confirmed' && (
          <button 
            onClick={() => onStatusUpdate(booking.id, 'completed')}
            className="w-full mb-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            {t('tech.mark_as_completed')}
          </button>
        )}

        {/* Cancel Job - For any job that is not completed or already cancelled */}
        {booking.status !== 'completed' && booking.status !== 'cancelled' && (
          <button 
            onClick={() => {
              if (confirm(t('tech.confirm_cancel'))) {
                onStatusUpdate(booking.id, 'cancelled');
              }
            }}
            className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-100"
          >
            <XCircle size={20} />
            {t('tech.cancel_job')}
          </button>
        )}

        {isCompleted && (
          <a 
            href={`https://wa.me/${booking.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Thank you for choosing Konoha! Please rate your service from 1 to 5 stars and leave a quick comment here: ${window.location.origin}/feedback/${booking.id}`)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <Phone size={20} />
            {t('tech.send_feedback')}
          </a>
        )}
      </div>

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Upload Photo</h3>
              <button onClick={() => setShowPhotoModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handlePhotoUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="type" value="before" defaultChecked /> Before
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="type" value="after" /> After
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Photo</label>
                <input type="file" name="file" accept="image/*" className="w-full p-2 border rounded-lg text-sm" required />
                <p className="text-xs text-gray-500 mt-1">Image will be compressed before upload.</p>
              </div>
              <button type="submit" disabled={uploading} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Log Expense</h3>
              <button onClick={() => setShowExpenseModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleExpenseLog} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category" className="w-full p-2 border rounded-lg" required>
                  <option value="fuel">Fuel</option>
                  <option value="parts">Spare Parts</option>
                  <option value="labor">Labor</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (BHD)</label>
                <input type="number" step="0.001" name="amount" className="w-full p-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" className="w-full p-2 border rounded-lg" rows={2} required></textarea>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold">
                Save Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Apply Discount</h3>
              <button onClick={() => setShowDiscountModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleDiscountUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount (BHD)</label>
                <input 
                  type="number" 
                  step="0.001" 
                  name="amount" 
                  className="w-full p-2 border rounded-lg" 
                  defaultValue={booking.discount_amount || 0}
                  required 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Original Total: {booking.total_price_bhd.toFixed(3)} BHD
                </p>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold">
                Apply Discount
              </button>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

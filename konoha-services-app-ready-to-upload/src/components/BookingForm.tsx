import React, { useState, useEffect } from 'react';
import { useSettings, createBooking, checkAvailability } from '../lib/api';
import { calculatePrice, calculateDuration, calculateRegularPrice } from '../lib/pricing';
import { LOCATIONS } from '../lib/types';
import { Calendar, Clock, MapPin, Phone, CheckCircle, Loader2, Wind, Armchair, BedDouble, BedSingle, Blinds, Grid3X3, ChevronRight, ChevronLeft, Home, Building2, Map, DollarSign } from 'lucide-react';
import { format, addDays, isSameDay, parseISO, getDaysInMonth } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export default function BookingForm({ isTechnicianView = false, onComplete, technicianId }: { isTechnicianView?: boolean, onComplete?: () => void, technicianId?: number }) {
  const { settings } = useSettings();
  const { t, isRTL } = useLanguage();
  const [step, setStep] = useState(1);
  
  const today = new Date();
  
  // Generate next 30 days for selection
  const next30Days = Array.from({ length: 30 }, (_, i) => addDays(today, i));

  const [formData, setFormData] = useState({
    phone: '',
    location: '',
    service_date: format(today, 'yyyy-MM-dd'),
    service_time: '',
    notes: '',
    services: {
      ac_count: 0,
      sofa_seats: 0,
      mattress_big: 0,
      mattress_small: 0,
      curtains: 0,
      carpet_meters: 0,
    }
  });

  const [manualDiscount, setManualDiscount] = useState(0);

  // Detailed address state
  const [addressDetails, setAddressDetails] = useState({
    area: '',
    block: '',
    road: '',
    building: '',
    flat: '',
    landmark: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Derived state
  const totalDuration = settings ? calculateDuration(formData.services, settings) : 0;
  const basePrice = settings ? calculatePrice(formData.services, settings) : 0;
  const regularPrice = settings ? calculateRegularPrice(formData.services, settings) : 0;
  
  // If technician sets a manual discount, use it. Otherwise use the calculated rule-based discount.
  // Or should manual discount be additive? The user said "discount from the total price".
  // Let's make manual discount *additional* to any existing rule-based discount, OR just a direct subtraction from the final price.
  // Simplest interpretation: Final Price = Calculated Price - Manual Discount.
  const totalPrice = Math.max(0, basePrice - manualDiscount);
  
  // Total discount = (Regular Price - Base Price) + Manual Discount
  const ruleBasedDiscount = Math.max(0, parseFloat((regularPrice - basePrice).toFixed(2)));
  const totalDiscountAmount = ruleBasedDiscount + manualDiscount;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    if (formData.service_date) {
      setLoadingSlots(true);
      const durationToCheck = totalDuration > 0 ? totalDuration : 30;
      
      checkAvailability(formData.service_date, durationToCheck, isTechnicianView)
        .then(slots => {
          setAvailableSlots(slots);
          // Clear selected time if it's no longer available
          if (formData.service_time && !slots.includes(formData.service_time)) {
            setFormData(prev => ({ ...prev, service_time: '' }));
          }
        })
        .catch(err => {
          console.error(err);
          setAvailableSlots([]);
        })
        .finally(() => setLoadingSlots(false));
    }
  }, [formData.service_date, totalDuration, isTechnicianView]);

  const handleServiceChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      services: { ...prev.services, [field]: Math.max(0, value) }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Construct full location string
    const fullLocation = [
      addressDetails.area,
      addressDetails.block ? `Block ${addressDetails.block}` : '',
      addressDetails.road ? `Road ${addressDetails.road}` : '',
      addressDetails.building ? `Bldg ${addressDetails.building}` : '',
      addressDetails.flat ? `Flat/Office ${addressDetails.flat}` : '',
      addressDetails.landmark ? `Near ${addressDetails.landmark}` : ''
    ].filter(Boolean).join(', ');

    if (!formData.phone || !fullLocation || !formData.service_date || !formData.service_time) {
      alert('Please fill all required fields / يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createBooking({
        customer_phone: formData.phone,
        location: fullLocation,
        service_date: formData.service_date,
        service_time: formData.service_time,
        services: formData.services,
        total_duration_minutes: totalDuration,
        total_price_bhd: totalPrice,
        discount_amount: totalDiscountAmount,
        notes: formData.notes,
        technician_id: technicianId,
        bypass_working_hours: isTechnicianView
      });
      setBookingResult(result);
      setFormData(prev => ({ ...prev, location: fullLocation })); // Update state for receipt
      setStep(3);
    } catch (error: any) {
      alert(error.message || 'Booking failed. The selected slot might be taken. Please try another time.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!settings) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-emerald-600" /></div>;

  if (settings.bookings_enabled === false) {
    return (
      <div className="max-w-2xl mx-auto p-4 min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-md text-center p-8">
           <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <Clock className="w-10 h-10" />
           </div>
           <h2 className="text-2xl font-bold text-gray-900 mb-2">Bookings Paused</h2>
           <p className="text-gray-500 mb-6">
             We are currently not accepting new bookings. Please check back later or contact us directly.
             <br/>
             نعتذر، الحجوزات متوقفة حالياً. يرجى المحاولة لاحقاً أو التواصل معنا مباشرة.
           </p>
           {settings.whatsapp_number && (
             <a 
               href={`https://wa.me/${settings.whatsapp_number}`}
               target="_blank"
               rel="noreferrer"
               className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#20bd5a] transition-colors"
             >
               Contact via WhatsApp / تواصل عبر واتساب
             </a>
           )}
        </div>
      </div>
    );
  }

  const generateWhatsAppLink = () => {
    const message = isTechnicianView 
      ? `Hello, your booking is confirmed.\nID: ${bookingResult?.id}\nDate: ${formData.service_date}\nTime: ${formData.service_time}\nTotal: ${totalPrice} BHD\nTechnician will arrive on time.`
      : `Hello, I confirmed my booking.\nID: ${bookingResult?.id}\nPhone: ${formData.phone}\nLocation: ${formData.location}\nDate: ${formData.service_date}\nTime: ${formData.service_time}\nTotal: ${totalPrice} BHD`;
    
    const number = isTechnicianView ? formData.phone : (settings.whatsapp_number || '');
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className={`max-w-2xl mx-auto p-4 pb-24 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden relative">
        {/* Header */}
        <div className="bg-emerald-600 p-6 text-white text-center flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-700">
            <div 
              className="h-full bg-emerald-300 transition-all duration-500 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          
          <img 
            src="https://drive.google.com/thumbnail?id=1LJai3wHWTGKc7arWHrvHqwszbf8S3jyR&sz=w400" 
            alt="Konoha Services Logo" 
            className="h-32 mb-4 object-contain drop-shadow-lg"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl font-bold">Konoha Services</h1>
          <p className="opacity-90 text-sm font-medium">Professional Cleaning & AC Repair Services</p>
          <p className="text-xs mt-2 opacity-80 italic">"Your comfort, our responsibility"</p>
          <p className="text-xs opacity-80 font-arabic">(راحتكم علينا)</p>
        </div>

        <div className="p-6">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Select Services</h2>
                <span className="text-sm text-gray-500">اختر الخدمات</span>
              </div>
              
              <div className="grid gap-4 mb-8">
                <ServiceInput 
                  label="AC Units" 
                  subLabel="مكيفات"
                  value={formData.services.ac_count} 
                  onChange={(v) => handleServiceChange('ac_count', v)} 
                  icon={<Wind className="w-6 h-6 text-emerald-600" />}
                  price={settings.price_ac_1_2}
                />
                <ServiceInput 
                  label="Sofa Seats" 
                  subLabel="مقاعد كنب"
                  value={formData.services.sofa_seats} 
                  onChange={(v) => handleServiceChange('sofa_seats', v)} 
                  icon={<Armchair className="w-6 h-6 text-purple-600" />}
                  price={settings.price_sofa_seat}
                />
                <ServiceInput 
                  label="Mattress (Big)" 
                  subLabel="مرتبة كبيرة"
                  value={formData.services.mattress_big} 
                  onChange={(v) => handleServiceChange('mattress_big', v)} 
                  icon={<BedDouble className="w-6 h-6 text-blue-600" />}
                  price={settings.price_mattress_big}
                />
                <ServiceInput 
                  label="Mattress (Small)" 
                  subLabel="مرتبة صغيرة"
                  value={formData.services.mattress_small} 
                  onChange={(v) => handleServiceChange('mattress_small', v)} 
                  icon={<BedSingle className="w-6 h-6 text-indigo-600" />}
                  price={settings.price_mattress_small}
                />
                <ServiceInput 
                  label="Curtains" 
                  subLabel="ستائر"
                  value={formData.services.curtains} 
                  onChange={(v) => handleServiceChange('curtains', v)} 
                  icon={<Blinds className="w-6 h-6 text-orange-600" />}
                  price={settings.price_curtains}
                />
                <ServiceInput 
                  label="Carpet (Meters)" 
                  subLabel="سجاد (متر)"
                  value={formData.services.carpet_meters} 
                  onChange={(v) => handleServiceChange('carpet_meters', v)} 
                  icon={<Grid3X3 className="w-6 h-6 text-amber-700" />}
                  price={settings.price_carpet_meter}
                />
              </div>

              {/* Sticky Footer for Step 1 */}
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:absolute md:bottom-0 md:left-0 md:right-0 md:rounded-b-2xl">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500">Total / الإجمالي</div>
                    <div className="text-xl font-bold text-emerald-600">{totalPrice.toFixed(2)} BHD</div>
                    {totalDuration > 0 && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(totalDuration / 60) > 0 ? `${Math.floor(totalDuration / 60)}h ` : ''}{totalDuration % 60 > 0 ? `${totalDuration % 60}m` : ''}
                      </div>
                    )}
                    {totalDiscountAmount > 0 && (
                      <div className="text-xs text-emerald-600 font-medium">Saved {totalDiscountAmount.toFixed(2)} BHD</div>
                    )}
                  </div>
                  <button 
                    onClick={() => setStep(2)}
                    disabled={totalPrice === 0}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-24">
              <button 
                onClick={() => setStep(1)}
                className="mb-6 text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Services / رجوع
              </button>

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Details & Time</h2>
                <span className="text-sm text-gray-500">التفاصيل والوقت</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 mb-8">
                {/* Contact Info */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" /> Contact Info
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Phone Number (WhatsApp)</label>
                    <input 
                      type="tel" 
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                      placeholder="3333 3333"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                {/* Location Details */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Location Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Area / المنطقة</label>
                      <select 
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                        value={addressDetails.area}
                        onChange={e => setAddressDetails({...addressDetails, area: e.target.value})}
                      >
                        <option value="">Select Area...</option>
                        {LOCATIONS.map(loc => (
                          <option key={loc.en} value={loc.en}>{loc.en} - {loc.ar}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Block / مجمع (Optional)</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          placeholder="123"
                          value={addressDetails.block}
                          onChange={e => setAddressDetails({...addressDetails, block: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Road / طريق (Optional)</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          placeholder="456"
                          value={addressDetails.road}
                          onChange={e => setAddressDetails({...addressDetails, road: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Building / مبنى (Optional)</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          placeholder="789"
                          value={addressDetails.building}
                          onChange={e => setAddressDetails({...addressDetails, building: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Flat/Office (Opt)</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          placeholder="10"
                          value={addressDetails.flat}
                          onChange={e => setAddressDetails({...addressDetails, flat: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Landmark (Optional)</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                        placeholder="Near Supermarket..."
                        value={addressDetails.landmark}
                        onChange={e => setAddressDetails({...addressDetails, landmark: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {isTechnicianView && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Manual Discount
                    </h3>
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1 uppercase tracking-wide">Discount Amount (BHD)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.5"
                        className="w-full px-4 py-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                        placeholder="0.00"
                        value={manualDiscount || ''}
                        onChange={e => setManualDiscount(parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-amber-700 mt-1">
                        This will be subtracted from the total price.
                      </p>
                    </div>
                  </div>
                )}

                {/* Date Selection */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Date & Time
                  </h3>
                  
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Select Date / اختر التاريخ</label>
                    <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide snap-x">
                      {next30Days.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const isSelected = formData.service_date === dateStr;
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => setFormData({...formData, service_date: dateStr})}
                            className={`flex-shrink-0 w-20 p-3 rounded-xl border flex flex-col items-center justify-center transition-all snap-start ${
                              isSelected 
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-600 ring-offset-1' 
                                : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                            }`}
                          >
                            <span className="text-xs font-medium uppercase">{format(date, 'EEE')}</span>
                            <span className="text-xl font-bold my-1">{format(date, 'd')}</span>
                            <span className="text-xs opacity-70">{format(date, 'MMM')}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Time Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Select Time / اختر الوقت</label>
                    
                    {isTechnicianView && (
                      <div className="mb-4 bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <label className="flex items-center gap-2 text-sm text-amber-900 font-bold mb-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded text-amber-600 focus:ring-amber-500"
                            checked={false} // Always unchecked initially, acts as a toggle to clear
                            onChange={(e) => {
                               // This checkbox logic is a bit weird in the previous edit.
                               // Let's simplify: Just show the input. If they type in it, it overrides.
                            }}
                            style={{ display: 'none' }} // Hide the checkbox, just show the input
                          />
                          <span className="flex items-center gap-2"><Clock className="w-4 h-4"/> Manual Time Override (Technician Only)</span>
                        </label>
                        <input 
                          type="time" 
                          className="w-full px-4 py-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white font-mono text-lg"
                          value={formData.service_time}
                          onChange={e => setFormData({...formData, service_time: e.target.value})}
                        />
                        <p className="text-xs text-amber-700 mt-2">
                          Use this to force a booking time, even if outside working hours or if slots are full.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {loadingSlots ? (
                        <div className="col-span-full text-center py-8 text-gray-500 flex flex-col items-center">
                          <Loader2 className="w-6 h-6 animate-spin mb-2 text-emerald-600" />
                          <span className="text-sm">Checking availability...</span>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                          No slots available for this date
                        </div>
                      ) : (
                        availableSlots.map(time => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setFormData({...formData, service_time: time})}
                            className={`py-2 px-1 rounded-lg text-sm font-medium transition-all border ${
                              formData.service_time === time
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
                            }`}
                          >
                            {time}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes / ملاحظات (Optional)</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                    rows={2}
                    placeholder="Any special instructions..."
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </form>

              {/* Sticky Footer for Step 2 */}
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:absolute md:bottom-0 md:left-0 md:right-0 md:rounded-b-2xl">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="text-xl font-bold text-emerald-600">{totalPrice.toFixed(2)} BHD</div>
                    {totalDuration > 0 && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(totalDuration / 60) > 0 ? `${Math.floor(totalDuration / 60)}h ` : ''}{totalDuration % 60 > 0 ? `${totalDuration % 60}m` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setStep(1)}
                      className="px-4 py-3 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-200 flex items-center gap-2"
                    >
                      {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Confirm'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
              <p className="text-gray-500 mb-8 text-lg">تم تأكيد الحجز بنجاح</p>
              
              <div className="bg-gray-50 rounded-2xl p-6 max-w-sm mx-auto mb-8 text-left border border-gray-100">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium">{formData.service_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time</span>
                    <span className="font-medium">{formData.service_time}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-gray-500 block text-xs mb-1">Location</span>
                    <span className="font-medium text-sm block leading-snug">{formData.location}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-3 mt-2">
                    <span className="text-gray-900 font-bold">Total</span>
                    <span className="text-emerald-600 font-bold">{totalPrice.toFixed(2)} BHD</span>
                  </div>
                </div>
              </div>

              <a 
                href={generateWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#20bd5a] transition-all shadow-lg shadow-green-200 hover:shadow-green-300 transform hover:-translate-y-1"
              >
                {isTechnicianView ? 'Send Confirmation to Customer' : 'Send Confirmation via WhatsApp'}
                <br/>
                {isTechnicianView ? 'إرسال التأكيد للعميل' : 'إرسال التأكيد عبر واتساب'}
              </a>

              {isTechnicianView && onComplete && (
                <button
                  onClick={onComplete}
                  className="block w-full mt-4 text-gray-500 hover:text-gray-700 font-medium"
                >
                  Close / New Booking
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceInput({ label, subLabel, value, onChange, icon, price }: { label: string, subLabel: string, value: number, onChange: (v: number) => void, icon?: React.ReactNode, price: number }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${value > 0 ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-emerald-200'}`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${value > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{label}</h3>
          <p className="text-sm text-gray-500">{subLabel}</p>
          <p className="text-xs font-mono text-emerald-600 mt-1">{price} BHD / unit</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-gray-100 shadow-sm">
        <button 
          onClick={() => onChange(value - 1)}
          disabled={value === 0}
          className="w-8 h-8 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
        >
          -
        </button>
        <span className="w-6 text-center font-bold text-lg text-gray-900">{value}</span>
        <button 
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-md bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-sm"
        >
          +
        </button>
      </div>
    </div>
  );
}

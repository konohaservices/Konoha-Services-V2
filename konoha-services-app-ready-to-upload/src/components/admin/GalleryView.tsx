import React, { useState, useEffect } from 'react';
import { getAdminGallery, updateBookingQuality } from '../../lib/api';
import { BookingPhoto } from '../../lib/types';
import { CheckCircle, XCircle, AlertTriangle, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function GalleryView() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'approved' | 'flagged'>('all');

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const data = await getAdminGallery();
      setPhotos(data);
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: number, status: string) => {
    try {
      await updateBookingQuality(bookingId, status);
      setPhotos(prev => prev.map(p => p.booking_id === bookingId ? { ...p, quality_status: status } : p));
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const filteredPhotos = filter === 'all' 
    ? photos 
    : photos.filter(p => p.quality_status === filter);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Work Gallery & Quality Control</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-sm ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('pending_review')}
            className={`px-3 py-1 rounded-full text-sm ${filter === 'pending_review' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Pending
          </button>
          <button 
            onClick={() => setFilter('approved')}
            className={`px-3 py-1 rounded-full text-sm ${filter === 'approved' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Approved
          </button>
          <button 
            onClick={() => setFilter('flagged')}
            className={`px-3 py-1 rounded-full text-sm ${filter === 'flagged' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Flagged
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPhotos.map((photo) => (
          <div key={photo.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
            <div className="relative aspect-video bg-gray-100">
              <img 
                src={photo.url} 
                alt={`${photo.type} photo`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded uppercase font-bold">
                {photo.type}
              </div>
              <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold uppercase ${
                photo.quality_status === 'approved' ? 'bg-emerald-500 text-white' :
                photo.quality_status === 'flagged' ? 'bg-red-500 text-white' :
                'bg-yellow-500 text-white'
              }`}>
                {photo.quality_status.replace('_', ' ')}
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-bold text-gray-900">Booking #{photo.booking_id}</div>
                  <div className="text-xs text-gray-500">{format(new Date(photo.service_date), 'MMM d, yyyy')}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-gray-700">{photo.technician_name || 'Unassigned'}</div>
                  <div className="text-xs text-gray-400">{photo.location}</div>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => handleUpdateStatus(photo.booking_id, 'approved')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
                    photo.quality_status === 'approved' 
                      ? 'bg-emerald-50 text-emerald-700 cursor-default' 
                      : 'bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                  disabled={photo.quality_status === 'approved'}
                >
                  <CheckCircle size={16} /> Approve
                </button>
                <button 
                  onClick={() => handleUpdateStatus(photo.booking_id, 'flagged')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
                    photo.quality_status === 'flagged' 
                      ? 'bg-red-50 text-red-700 cursor-default' 
                      : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-700'
                  }`}
                  disabled={photo.quality_status === 'flagged'}
                >
                  <AlertTriangle size={16} /> Flag
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredPhotos.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          No photos found matching the selected filter.
        </div>
      )}
    </div>
  );
}

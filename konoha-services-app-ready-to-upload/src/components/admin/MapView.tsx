import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Booking } from '../../lib/types';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  bookings: Booking[];
}

export default function MapView({ bookings }: MapViewProps) {
  const [locations, setLocations] = useState<{ booking: Booking, lat: number, lng: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const geocodeLocations = async () => {
      setLoading(true);
      const newLocations = [];
      for (const booking of bookings) {
        try {
          // Simple geocoding using Nominatim (OpenStreetMap)
          // In a real app, you'd use Google Maps Geocoding API
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(booking.location + ', Bahrain')}`);
          const data = await response.json();
          if (data && data.length > 0) {
            newLocations.push({
              booking,
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            });
          }
        } catch (error) {
          console.error("Geocoding failed for", booking.location);
        }
      }
      setLocations(newLocations);
      setLoading(false);
    };

    if (bookings.length > 0) {
      geocodeLocations();
    } else {
      setLocations([]);
      setLoading(false);
    }
  }, [bookings]);

  if (loading) {
    return <div className="p-8 text-center bg-gray-50 rounded-xl">Loading map data...</div>;
  }

  if (locations.length === 0) {
    return <div className="p-8 text-center bg-gray-50 rounded-xl">No locations could be mapped.</div>;
  }

  // Center on the first location or Bahrain's center
  const center: [number, number] = locations.length > 0 
    ? [locations[0].lat, locations[0].lng] 
    : [26.0667, 50.5577];

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc, i) => (
          <Marker key={i} position={[loc.lat, loc.lng]}>
            <Popup>
              <div className="p-1">
                <h3 className="font-bold">{loc.booking.service_time}</h3>
                <p className="text-sm">{loc.booking.location}</p>
                <p className="text-xs text-gray-500">{loc.booking.customer_phone}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

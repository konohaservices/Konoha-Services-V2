import React, { useState, useEffect } from 'react';
import { useSettings, updateSettings } from '../../lib/api';
import { ServiceRates, PricingRule, WorkingHours } from '../../lib/types';
import { Save, Loader2, DollarSign, Clock, ToggleLeft, ToggleRight, Plus, Trash2, Calendar, Database, Lock } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SERVICES = [
  { key: 'ac_count', label: 'AC Unit' },
  { key: 'sofa_seats', label: 'Sofa Seat' },
  { key: 'mattress_big', label: 'Mattress (Big)' },
  { key: 'mattress_small', label: 'Mattress (Small)' },
  { key: 'curtains', label: 'Curtains' },
  { key: 'carpet_meters', label: 'Carpet (m)' },
];

export default function SettingsView() {
  const { settings: initialSettings, loading } = useSettings();
  const [settings, setSettings] = useState<ServiceRates | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      setPricingRules(initialSettings.pricing_rules || []);
      
      // Initialize working hours with defaults if missing
      const defaultHours: WorkingHours = {};
      DAYS.forEach(day => {
        defaultHours[day] = initialSettings.working_hours?.[day] || { start: '08:00', end: '18:00', is_off: false };
      });
      setWorkingHours(defaultHours);
    }
  }, [initialSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings({
        ...settings,
        pricing_rules: pricingRules,
        working_hours: workingHours
      });
      alert('Settings saved successfully');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async (type: 'photos' | 'cancelled_bookings', months: number) => {
    if (!confirm(`Are you sure you want to delete ${type.replace('_', ' ')} older than ${months} months? This cannot be undone.`)) return;
    
    try {
      const res = await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, olderThanMonths: months })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e) {
      alert('Error clearing data');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      alert("Please enter both current and new passwords.");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e) {
      alert('Error changing password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleChange = (field: keyof ServiceRates, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const addPricingRule = () => {
    setPricingRules([...pricingRules, { service: 'ac_count', quantity: 3, price: 10 }]);
  };

  const removePricingRule = (index: number) => {
    setPricingRules(pricingRules.filter((_, i) => i !== index));
  };

  const updatePricingRule = (index: number, field: keyof PricingRule, value: any) => {
    const newRules = [...pricingRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setPricingRules(newRules);
  };

  const updateWorkingHours = (day: string, field: keyof WorkingHours[string], value: any) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  if (loading || !settings) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl pb-20">
      <div className="flex justify-between items-center sticky top-0 bg-gray-50 py-4 z-10">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
        >
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      {/* Base Prices */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="text-emerald-600" size={20} />
          Base Service Prices (BHD)
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <SettingInput 
            label="AC Unit (1.5/2 Ton)" 
            value={settings.price_ac_1_2} 
            onChange={v => handleChange('price_ac_1_2', parseFloat(v))} 
            type="number"
          />
          <SettingInput 
            label="Sofa Seat" 
            value={settings.price_sofa_seat} 
            onChange={v => handleChange('price_sofa_seat', parseFloat(v))} 
            type="number"
          />
          <SettingInput 
            label="Mattress (Big)" 
            value={settings.price_mattress_big} 
            onChange={v => handleChange('price_mattress_big', parseFloat(v))} 
            type="number"
          />
          <SettingInput 
            label="Mattress (Small)" 
            value={settings.price_mattress_small} 
            onChange={v => handleChange('price_mattress_small', parseFloat(v))} 
            type="number"
          />
          <SettingInput 
            label="Curtains" 
            value={settings.price_curtains} 
            onChange={v => handleChange('price_curtains', parseFloat(v))} 
            type="number"
          />
          <SettingInput 
            label="Carpet (per meter)" 
            value={settings.price_carpet_meter} 
            onChange={v => handleChange('price_carpet_meter', parseFloat(v))} 
            type="number"
          />
        </div>
      </div>

      {/* Pricing Rules (Offers) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="text-amber-600" size={20} />
            Special Offers & Bundles
          </h3>
          <button onClick={addPricingRule} className="text-sm text-emerald-600 font-medium flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded">
            <Plus size={16} /> Add Rule
          </button>
        </div>
        
        <div className="space-y-3">
          {pricingRules.length === 0 && <p className="text-sm text-gray-400 italic">No special offers configured.</p>}
          {pricingRules.map((rule, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Service</label>
                  <select 
                    className="w-full p-2 text-sm border rounded bg-white"
                    value={rule.service}
                    onChange={e => updatePricingRule(index, 'service', e.target.value)}
                  >
                    {SERVICES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Quantity</label>
                  <input 
                    type="number" 
                    className="w-full p-2 text-sm border rounded"
                    value={rule.quantity}
                    onChange={e => updatePricingRule(index, 'quantity', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Total Price (BHD)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 text-sm border rounded"
                    value={rule.price}
                    onChange={e => updatePricingRule(index, 'price', parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <button onClick={() => removePricingRule(index)} className="text-red-500 hover:bg-red-50 p-2 rounded mt-4">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="text-purple-600" size={20} />
          Working Hours
        </h3>
        <div className="space-y-2">
          {DAYS.map(day => {
            const config = workingHours[day] || { start: '08:00', end: '18:00', is_off: false };
            return (
              <div key={day} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0">
                <div className="w-32 font-medium text-gray-700">{day}</div>
                
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 ${config.is_off ? 'opacity-30 pointer-events-none' : ''}`}>
                    <input 
                      type="time" 
                      className="p-1 border rounded text-sm"
                      value={config.start}
                      onChange={e => updateWorkingHours(day, 'start', e.target.value)}
                    />
                    <span className="text-gray-400">-</span>
                    <input 
                      type="time" 
                      className="p-1 border rounded text-sm"
                      value={config.end}
                      onChange={e => updateWorkingHours(day, 'end', e.target.value)}
                    />
                  </div>
                  
                  <button 
                    onClick={() => updateWorkingHours(day, 'is_off', !config.is_off)}
                    className={`px-3 py-1 rounded text-xs font-bold uppercase w-16 text-center transition-colors ${
                      config.is_off ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}
                  >
                    {config.is_off ? 'OFF' : 'ON'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Durations */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="text-blue-600" size={20} />
          Service Duration (Minutes)
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <SettingInput 
            label="AC Unit Duration" 
            value={settings.duration_ac_1_2} 
            onChange={v => handleChange('duration_ac_1_2', parseInt(v))} 
            type="number"
          />
          <SettingInput 
            label="Sofa Seat Duration" 
            value={settings.duration_sofa_seat} 
            onChange={v => handleChange('duration_sofa_seat', parseInt(v))} 
            type="number"
          />
          <SettingInput 
            label="Mattress (Big) Duration" 
            value={settings.duration_mattress_big} 
            onChange={v => handleChange('duration_mattress_big', parseInt(v))} 
            type="number"
          />
          <SettingInput 
            label="Mattress (Small) Duration" 
            value={settings.duration_mattress_small} 
            onChange={v => handleChange('duration_mattress_small', parseInt(v))} 
            type="number"
          />
          <SettingInput 
            label="Curtains Duration" 
            value={settings.duration_curtains} 
            onChange={v => handleChange('duration_curtains', parseInt(v))} 
            type="number"
          />
          <SettingInput 
            label="Carpet Duration (per meter)" 
            value={settings.duration_carpet_meter} 
            onChange={v => handleChange('duration_carpet_meter', parseInt(v))} 
            type="number"
          />
        </div>
      </div>

      {/* General */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">General Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <div className="font-medium text-gray-900">Accept New Bookings</div>
              <div className="text-sm text-gray-500">Enable or disable the booking form for customers</div>
            </div>
            <button 
              onClick={() => handleChange('bookings_enabled', !settings.bookings_enabled)}
              className={`text-2xl transition-colors ${settings.bookings_enabled ? 'text-emerald-600' : 'text-gray-400'}`}
            >
              {settings.bookings_enabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              value={settings.whatsapp_number}
              onChange={e => handleChange('whatsapp_number', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Format: 97333333333 (No spaces or +)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Reminder Period (Months)</label>
            <input 
              type="number" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              value={settings.reminder_months || 6}
              onChange={e => handleChange('reminder_months', parseInt(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">Default: 6 months</p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="text-red-600" size={20} />
          Data Management
        </h3>
        <p className="text-sm text-gray-500 mb-4">Manage storage usage by clearing old data. This action is irreversible.</p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-bold text-gray-900 mb-2">Clear Old Photos</h4>
            <p className="text-xs text-gray-500 mb-4">Delete photos uploaded more than 3 months ago.</p>
            <button 
              onClick={() => handleClearData('photos', 3)}
              className="w-full bg-white border border-red-200 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> Delete Old Photos
            </button>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-bold text-gray-900 mb-2">Clear Cancelled Bookings</h4>
            <p className="text-xs text-gray-500 mb-4">Delete cancelled bookings older than 6 months.</p>
            <button 
              onClick={() => handleClearData('cancelled_bookings', 6)}
              className="w-full bg-white border border-red-200 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> Delete Cancelled
            </button>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="text-gray-900" size={20} />
          Security (Change Admin Password)
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
        </div>
        <div className="mt-4">
          <button 
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {changingPassword ? <Loader2 className="animate-spin w-4 h-4" /> : <Lock size={16} />}
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingInput({ label, value, onChange, type = "text" }: { label: string, value: any, onChange: (v: string) => void, type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input 
        type={type} 
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { getTechnicians, createTechnician, updateTechnician } from '../../lib/api';
import { Technician } from '../../lib/types';
import { Plus, User, Phone, Trash2, Loader2, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function TechniciansView() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const data = await getTechnicians();
      setTechnicians(data);
    } catch (error) {
      console.error('Failed to fetch technicians:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (tech: Technician) => {
    setEditingTech(tech);
    setFormData({ name: tech.name, phone: tech.phone, password: '' });
    setShowAddForm(true);
  };

  const handleAddClick = () => {
    setEditingTech(null);
    setFormData({ name: '', phone: '', password: '' });
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingTech) {
        const updates: any = { name: formData.name, phone: formData.phone };
        if (formData.password) updates.password = formData.password;
        
        const updatedTech = await updateTechnician(editingTech.id, updates);
        setTechnicians(technicians.map(t => t.id === editingTech.id ? updatedTech : t));
        alert('Technician updated successfully');
      } else {
        const tech = await createTechnician(formData);
        setTechnicians([...technicians, tech]);
        alert('Technician created successfully');
      }
      setShowAddForm(false);
      setFormData({ name: '', phone: '', password: '' });
      setEditingTech(null);
    } catch (error) {
      alert('Failed to save technician');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading technicians...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Technicians</h2>
        <button 
          onClick={handleAddClick}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors"
        >
          <Plus size={20} />
          Add Technician
        </button>
      </div>

      {showAddForm && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <h3 className="font-bold text-gray-900 mb-4">{editingTech ? 'Edit Technician' : 'New Technician'}</h3>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input 
                type="tel" 
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password {editingTech && '(Leave blank to keep)'}</label>
              <input 
                type="password" 
                required={!editingTech}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 mt-2">
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="animate-spin w-4 h-4" />}
                {editingTech ? 'Update' : 'Create'} Technician
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {technicians.map(tech => (
          <div key={tech.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                <User size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{tech.name}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Phone size={14} />
                  {tech.phone}
                </div>
              </div>
            </div>
            <button 
              onClick={() => handleEditClick(tech)}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <Edit2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

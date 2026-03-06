import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, Users, Settings, LogOut, 
  TrendingUp, DollarSign, Clock, CheckCircle, XCircle, 
  Map as MapIcon, FileText, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

import BookingsView from '../components/admin/BookingsView';
import TechniciansView from '../components/admin/TechniciansView';
import SettingsView from '../components/admin/SettingsView';
import ExpensesView from '../components/admin/ExpensesView';
import GalleryView from '../components/admin/GalleryView';
import RemindersView from '../components/admin/RemindersView';
import CalendarView from '../components/admin/CalendarView';
import MapView from '../components/admin/MapView';
import { getBookings } from '../lib/api';
import { Booking } from '../lib/types';

// Placeholder components for other tabs
// const CalendarView = () => <div className="p-4">Calendar View (Coming Soon)</div>;

import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    pendingBookings: 0,
    completedBookings: 0,
    recentBookings: []
  });
  const [revenueData, setRevenueData] = useState<{name: string, revenue: number}[]>([]);
  const [mapDate, setMapDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const bookings = await getBookings();
      setAllBookings(bookings);
      
      const totalBookings = bookings.length;
      const pendingBookings = bookings.filter((b: Booking) => b.status === 'pending').length;
      const completedBookings = bookings.filter((b: Booking) => b.status === 'completed').length;
      
      // Calculate revenue (only confirmed and completed)
      const totalRevenue = bookings
        .filter((b: Booking) => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum: number, b: Booking) => sum + b.total_price_bhd, 0);

      setStats({
        totalBookings,
        totalRevenue,
        pendingBookings,
        completedBookings,
        recentBookings: bookings.slice(0, 5) as any
      });

      // Calculate weekly revenue
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyData = days.map(day => ({ name: day, revenue: 0 }));
      
      bookings.forEach((b: Booking) => {
        if (b.status === 'confirmed' || b.status === 'completed') {
          const date = new Date(b.service_date);
          const dayIndex = date.getDay(); // 0 is Sunday
          weeklyData[dayIndex].revenue += b.total_price_bhd;
        }
      });
      
      setRevenueData(weeklyData);

    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title={t('admin.revenue')} 
                value={`${stats.totalRevenue.toFixed(2)} BHD`} 
                icon={<DollarSign className="text-emerald-600" />} 
                trend="+12.5%" 
                color="bg-emerald-50"
              />
              <StatCard 
                title={t('admin.bookings')} 
                value={stats.totalBookings} 
                icon={<FileText className="text-blue-600" />} 
                trend="+5.2%" 
                color="bg-blue-50"
              />
              <StatCard 
                title={t('admin.pending')} 
                value={stats.pendingBookings} 
                icon={<Clock className="text-amber-600" />} 
                trend="-2.1%" 
                color="bg-amber-50"
              />
              <StatCard 
                title={t('admin.completed')} 
                value={stats.completedBookings} 
                icon={<CheckCircle className="text-purple-600" />} 
                trend="+8.4%" 
                color="bg-purple-50"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Revenue</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        cursor={{ fill: '#F3F4F6' }}
                      />
                      <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Trends</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        );
      case 'bookings':
        return <BookingsView />;
      case 'calendar':
        return <CalendarView />;
      case 'map':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold text-gray-900">Interactive Map View</h2>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <Calendar size={16} className="text-gray-400" />
                <input 
                  type="date" 
                  value={mapDate}
                  onChange={(e) => setMapDate(e.target.value)}
                  className="text-sm border-none focus:ring-0 p-0"
                />
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <MapView bookings={allBookings.filter(b => b.service_date === mapDate)} />
            </div>
          </div>
        );
      case 'technicians':
        return <TechniciansView />;
      case 'settings':
        return <SettingsView />;
      case 'expenses':
        return <ExpensesView />;
      case 'gallery':
        return <GalleryView />;
      case 'reminders':
        return <RemindersView />;
      default:
        return <div>Select a tab</div>;
    }
  };

  const NavContent = () => (
    <>
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Konoha</h1>
            <p className="text-xs text-gray-500">Admin Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavItem 
          icon={<LayoutDashboard size={20} />} 
          label={t('admin.overview')} 
          active={activeTab === 'overview'} 
          onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} 
        />
        <NavItem 
          icon={<FileText size={20} />} 
          label={t('admin.bookings')} 
          active={activeTab === 'bookings'} 
          onClick={() => { setActiveTab('bookings'); setIsMobileMenuOpen(false); }} 
        />
        <NavItem 
          icon={<Calendar size={20} />} 
          label={t('admin.calendar')} 
          active={activeTab === 'calendar'} 
          onClick={() => { setActiveTab('calendar'); setIsMobileMenuOpen(false); }} 
        />
        <NavItem 
          icon={<MapIcon size={20} />} 
          label={t('admin.map')} 
          active={activeTab === 'map'} 
          onClick={() => { setActiveTab('map'); setIsMobileMenuOpen(false); }} 
        />
        <NavItem 
          icon={<Users size={20} />} 
          label={t('admin.technicians')} 
          active={activeTab === 'technicians'} 
          onClick={() => { setActiveTab('technicians'); setIsMobileMenuOpen(false); }} 
        />
        <NavItem 
          icon={<DollarSign size={20} />} 
          label={t('admin.expenses')} 
          active={activeTab === 'expenses'} 
          onClick={() => { setActiveTab('expenses'); setIsMobileMenuOpen(false); }} 
        />
        <NavItem 
          icon={<CheckCircle size={20} />} 
          label={t('admin.gallery')} 
          active={activeTab === 'gallery'} 
          onClick={() => { setActiveTab('gallery'); setIsMobileMenuOpen(false); }} 
        />
        <NavItem 
          icon={<Clock size={20} />} 
          label={t('admin.reminders')} 
          active={activeTab === 'reminders'} 
          onClick={() => { setActiveTab('reminders'); setIsMobileMenuOpen(false); }} 
        />
        <NavItem 
          icon={<Settings size={20} />} 
          label={t('admin.settings')} 
          active={activeTab === 'settings'} 
          onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} 
        />
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-2">
        <button 
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <Globe size={20} />
          {language === 'en' ? 'العربية' : 'English'}
        </button>
        <button 
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          {t('admin.logout')}
        </button>
      </div>
    </>
  );

  return (
    <div className={`min-h-screen bg-gray-50 flex ${isRTL ? 'flex-row-reverse' : ''}`}>
      {/* Desktop Sidebar */}
      <aside className={`w-64 bg-white border-${isRTL ? 'l' : 'r'} border-gray-200 fixed h-full z-10 hidden md:flex flex-col`}>
        <NavContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.aside 
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-64 bg-white z-50 md:hidden flex flex-col shadow-xl`}
            >
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 ${isRTL ? 'md:mr-64' : 'md:ml-64'} p-4 md:p-8 overflow-y-auto h-screen`}>
        <header className="flex items-center justify-between mb-8 md:hidden">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className={`p-2 ${isRTL ? '-mr-2' : '-ml-2'} text-gray-600 hover:bg-gray-100 rounded-lg`}
            >
              <Menu size={24} />
            </button>
            <div className="font-bold text-xl">Konoha Admin</div>
          </div>
          <button onClick={logout} className="p-2 text-gray-500"><LogOut size={20} /></button>
        </header>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h2>
            <p className="text-gray-500 text-sm">Welcome back, {user?.name || 'Admin'}</p>
          </div>
          <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hidden sm:block">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </div>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-xl transition-all ${
        active 
          ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ title, value, icon, trend, color }: { title: string, value: string | number, icon: React.ReactNode, trend: string, color: string }) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend}
        </span>
      </div>
      <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

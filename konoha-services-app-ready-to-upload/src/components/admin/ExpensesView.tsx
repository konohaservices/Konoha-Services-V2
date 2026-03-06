import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getExpenses, getProfitabilityReport, createExpense } from '../../lib/api';
import { Expense, ProfitabilityReport } from '../../lib/types';
import { Plus, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ExpensesView() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [report, setReport] = useState<ProfitabilityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expensesData, reportData] = await Promise.all([
        getExpenses({ start_date: dateRange.start, end_date: dateRange.end }),
        getProfitabilityReport({ start_date: dateRange.start, end_date: dateRange.end })
      ]);
      setExpenses(expensesData);
      setReport(reportData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      await createExpense({
        category: formData.get('category'),
        amount: Number(formData.get('amount')),
        description: formData.get('description'),
        logged_by: user?.id
      });
      setShowAddModal(false);
      fetchData();
    } catch (error) {
      alert('Failed to add expense');
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading && !report) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Financial Overview</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700"
        >
          <Plus size={20} /> Log Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <TrendingUp size={24} />
            </div>
            <span className="text-sm text-gray-500">Revenue</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{report?.revenue.toFixed(3)} BHD</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-100 p-3 rounded-full text-red-600">
              <TrendingDown size={24} />
            </div>
            <span className="text-sm text-gray-500">Expenses</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{report?.expenses.toFixed(3)} BHD</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-full ${report && report.net_profit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
              <DollarSign size={24} />
            </div>
            <span className="text-sm text-gray-500">Net Profit</span>
          </div>
          <div className={`text-3xl font-bold ${report && report.net_profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {report?.net_profit.toFixed(3)} BHD
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Expense Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={report?.breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="total"
                  nameKey="category"
                >
                  {report?.breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(3)} BHD`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Recent Expenses</h3>
          <div className="overflow-y-auto max-h-64">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Desc</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">{format(new Date(expense.date), 'MMM d')}</td>
                    <td className="px-4 py-2 capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        expense.category === 'fuel' ? 'bg-yellow-100 text-yellow-700' :
                        expense.category === 'parts' ? 'bg-blue-100 text-blue-700' :
                        expense.category === 'labor' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 truncate max-w-[150px]">{expense.description}</td>
                    <td className="px-4 py-2 text-right font-medium">{expense.amount.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Log New Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
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
                <textarea name="description" className="w-full p-2 border rounded-lg" rows={3} required></textarea>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

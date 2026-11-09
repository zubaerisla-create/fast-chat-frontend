'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Briefcase,
  TrendingUp,
  DollarSign,
  PieChart,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Wallet,
  Receipt,
  X,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import {
  getFinanceBusinessById,
  deleteFinanceBusiness,
  createFinanceTransaction,
  deleteFinanceTransaction,
} from '@/lib/api';

const TX_TYPES = [
  { key: 'PROFIT', label: 'Sale / Profit (+)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { key: 'EXPENSE', label: 'Expense (-)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { key: 'INVESTMENT', label: 'Capital Invested (+)', color: 'text-[#635BFF] bg-[#635BFF]/10 border-[#635BFF]/30' },
  { key: 'WITHDRAWAL', label: 'Withdrawal (-)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
];

export default function VentureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { currency, currencySymbol, formatMoney, changeCurrency, currencies } = useCurrency();

  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Transaction Modal / Form state
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState('PROFIT');
  const [txName, setTxName] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txSubmitting, setTxSubmitting] = useState(false);

  const loadBusiness = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getFinanceBusinessById(id);
      if (res.data?.success) {
        setBusiness(res.data.business);
      } else {
        toast.error('Failed to load venture');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error fetching venture details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusiness();
  }, [id]);

  const handleDeleteBusiness = async () => {
    if (!window.confirm(`Are you sure you want to delete "${business?.name}"? All ledger transactions will be permanently deleted.`)) {
      return;
    }
    try {
      await deleteFinanceBusiness(id);
      toast.success('Venture removed');
      router.push('/finance?tab=portfolio');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete venture');
    }
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txName.trim()) {
      toast.error('Please enter a transaction title');
      return;
    }
    const val = Number(txAmount);
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setTxSubmitting(true);
      await createFinanceTransaction({
        businessId: id,
        type: txType,
        name: txName.trim(),
        amount: val,
        note: txNote.trim() || undefined,
        transactionDate: new Date().toISOString().slice(0, 10),
      });
      toast.success('Transaction logged!');
      setShowTxModal(false);
      setTxName('');
      setTxAmount('');
      setTxNote('');
      loadBusiness();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record transaction');
    } finally {
      setTxSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm('Delete this transaction from the venture ledger?')) return;
    try {
      await deleteFinanceTransaction(txId);
      toast.success('Transaction deleted');
      loadBusiness();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete transaction');
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!business?.recentTransactions) return [];
    return business.recentTransactions.filter((tx: any) => {
      const matchType = activeFilter === 'ALL' || tx.type === activeFilter;
      const matchQuery =
        !searchQuery.trim() ||
        tx.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.note?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchQuery;
    });
  }, [business, activeFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="animate-spin text-[#635BFF]" size={36} />
        <p className="text-sm font-semibold text-slate-400">Loading venture ledger & analytics...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl border border-white/10 bg-[#0F172A] text-center space-y-4">
        <AlertCircle className="mx-auto text-rose-400" size={48} />
        <h2 className="text-xl font-bold text-white">Venture Not Found</h2>
        <p className="text-sm text-slate-400">The requested business venture could not be loaded.</p>
        <Link
          href="/finance?tab=portfolio"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] text-white text-sm font-bold hover:opacity-90 transition-all"
        >
          <ArrowLeft size={16} /> Back to Finance Hub
        </Link>
      </div>
    );
  }

  const isProfitable = (business.netProfit || 0) >= 0;

  return (
    <div className="space-y-8 pb-16">
      {/* ── Top Navigation Bar ── */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div className="flex items-center gap-4">
          <Link
            href="/finance?tab=portfolio"
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
            title="Back to Ventures"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black tracking-widest uppercase text-[#00D4FF]">
                VENTURE LEDGER & ANALYTICS
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">
                Started {new Date(business.startDate || business.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-0.5">
              {business.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Currency Switcher */}
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => changeCurrency(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 rounded-2xl bg-[#0F172A] border border-[#00D4FF]/30 text-xs font-bold text-[#00D4FF] focus:outline-none cursor-pointer shadow-md"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code} className="bg-[#0F172A] text-white">
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#00D4FF] pointer-events-none" />
          </div>

          <button
            onClick={() => setShowTxModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#00D4FF] text-white text-sm font-bold shadow-lg hover:opacity-90 transition-all"
          >
            <Plus size={16} />
            <span>Record Entry</span>
          </button>
          <button
            onClick={handleDeleteBusiness}
            className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
            title="Delete Venture"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* ── Hero Balance Card (Mayramao Style) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0F172A] via-[#111C38] to-[#070B14] p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#00D4FF]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-[#635BFF]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              CURRENT RUNNING BALANCE
            </span>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                {formatMoney(business.currentBalance || 0)}
              </span>
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                  isProfitable
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                    : 'border-rose-500/30 bg-rose-500/15 text-rose-400'
                }`}
              >
                <TrendingUp size={14} />
                <span>
                  {formatMoney(business.netProfit || 0, true)} Net Profit
                </span>
              </div>
            </div>
            {business.description && (
              <p className="text-sm text-slate-300 max-w-2xl pt-1">{business.description}</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Transactions</span>
              <span className="font-bold text-white">
                {business.transactionCount || business.recentTransactions?.length || 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Initial Capital</span>
              <span className="font-bold text-white">
                {formatMoney(business.initial_investment || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Opening Balance</span>
              <span className="font-bold text-white">
                {formatMoney(business.opening_balance || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Key Performance Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Capital Invested</span>
            <div className="p-2 rounded-xl bg-[#635BFF]/10 text-[#635BFF]">
              <Wallet size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            {formatMoney(business.totalInvestment || 0)}
          </p>
          <p className="text-[11px] text-slate-500">Total injected equity</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Gross Sales / Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            {formatMoney(business.totalSales || 0)}
          </p>
          <p className="text-[11px] text-slate-500">Cumulative sales & revenue</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Operating Expenses</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Receipt size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400">
            {formatMoney(business.totalExpenses || 0)}
          </p>
          <p className="text-[11px] text-slate-500">Operational costs & bills</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Net Profit</span>
            <div
              className={`p-2 rounded-xl ${
                isProfitable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              <PieChart size={16} />
            </div>
          </div>
          <p className={`text-2xl font-black ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatMoney(business.netProfit || 0)}
          </p>
          <p className="text-[11px] text-slate-500">Total Sales minus Expenses</p>
        </div>
      </div>

      {/* ── Venture Ledger Section ── */}
      <div className="rounded-3xl border border-white/10 bg-[#0F172A] p-6 lg:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white">Venture Transaction Ledger</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Detailed chronological record of every investment, sale, and expense for {business.name}.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
              <input
                type="text"
                placeholder="Search ledger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-white/10 bg-[#070B14] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D4FF]"
              />
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'PROFIT', 'EXPENSE', 'INVESTMENT', 'WITHDRAWAL'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveFilter(t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === t
                  ? 'bg-[#00D4FF] text-[#0B132B] shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {t === 'PROFIT' ? 'Sales / Profit' : t}
            </button>
          ))}
        </div>

        {/* Ledger Table */}
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <Receipt className="mx-auto text-slate-600" size={36} />
            <p className="text-sm font-bold text-white">No ledger entries found</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Record sales, expenses or capital additions using the "Record Entry" button above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">Description</th>
                  <th className="pb-3 px-3">Type</th>
                  <th className="pb-3 px-3 text-right">Amount</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map((tx: any) => {
                  const isPositive = tx.type === 'PROFIT' || tx.type === 'SELL';
                  const isInvest = tx.type === 'INVESTMENT';
                  const amountColor = isPositive
                    ? 'text-emerald-400'
                    : isInvest
                    ? 'text-[#635BFF]'
                    : 'text-rose-400';

                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(tx.transaction_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        <div>{tx.name}</div>
                        {tx.note && <div className="text-xs text-slate-500">{tx.note}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isPositive
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : isInvest
                              ? 'border-[#635BFF]/30 bg-[#635BFF]/10 text-[#635BFF]'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className={`py-3 px-3 text-right font-black ${amountColor} whitespace-nowrap`}>
                        {isPositive ? '+' : '-'}{currencySymbol}{Number(tx.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Delete entry"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Record Transaction Modal ── */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0F172A] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Record Venture Entry</h3>
              <button
                onClick={() => setShowTxModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Entry Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TX_TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTxType(t.key)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        txType === t.key
                          ? `${t.color} border-current shadow-sm`
                          : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Title / Description *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client Milestone Payment, Supplies"
                  value={txName}
                  onChange={(e) => setTxName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#070B14] text-sm text-white focus:outline-none focus:border-[#635BFF]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#070B14] text-sm text-white focus:outline-none focus:border-[#635BFF]"
                  min="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  placeholder="Additional context..."
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#070B14] text-sm text-white focus:outline-none focus:border-[#635BFF]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={txSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#635BFF]/90 text-white text-xs font-black shadow-lg transition-all"
                >
                  {txSubmitting ? 'Saving...' : 'Record Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

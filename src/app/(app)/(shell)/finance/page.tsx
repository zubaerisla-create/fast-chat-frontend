'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Target,
  Sliders,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  X,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowRight,
  Building,
  Crown,
  Zap,
  Lock,
  Check,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import {
  getFinanceDashboard,
  getFinanceProfile,
  updateFinanceProfile,
  runFinanceSimulation,
  getFinanceSimulations,
  getFinanceBusinesses,
  getFinanceBusinessById,
  createFinanceBusiness,
  deleteFinanceBusiness,
  getFinanceTransactions,
  createFinanceTransaction,
  deleteFinanceTransaction,
  getFinanceGoals,
  createFinanceGoal,
  deleteFinanceGoal,
  getFinanceSubscription,
  syncFinanceSubscription,
} from '@/lib/api';

type Tab = 'overview' | 'simulator' | 'portfolio' | 'transactions' | 'goals';

export default function FinancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currency, currencySymbol, formatMoney, changeCurrency, currencies } = useCurrency();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'simulator', 'portfolio', 'transactions', 'goals'].includes(tabParam)) {
      setTab(tabParam as Tab);
    }
  }, [searchParams]);

  // Transactions list & filter state
  const [txList, setTxList] = useState<any[]>([]);
  const [txFilterType, setTxFilterType] = useState<string>('ALL');
  const [txSearch, setTxSearch] = useState<string>('');
  const [txLoading, setTxLoading] = useState<boolean>(false);

  // Simulation state
  const [simForm, setSimForm] = useState({
    purchaseAmount: 3500,
    paymentType: 'full',
    loanDuration: 12,
    interestRate: 6.5,
    planName: 'Equipment / Tech Setup',
  });
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [simHistory, setSimHistory] = useState<any[]>([]);

  // Profile Form state
  const [profileForm, setProfileForm] = useState<any>({
    monthly_income: 0,
    rent: 0,
    utilities: 0,
    subscriptions_insurance: 0,
    existing_loans: 0,
    variable_expenses: 0,
    current_savings: 0,
    risk_tolerance: 'balanced',
    income_stability: 'mostly_stable',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Modals
  const [showBizModal, setShowBizModal] = useState(false);
  const [newBiz, setNewBiz] = useState({ name: '', description: '', initialInvestment: 0, openingBalance: 0 });

  const [showTxModal, setShowTxModal] = useState(false);
  const [newTx, setNewTx] = useState({
    businessId: '',
    type: 'PROFIT',
    name: '',
    amount: 0,
    note: '',
    transactionDate: new Date().toISOString().slice(0, 10),
  });

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    category: 'general',
    targetAmount: 5000,
    currentAmount: 1000,
    targetDate: '',
  });

  // Subscription state (RevenueCat / 7-Day Trial)
  const [subStatus, setSubStatus] = useState<any>(null);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);

  const loadSubscription = async () => {
    try {
      const res = await getFinanceSubscription();
      if (res.data?.success) {
        setSubStatus(res.data.subscription);
      }
    } catch (err: any) {
      console.warn('Failed to load subscription:', err);
    }
  };

  const handleSubscribe = async (planKey: 'monthly' | 'yearly' | 'lifetime') => {
    try {
      setPurchasingPlan(planKey);
      let periodEnd: string | null = null;
      if (planKey === 'monthly') {
        periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (planKey === 'yearly') {
        periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      }

      const res = await syncFinanceSubscription({
        plan: planKey,
        status: planKey === 'lifetime' ? 'lifetime' : 'active',
        currentPeriodEnd: periodEnd,
        originalTransactionId: `web_rc_${Date.now()}`,
      });

      if (res.data?.success) {
        setSubStatus(res.data.subscription);
        toast.success(
          planKey === 'lifetime'
            ? 'Lifetime access activated!'
            : 'Subscription successfully activated!'
        );
        setShowPaywallModal(false);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete subscription');
    } finally {
      setPurchasingPlan(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getFinanceDashboard();
      if (res.data?.success) {
        setDashboard(res.data.data);
        if (res.data.data?.profile) {
          setProfileForm({
            monthly_income: res.data.data.profile.monthlyIncome || 0,
            rent: res.data.data.profile.rent || 0,
            utilities: res.data.data.profile.utilities || 0,
            subscriptions_insurance: res.data.data.profile.subscriptionsInsurance || 0,
            existing_loans: res.data.data.profile.existingLoans || 0,
            variable_expenses: res.data.data.profile.variableExpenses || 0,
            current_savings: res.data.data.profile.currentSavings || 0,
            risk_tolerance: res.data.data.profile.riskTolerance || 'balanced',
            income_stability: res.data.data.profile.incomeStability || 'mostly_stable',
          });
        }
        if (res.data.data?.recentSimulations) {
          setSimHistory(res.data.data.recentSimulations);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredTransactions = async (type = txFilterType, search = txSearch) => {
    try {
      setTxLoading(true);
      const params: any = {};
      if (type && type !== 'ALL') params.type = type;
      if (search && search.trim()) params.search = search.trim();
      const res = await getFinanceTransactions(params);
      if (res.data?.success) {
        setTxList(res.data.transactions || []);
      }
    } catch (err: any) {
      console.warn('Error fetching transactions:', err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchFilteredTransactions('ALL', '');
    loadSubscription();
  }, []);

  const openBusinessDetail = (id: string) => {
    router.push(`/finance/ventures/${id}`);
  };

  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (subStatus && !subStatus.hasAccess) {
      setShowPaywallModal(true);
      toast.error('Free trial expired. Please select a subscription to run simulations.');
      return;
    }
    try {
      setSimLoading(true);
      const res = await runFinanceSimulation(simForm);
      if (res.data?.success) {
        const full = res.data.simulation?.simulation_result;
        setSimResult(full);
        toast.success('Simulation computed successfully!');
        loadData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Simulation failed');
    } finally {
      setSimLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await updateFinanceProfile(profileForm);
      toast.success('Financial profile updated!');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subStatus && !subStatus.hasAccess) {
      setShowPaywallModal(true);
      toast.error('Free trial expired. Please select a subscription to create ventures.');
      return;
    }
    try {
      await createFinanceBusiness(newBiz);
      toast.success('Business venture created!');
      setShowBizModal(false);
      setNewBiz({ name: '', description: '', initialInvestment: 0, openingBalance: 0 });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create business');
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business? All associated transactions will be removed.')) return;
    try {
      await deleteFinanceBusiness(id);
      toast.success('Business deleted');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete business');
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subStatus && !subStatus.hasAccess) {
      setShowPaywallModal(true);
      toast.error('Free trial expired. Please select a subscription to log transactions.');
      return;
    }
    try {
      await createFinanceTransaction(newTx);
      toast.success('Transaction logged!');
      setShowTxModal(false);
      setNewTx({ businessId: '', type: 'PROFIT', name: '', amount: 0, note: '', transactionDate: new Date().toISOString().slice(0, 10) });
      loadData();
      fetchFilteredTransactions(txFilterType, txSearch);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record transaction');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteFinanceTransaction(id);
      toast.success('Transaction removed');
      loadData();
      fetchFilteredTransactions(txFilterType, txSearch);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subStatus && !subStatus.hasAccess) {
      setShowPaywallModal(true);
      toast.error('Free trial expired. Please select a subscription to create goals.');
      return;
    }
    try {
      await createFinanceGoal(newGoal);
      toast.success('Financial goal created!');
      setShowGoalModal(false);
      setNewGoal({ title: '', category: 'general', targetAmount: 5000, currentAmount: 1000, targetDate: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create goal');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteFinanceGoal(id);
      toast.success('Goal deleted');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 bg-[#120912] min-h-screen">
        <RefreshCw className="animate-spin text-rose-400" size={36} />
      </div>
    );
  }

  const profile = dashboard?.profile || {};
  const portfolio = dashboard?.portfolio || {};
  const decisionStats = dashboard?.decisionStats || { safePercentage: 100, riskyPercentage: 0 };
  const monthlyTrends = dashboard?.monthlyTrends || [];
  const goals = dashboard?.goals?.items || [];
  const businesses = portfolio?.businesses || [];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-[#120912] min-h-screen text-slate-100">
      {/* ── TOP HEADER (Two-tier, fully responsive across all screen sizes) ── */}
      <div className="space-y-4 border-b border-pink-500/15 pb-5">
        {/* Tier 1: Brand & Top Actions */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/25 to-pink-500/30 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)]">
              <Wallet size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white truncate">
                  Mayramao Financial Hub
                </h1>
                <span className="hidden xs:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Integrated
                </span>
              </div>
              <p className="text-xs text-rose-200/60 truncate mt-0.5">
                AI Purchase Simulations • Venture Capital • Portfolio Ledger
              </p>
            </div>
          </div>

          {/* Top Actions: Lifetime Button & Currency Switcher (Responsive, never breaks) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Subscription / Plan Badge Button */}
            {subStatus?.status === 'lifetime' ? (
              <button
                onClick={() => setShowPaywallModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold hover:bg-rose-500/30 transition-all shadow-sm shrink-0 whitespace-nowrap"
                title="Lifetime Pro Active"
              >
                <Crown size={13} className="text-pink-400 shrink-0" />
                <span>Lifetime</span>
              </button>
            ) : subStatus?.status === 'active' ? (
              <button
                onClick={() => setShowPaywallModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition-all shrink-0 whitespace-nowrap"
              >
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <span>Pro</span>
              </button>
            ) : subStatus?.isTrial || subStatus?.status === 'trialing' ? (
              <button
                onClick={() => setShowPaywallModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-semibold hover:bg-rose-500/25 transition-all shrink-0 whitespace-nowrap"
              >
                <Zap size={13} className="text-rose-400 shrink-0" />
                <span>{subStatus?.daysLeft ?? 7}d Trial</span>
              </button>
            ) : (
              <button
                onClick={() => setShowPaywallModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold hover:opacity-95 transition-all shadow-sm shrink-0 whitespace-nowrap"
              >
                <Lock size={13} className="shrink-0" />
                <span>Upgrade</span>
              </button>
            )}

            {/* Currency Switcher */}
            <div className="relative shrink-0">
              <select
                value={currency}
                onChange={(e) => changeCurrency(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-xl bg-[#1C0E1B] border border-rose-500/30 text-xs font-bold text-rose-300 focus:outline-none cursor-pointer shadow-sm hover:border-rose-400 transition-all"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#1C0E1B] text-white">
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tier 2: Dedicated Responsive Sub-Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {(
            [
              { id: 'overview', label: 'Overview', icon: PieChart },
              { id: 'simulator', label: 'AI Simulator', icon: Sliders },
              { id: 'portfolio', label: 'Ventures & Business', icon: Briefcase },
              { id: 'transactions', label: 'Ledger', icon: DollarSign },
              { id: 'goals', label: 'Goals & Profile', icon: Target },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap ${
                  active
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-950/40'
                    : 'text-rose-200/70 hover:text-white bg-[#1C0E1B]/60 hover:bg-[#251324] border border-pink-500/10'
                }`}
              >
                <Icon size={15} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SUBSCRIPTION / TRIAL ALERT BANNER (Pink Theme) ── */}
      {(subStatus?.isTrial || subStatus?.status === 'trialing') && (
        <div
          onClick={() => setShowPaywallModal(true)}
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-rose-500/[0.08] border border-rose-500/20 text-rose-200 cursor-pointer hover:bg-rose-500/[0.12] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Zap size={15} className="text-rose-400 shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-slate-200">
              <span className="font-semibold text-rose-300">7-Day Free Trial:</span> {subStatus?.daysLeft ?? 7} days remaining on your trial. Click to view all plans.
            </p>
          </div>
          <ChevronRight size={14} className="text-rose-400 shrink-0" />
        </div>
      )}

      {subStatus && !subStatus.hasAccess && (
        <div
          onClick={() => setShowPaywallModal(true)}
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-rose-500/[0.14] border border-rose-500/30 text-rose-200 cursor-pointer hover:bg-rose-500/[0.18] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Lock size={15} className="text-rose-400 shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-slate-200">
              <span className="font-semibold text-white">Trial Expired:</span> Choose a plan ($10/mo, $50/yr, or $100 lifetime) to continue using all finance tools.
            </p>
          </div>
          <ChevronRight size={14} className="text-rose-400 shrink-0" />
        </div>
      )}

      {/* ── TAB 1: OVERVIEW (Pink Velvet Style Hero Card) ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Mayramao Signature Hero Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#261224] via-[#1D0E1C] to-[#120711] p-7 border border-pink-500/20 shadow-2xl">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-pink-500/15 blur-3xl" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-200/70">
                  Monthly Disposable Cushion
                </span>
                <p className="mt-1 text-4xl sm:text-5xl font-black tracking-tight text-white">
                  {formatMoney(profile.monthlyDisposable)}
                </p>
                <p className="mt-1 text-xs text-rose-300 font-medium flex items-center gap-1">
                  <ArrowUpRight size={14} /> Healthy cashflow surplus after {formatMoney(profile.totalMonthlyExpenses)} living costs
                </p>
              </div>

              {/* Stat Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-pink-500/15 bg-white/[0.03] p-4 backdrop-blur-md">
                  <span className="text-xs text-rose-200/70 font-medium">Liquid Savings</span>
                  <p className="mt-1 text-xl font-bold text-white">
                    {formatMoney(profile.currentSavings)}
                  </p>
                  <span className="text-[11px] text-rose-300 font-medium">Emergency reserve</span>
                </div>

                <div className="rounded-2xl border border-pink-500/15 bg-white/[0.03] p-4 backdrop-blur-md">
                  <span className="text-xs text-rose-200/70 font-medium">Ventures Net Profit</span>
                  <p
                    className={`mt-1 text-xl font-bold ${
                      (portfolio.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatMoney(portfolio.netProfit, true)}
                  </p>
                  <span className="text-[11px] text-rose-200/60">{portfolio.businessesCount || 0} active ventures</span>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-2xl border border-pink-500/15 bg-white/[0.03] p-4 backdrop-blur-md">
                  <span className="text-xs text-rose-200/70 font-medium">Total Wealth Est.</span>
                  <p className="mt-1 text-xl font-bold text-pink-300">
                    {formatMoney(portfolio.netWorthEstimate)}
                  </p>
                  <span className="text-[11px] text-pink-400 font-medium">Savings + Equity</span>
                </div>
              </div>
            </div>
          </div>

          {/* Decision Stats & Monthly Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Decision Stats (Mayramao DecisionStatsCard) */}
            <div className="space-y-4 lg:col-span-1">
              <div className="rounded-2xl border border-pink-500/15 bg-[#1C0E1B] p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-rose-200/70">Safe Purchase Decisions</span>
                  <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400">
                    <TrendingUp size={18} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-black text-emerald-400">{decisionStats.safePercentage}%</p>
                <p className="mt-1 text-xs text-rose-200/60">Safe financial decisions evaluated</p>
              </div>

              <div className="rounded-2xl border border-pink-500/15 bg-[#1C0E1B] p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-rose-200/70">Risky / Caution Decisions</span>
                  <div className="rounded-full bg-rose-500/20 p-2 text-rose-400">
                    <AlertTriangle size={18} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-black text-rose-400">{decisionStats.riskyPercentage}%</p>
                <p className="mt-1 text-xs text-rose-200/60">Purchases flagged as high impact</p>
              </div>

              <button
                onClick={() => setTab('simulator')}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-95 font-bold text-sm text-white shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles size={17} /> Test New Purchase / Investment
              </button>
            </div>

            {/* Monthly Financial Trend Chart / Ledger Overview */}
            <div className="rounded-2xl border border-pink-500/15 bg-[#1C0E1B] p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">6-Month Venture & Profit Trends</h3>
                  <p className="text-xs text-rose-200/60">Historical performance across all business ventures</p>
                </div>
                <button
                  onClick={() => setShowTxModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15 border border-white/10"
                >
                  <Plus size={14} /> Log Entry
                </button>
              </div>

              {monthlyTrends.length === 0 ? (
                <p className="text-xs text-rose-200/50 py-8 text-center">No monthly trend data recorded yet.</p>
              ) : (
                <div className="space-y-3 pt-2">
                  {monthlyTrends.map((m: any, idx: number) => {
                    const maxVal = Math.max(...monthlyTrends.map((t: any) => Math.max(t.sales || 0, t.investment || 0, Math.abs(t.profit || 0))), 1000);
                    const salesWidth = Math.min(((m.sales || 0) / maxVal) * 100, 100);
                    const profitWidth = Math.min((Math.max(m.profit || 0, 0) / maxVal) * 100, 100);
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-pink-500/10 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{m.label}</span>
                          <span className={`font-extrabold ${m.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            Net: ${Number(m.profit || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-rose-200/70">
                          <div>
                            <span>Sales: ${Number(m.sales || 0).toLocaleString()}</span>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${salesWidth}%` }} />
                            </div>
                          </div>
                          <div>
                            <span>Profit: ${Number(m.profit || 0).toLocaleString()}</span>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-rose-400 rounded-full" style={{ width: `${profitWidth}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active Goals & Recent Simulations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Financial Goals */}
            <div className="rounded-2xl border border-pink-500/15 bg-[#1C0E1B] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">Savings & Milestone Goals</h3>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="text-xs text-rose-400 font-semibold hover:underline"
                >
                  + Add Goal
                </button>
              </div>

              {goals.length === 0 ? (
                <p className="text-xs text-rose-200/50 py-6 text-center">No goals set yet.</p>
              ) : (
                <div className="space-y-3">
                  {goals.map((g: any) => {
                    const pct = Math.min(Math.round(((g.current_amount || 0) / (g.target_amount || 1)) * 100), 100);
                    return (
                      <div key={g.id} className="p-3.5 rounded-xl border border-pink-500/10 bg-white/[0.02] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{g.title}</span>
                          <span className="text-xs font-bold text-rose-300">{pct}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-rose-200/60">
                          <span>${Number(g.current_amount || 0).toLocaleString()} saved</span>
                          <span>Target: ${Number(g.target_amount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Simulations (Mayramao SimulationItemCard) */}
            <div className="rounded-2xl border border-pink-500/15 bg-[#1C0E1B] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">Recent Simulations</h3>
                <button
                  onClick={() => setTab('simulator')}
                  className="text-xs text-rose-400 font-semibold hover:underline"
                >
                  Open Simulator
                </button>
              </div>

              {simHistory.length === 0 ? (
                <p className="text-xs text-rose-200/50 py-6 text-center">No simulations run yet.</p>
              ) : (
                <div className="space-y-3">
                  {simHistory.map((s: any) => {
                    const isSafe = s.risk_level === 'SAFE';
                    const isTight = s.risk_level === 'TIGHT';
                    return (
                      <div
                        key={s.id}
                        onClick={() => router.push(`/finance/simulations/${s.id}`)}
                        className="p-3.5 rounded-xl border border-pink-500/10 bg-white/[0.02] flex items-center justify-between hover:bg-white/[0.05] cursor-pointer transition-all"
                      >
                        <div>
                          <p className="text-sm font-bold text-white">{s.plan_name || 'Purchase Simulation'}</p>
                          <p className="text-xs text-rose-200/60 mt-0.5">
                            {new Date(s.created_at).toLocaleDateString()} • {s.payment_type === 'loan' ? 'Financed' : 'Paid in Full'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-white">
                            {formatMoney(s.purchase_amount)}
                          </p>
                          <span
                            className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase mt-1 ${
                              isSafe
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isTight
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {s.risk_level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: AI SIMULATOR (Mayramao Simulation Studio) ── */}
      {tab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Form */}
          <div className="lg:col-span-5 rounded-3xl border border-pink-500/15 bg-[#1C0E1B] p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-3 text-rose-400">
              <Sparkles size={22} />
              <div>
                <h3 className="text-lg font-bold text-white">AI Purchase & Investment Simulator</h3>
                <p className="text-xs text-rose-200/60">Instant risk scoring, debt-to-income analysis & recovery calculations.</p>
              </div>
            </div>

            <form onSubmit={handleRunSimulation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-rose-200/70 mb-1">Plan / Item Name</label>
                <input
                  type="text"
                  value={simForm.planName}
                  onChange={(e) => setSimForm({ ...simForm, planName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  placeholder="e.g. MacBook Pro, Car Down Payment, Server Farm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/70 mb-1">Purchase / Capital Amount ({currencySymbol})</label>
                <input
                  type="number"
                  value={simForm.purchaseAmount}
                  onChange={(e) => setSimForm({ ...simForm, purchaseAmount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-pink-500/20 bg-[#120711] text-sm font-bold text-white focus:outline-none focus:border-rose-400"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/70 mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimForm({ ...simForm, paymentType: 'full' })}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      simForm.paymentType === 'full'
                        ? 'border-rose-400 bg-rose-500/20 text-rose-300'
                        : 'border-pink-500/20 bg-[#120711] text-rose-200/60'
                    }`}
                  >
                    Pay in Full (Upfront)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimForm({ ...simForm, paymentType: 'loan' })}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      simForm.paymentType === 'loan'
                        ? 'border-pink-500 bg-pink-500/20 text-pink-300'
                        : 'border-pink-500/20 bg-[#120711] text-rose-200/60'
                    }`}
                  >
                    Financing / Loan
                  </button>
                </div>
              </div>

              {simForm.paymentType === 'loan' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-rose-200/70 mb-1">Tenure (Months)</label>
                    <input
                      type="number"
                      value={simForm.loanDuration}
                      onChange={(e) => setSimForm({ ...simForm, loanDuration: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                      min="1"
                      max="120"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-rose-200/70 mb-1">Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={simForm.interestRate}
                      onChange={(e) => setSimForm({ ...simForm, interestRate: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                      min="0"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={simLoading}
                className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-95 text-white font-bold text-sm transition-all shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2"
              >
                {simLoading ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                Run Smart Simulation
              </button>
            </form>
          </div>

          {/* Results Display */}
          <div className="lg:col-span-7 space-y-5">
            {simResult ? (
              <div className="space-y-5">
                {/* Risk Banner */}
                <div
                  className={`p-6 rounded-3xl border ${
                    simResult.ai_guidance?.risk_level === 'SAFE'
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : simResult.ai_guidance?.risk_level === 'TIGHT'
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-rose-500/40 bg-rose-500/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-2xl border ${
                        simResult.ai_guidance?.risk_level === 'SAFE'
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-500/20'
                          : simResult.ai_guidance?.risk_level === 'TIGHT'
                          ? 'border-amber-500 text-amber-400 bg-amber-500/20'
                          : 'border-rose-500 text-rose-400 bg-rose-500/20'
                      }`}
                    >
                      {simResult.ai_guidance?.risk_level === 'SAFE' ? '✓' : '!'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                            simResult.ai_guidance?.risk_level === 'SAFE'
                              ? 'bg-emerald-500 text-white'
                              : simResult.ai_guidance?.risk_level === 'TIGHT'
                              ? 'bg-amber-500 text-white'
                              : 'bg-rose-500 text-white'
                          }`}
                        >
                          {simResult.ai_guidance?.risk_level}
                        </span>
                        <h4 className="text-base font-extrabold text-white">
                          {simResult.ai_guidance?.assessment_title}
                        </h4>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {simResult.ai_guidance?.guidance}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comparison Matrix */}
                <div className="rounded-3xl border border-pink-500/15 bg-[#1C0E1B] p-6 shadow-xl">
                  <h4 className="text-sm font-bold text-white mb-4">Payment Options Comparison</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Pay in full */}
                    <div className="p-4 rounded-2xl border border-pink-500/10 bg-white/[0.03] space-y-2">
                      <span className="text-xs font-semibold uppercase text-rose-200/70">Pay in Full</span>
                      <p className="text-2xl font-black text-white">
                        {formatMoney(simResult.scenario_summary?.comparisons?.pay_in_full?.total_cost)}
                      </p>
                      <p className="text-xs text-rose-200/60">
                        Recovery Time: {simResult.scenario_summary?.comparisons?.pay_in_full?.recovery_months || 0} months
                      </p>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-xs font-extrabold ${
                          simResult.scenario_summary?.comparisons?.pay_in_full?.risk_level === 'SAFE'
                            ? 'text-emerald-400 bg-emerald-500/20'
                            : 'text-amber-400 bg-amber-500/20'
                        }`}
                      >
                        {simResult.scenario_summary?.comparisons?.pay_in_full?.risk_level}
                      </span>
                    </div>

                    {/* Financing */}
                    <div className="p-4 rounded-2xl border border-pink-500/10 bg-white/[0.03] space-y-2">
                      <span className="text-xs font-semibold uppercase text-rose-200/70">Financing / Loan</span>
                      <p className="text-2xl font-black text-white">
                        {formatMoney(simResult.scenario_summary?.comparisons?.financing?.monthly_payment)}{' '}
                        <span className="text-xs font-normal text-rose-200/60">/ mo</span>
                      </p>
                      <p className="text-xs text-rose-200/60">
                        Total Cost: {formatMoney(simResult.scenario_summary?.comparisons?.financing?.total_cost)}
                      </p>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-xs font-extrabold ${
                          simResult.scenario_summary?.comparisons?.financing?.risk_level === 'SAFE'
                            ? 'text-emerald-400 bg-emerald-500/20'
                            : 'text-rose-400 bg-rose-500/20'
                        }`}
                      >
                        {simResult.scenario_summary?.comparisons?.financing?.risk_level}
                      </span>
                    </div>
                  </div>

                  {/* AI Guidance Insights */}
                  {simResult.ai_guidance?.key_insights && (
                    <div className="mt-5 pt-4 border-t border-pink-500/10 space-y-2">
                      <h5 className="text-xs font-bold text-rose-200/70 uppercase tracking-wider">Key Metrics & Guidance</h5>
                      <ul className="space-y-1.5">
                        {simResult.ai_guidance.key_insights.map((ins: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>{ins}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {simResult.ai_guidance?.safer_alternatives?.length > 0 && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-xs font-bold text-amber-400">Safer Recommendations:</span>
                      <ul className="mt-1 space-y-1">
                        {simResult.ai_guidance.safer_alternatives.map((alt: string, i: number) => (
                          <li key={i} className="text-xs text-amber-200">
                            💡 {alt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-14 text-center rounded-3xl border border-dashed border-pink-500/20 bg-[#1C0E1B]">
                <Sliders size={44} className="text-rose-300/40 mb-3" />
                <h4 className="text-base font-bold text-white">No simulation calculated</h4>
                <p className="text-xs text-rose-200/60 max-w-sm mt-1">
                  Adjust the purchase parameters on the left and click "Run Smart Simulation" to evaluate the purchase safety and loan options.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: BUSINESS & INVESTMENT VENTURES ── */}
      {tab === 'portfolio' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Business Investment Ventures</h3>
              <p className="text-xs text-rose-200/60">
                Manage businesses, initial investment capital, sales revenue, operational expenses, and profit ROI
              </p>
            </div>
            <button
              onClick={() => setShowBizModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs sm:text-sm font-bold hover:opacity-95 transition-all shadow-md shadow-rose-950/40"
            >
              <Plus size={16} /> New Venture
            </button>
          </div>

          {businesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-14 text-center rounded-3xl border border-dashed border-pink-500/20 bg-[#1C0E1B]">
              <Briefcase size={40} className="text-rose-300/40 mb-2" />
              <p className="text-base font-bold text-white">No ventures registered yet</p>
              <p className="text-xs text-rose-200/60 mt-1">Add your business or startup to track capital and returns.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.map((b: any) => (
                <div
                  key={b.id}
                  className="rounded-3xl border border-pink-500/15 bg-[#1C0E1B] p-5 space-y-4 shadow-xl hover:border-rose-400/50 transition-all cursor-pointer"
                  onClick={() => openBusinessDetail(b.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">{b.name}</h4>
                      <p className="text-xs text-rose-200/60 mt-0.5 line-clamp-1">{b.description || 'Active venture'}</p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteBusiness(b.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 transition-colors"
                        title="Delete business"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-pink-500/10 text-xs">
                    <div>
                      <span className="text-rose-200/70">Capital Invested:</span>
                      <p className="font-bold text-white">{formatMoney(b.totalInvestment)}</p>
                    </div>
                    <div>
                      <span className="text-rose-200/70">Total Sales:</span>
                      <p className="font-bold text-emerald-400">{formatMoney(b.totalSales)}</p>
                    </div>
                    <div>
                      <span className="text-rose-200/70">Total Expenses:</span>
                      <p className="font-bold text-rose-400">{formatMoney(b.totalExpenses)}</p>
                    </div>
                    <div>
                      <span className="text-rose-200/70">Net Profit / Loss:</span>
                      <p
                        className={`font-black ${
                          (b.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatMoney(b.netProfit, true)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-pink-500/10">
                    <span className="text-xs text-rose-200/60">Current Balance:</span>
                    <span className="text-sm font-extrabold text-rose-300">
                      {formatMoney(b.currentBalance)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end text-xs text-pink-300 font-semibold gap-1">
                    View Ledger & Analytics <ArrowRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: TRANSACTION LEDGER ── */}
      {tab === 'transactions' && (
        <div className="rounded-3xl border border-pink-500/15 bg-[#1C0E1B] p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Financial Transaction Ledger</h3>
              <p className="text-xs text-rose-200/60">Track all investments, profits/sales, expenses, and withdrawals</p>
            </div>
            <button
              onClick={() => setShowTxModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs sm:text-sm font-bold hover:opacity-95 shadow-md shadow-rose-950/40"
            >
              <Plus size={16} /> Record Transaction
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-3 text-rose-200/50" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  fetchFilteredTransactions(txFilterType, e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-xs text-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'PROFIT', 'EXPENSE', 'INVESTMENT', 'WITHDRAWAL'].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTxFilterType(t);
                    fetchFilteredTransactions(t, txSearch);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    txFilterType === t
                      ? 'bg-rose-500/25 text-rose-200 border border-rose-500/40'
                      : 'bg-white/[0.04] text-rose-200/60 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {txLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="animate-spin text-rose-400 mx-auto" size={24} />
            </div>
          ) : txList.length === 0 ? (
            <p className="text-xs text-rose-200/50 py-8 text-center">No transactions match your filter.</p>
          ) : (
            <div className="divide-y divide-pink-500/10 overflow-x-auto">
              {txList.map((t: any) => {
                const isPositive = t.type === 'PROFIT' || t.type === 'SELL' || t.type === 'SALE';
                return (
                  <div key={t.id} className="flex items-center justify-between py-3.5 px-2 hover:bg-white/[0.03] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl text-xs font-bold ${
                          isPositive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {isPositive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{t.name}</p>
                        <p className="text-xs text-rose-200/60">
                          {t.business_name || 'General'} • {new Date(t.transaction_date).toLocaleDateString()} • <span className="uppercase text-[10px] font-bold text-rose-300">{t.type}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`text-sm font-black ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatMoney(t.amount, isPositive)}
                      </span>
                      <button
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: GOALS & FINANCIAL PROFILE ── */}
      {tab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Profile Form */}
          <div className="lg:col-span-7 rounded-3xl border border-pink-500/15 bg-[#1C0E1B] p-6 space-y-5 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-white">Financial Profile & Budget Allocation</h3>
              <p className="text-xs text-rose-200/60 mt-0.5">
                Maintain accurate baseline numbers for disposable cashflow calculations and simulations.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-rose-200/70 mb-1">Monthly Income ({currencySymbol})</label>
                  <input
                    type="number"
                    value={profileForm.monthly_income}
                    onChange={(e) => setProfileForm({ ...profileForm, monthly_income: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rose-200/70 mb-1">Current Liquid Savings ({currencySymbol})</label>
                  <input
                    type="number"
                    value={profileForm.current_savings}
                    onChange={(e) => setProfileForm({ ...profileForm, current_savings: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rose-200/70 mb-1">Rent / Housing ({currencySymbol})</label>
                  <input
                    type="number"
                    value={profileForm.rent}
                    onChange={(e) => setProfileForm({ ...profileForm, rent: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rose-200/70 mb-1">Utilities ({currencySymbol})</label>
                  <input
                    type="number"
                    value={profileForm.utilities}
                    onChange={(e) => setProfileForm({ ...profileForm, utilities: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rose-200/70 mb-1">Existing Debt / Loans ({currencySymbol})</label>
                  <input
                    type="number"
                    value={profileForm.existing_loans}
                    onChange={(e) => setProfileForm({ ...profileForm, existing_loans: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-rose-200/70 mb-1">Variable Living Expenses ({currencySymbol})</label>
                  <input
                    type="number"
                    value={profileForm.variable_expenses}
                    onChange={(e) => setProfileForm({ ...profileForm, variable_expenses: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rose-200/70 mb-1">Risk Appetite</label>
                  <select
                    value={profileForm.risk_tolerance}
                    onChange={(e) => setProfileForm({ ...profileForm, risk_tolerance: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  >
                    <option value="safe" className="bg-[#1C0E1B]">Conservative / Safe</option>
                    <option value="balanced" className="bg-[#1C0E1B]">Balanced / Moderate</option>
                    <option value="risk_ok" className="bg-[#1C0E1B]">Growth / Aggressive</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="py-2.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-xs sm:text-sm hover:opacity-95 shadow-md shadow-rose-950/40 flex items-center gap-2"
              >
                {savingProfile && <RefreshCw className="animate-spin" size={14} />}
                Save Financial Profile
              </button>
            </form>
          </div>

          {/* Goals management */}
          <div className="lg:col-span-5 rounded-3xl border border-pink-500/15 bg-[#1C0E1B] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Targets & Milestones</h3>
                <p className="text-xs text-rose-200/60">Goals for savings and big capital goals</p>
              </div>
              <button
                onClick={() => setShowGoalModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-bold hover:bg-rose-500/30 border border-rose-500/30"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="space-y-3">
              {goals.map((g: any) => (
                <div key={g.id} className="p-3.5 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-bold text-white">{g.title}</h5>
                    <p className="text-xs text-slate-400">
                      {formatMoney(g.current_amount)} of {formatMoney(g.target_amount)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(g.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE BUSINESS MODAL ── */}
      {showBizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-pink-500/20 bg-[#1A0C19] p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">New Business Venture</h3>
            <form onSubmit={handleCreateBusiness} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Business Name</label>
                <input
                  type="text"
                  value={newBiz.name}
                  onChange={(e) => setNewBiz({ ...newBiz, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  placeholder="e.g. Agency, Cafe, SaaS App"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Description</label>
                <input
                  type="text"
                  value={newBiz.description}
                  onChange={(e) => setNewBiz({ ...newBiz, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rose-200/80 mb-1">Initial Capital ({currencySymbol})</label>
                  <input
                    type="number"
                    value={newBiz.initialInvestment}
                    onChange={(e) => setNewBiz({ ...newBiz, initialInvestment: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rose-200/80 mb-1">Opening Balance ({currencySymbol})</label>
                  <input
                    type="number"
                    value={newBiz.openingBalance}
                    onChange={(e) => setNewBiz({ ...newBiz, openingBalance: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBizModal(false)}
                  className="px-4 py-2 rounded-xl border border-pink-500/20 text-xs font-bold text-rose-200/70 hover:text-white hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold shadow-md shadow-rose-950/40 hover:opacity-95"
                >
                  Create Venture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RECORD TRANSACTION MODAL ── */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-pink-500/20 bg-[#1A0C19] p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Record Transaction</h3>
            <form onSubmit={handleCreateTransaction} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Transaction Type</label>
                <select
                  value={newTx.type}
                  onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                >
                  <option value="PROFIT">Sale / Profit (+)</option>
                  <option value="EXPENSE">Expense (-)</option>
                  <option value="INVESTMENT">Investment Capital (+)</option>
                  <option value="WITHDRAWAL">Withdrawal (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Venture / Business</label>
                <select
                  value={newTx.businessId}
                  onChange={(e) => setNewTx({ ...newTx, businessId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                >
                  <option value="">General / Personal</option>
                  {businesses.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Title / Description</label>
                <input
                  type="text"
                  value={newTx.name}
                  onChange={(e) => setNewTx({ ...newTx, name: e.target.value })}
                  placeholder="e.g. Client Payment, Domain Purchase, Marketing"
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Amount ({currencySymbol})</label>
                <input
                  type="number"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white font-bold focus:outline-none focus:border-rose-400"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2 rounded-xl border border-pink-500/20 text-xs font-bold text-rose-200/70 hover:text-white hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold shadow-md shadow-rose-950/40 hover:opacity-95"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE GOAL MODAL ── */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-pink-500/20 bg-[#1A0C19] p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Financial Goal</h3>
            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Goal Title</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="e.g. Emergency Fund, New Car, House Down Payment"
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rose-200/80 mb-1">Target Amount ({currencySymbol})</label>
                  <input
                    type="number"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rose-200/80 mb-1">Current Saved ({currencySymbol})</label>
                  <input
                    type="number"
                    value={newGoal.currentAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-500/20 bg-[#120711] text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 rounded-xl border border-pink-500/20 text-xs font-bold text-rose-200/70 hover:text-white hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold shadow-md shadow-rose-950/40 hover:opacity-95"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── CLEAN & MINIMAL FINANCE PAYWALL MODAL ── */}
      {showPaywallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-pink-500/20 bg-[#180A17] p-6 sm:p-7 shadow-2xl space-y-6 my-8">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Choose your plan
                </h2>
                <p className="text-xs sm:text-sm text-rose-200/70 mt-1">
                  Unlock complete business ledgers, loan simulations, and multi-currency portfolio management.
                </p>
              </div>
              <button
                onClick={() => setShowPaywallModal(false)}
                className="p-1.5 rounded-lg text-rose-200/60 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Trial Status Note */}
            {(subStatus?.isTrial || subStatus?.status === 'trialing') ? (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-rose-500/[0.08] border border-rose-500/20 text-rose-200">
                <Zap size={15} className="text-rose-400 shrink-0" />
                <p className="text-xs">
                  Your <span className="font-semibold text-white">7-Day Free Trial</span> is active ({subStatus?.daysLeft ?? 7} days remaining). You can choose a plan now with zero interruption.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-pink-500/20 text-rose-200/80">
                <CheckCircle2 size={15} className="text-rose-400 shrink-0" />
                <p className="text-xs">
                  Includes 7 days free on the Monthly plan. Cancel anytime in account settings.
                </p>
              </div>
            )}

            {/* 3 Minimal Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Plan 1: Monthly */}
              <div className="rounded-xl border border-pink-500/15 bg-white/[0.02] p-4 flex flex-col justify-between hover:border-pink-500/30 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-rose-200/90">Monthly</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-200">
                      7d Free
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">$10<span className="text-xs font-normal text-rose-200/60">/mo</span></div>
                  <p className="text-xs text-rose-200/60 mt-2">
                    7 days free, then $10/month. Cancel anytime.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={purchasingPlan !== null}
                  onClick={() => handleSubscribe('monthly')}
                  className="mt-4 w-full py-2 rounded-lg bg-white/[0.08] hover:bg-rose-500/20 text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {purchasingPlan === 'monthly' ? 'Activating...' : 'Select Monthly'}
                </button>
              </div>

              {/* Plan 2: Annual (Featured) */}
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/[0.06] p-4 flex flex-col justify-between relative shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-white">Annual</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/25 text-rose-200 border border-rose-500/40">
                      Save 58%
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">$50<span className="text-xs font-normal text-rose-200/60">/yr</span></div>
                  <p className="text-xs text-rose-200/80 mt-2">
                    $4.17/month billed once annually. Best overall value.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={purchasingPlan !== null}
                  onClick={() => handleSubscribe('yearly')}
                  className="mt-4 w-full py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:opacity-95 text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-rose-950/40"
                >
                  {purchasingPlan === 'yearly' ? 'Activating...' : 'Select Annual'}
                </button>
              </div>

              {/* Plan 3: Lifetime */}
              <div className="rounded-xl border border-pink-500/15 bg-white/[0.02] p-4 flex flex-col justify-between hover:border-pink-500/30 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-rose-200/90">Lifetime</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-200">
                      One-time
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">$100<span className="text-xs font-normal text-rose-200/60"> once</span></div>
                  <p className="text-xs text-rose-200/60 mt-2">
                    Single payment, lifetime access to all tools.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={purchasingPlan !== null}
                  onClick={() => handleSubscribe('lifetime')}
                  className="mt-4 w-full py-2 rounded-lg bg-white/[0.08] hover:bg-rose-500/20 text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {purchasingPlan === 'lifetime' ? 'Activating...' : 'Select Lifetime'}
                </button>
              </div>
            </div>

            {/* Clean Feature Checklist */}
            <div className="border-t border-pink-500/15 pt-4 space-y-2 text-xs text-rose-200/80">
              <div className="text-[11px] font-semibold text-rose-300/70 uppercase tracking-wider mb-2">
                Included with all plans:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-rose-400 shrink-0" />
                  <span>Venture balance sheets & double-entry ledgers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-rose-400 shrink-0" />
                  <span>Purchase & loan cashflow simulations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-rose-400 shrink-0" />
                  <span>Real-time multi-currency support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-rose-400 shrink-0" />
                  <span>Interactive financial goals & forecasting</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] text-rose-200/50 pt-2 border-t border-pink-500/10">
              <span>Secure subscription processing</span>
              <span>Cancel anytime from settings</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

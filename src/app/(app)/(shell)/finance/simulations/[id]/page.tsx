'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  DollarSign,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import { getFinanceSimulationById } from '@/lib/api';
import { useCurrency } from '@/context/CurrencyContext';

export default function SimulationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { currency, currencySymbol, formatMoney, changeCurrency, currencies } = useCurrency();

  const [sim, setSim] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSimulation = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await getFinanceSimulationById(id);
        if (res.data?.success) {
          setSim(res.data.simulation);
        } else {
          toast.error('Simulation not found');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load simulation analysis');
      } finally {
        setLoading(false);
      }
    };

    loadSimulation();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="animate-spin text-rose-500" size={36} />
        <p className="text-sm font-semibold text-slate-400">Loading AI financial simulation evaluation...</p>
      </div>
    );
  }

  if (!sim) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl border border-white/10 bg-[#12141C] text-center space-y-4">
        <AlertCircle className="mx-auto text-rose-400" size={48} />
        <h2 className="text-xl font-bold text-white">Simulation Not Found</h2>
        <p className="text-sm text-slate-400">The simulation evaluation could not be located.</p>
        <Link
          href="/finance?tab=simulator"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-rose-950/40"
        >
          <ArrowLeft size={16} /> Back to AI Simulator
        </Link>
      </div>
    );
  }

  const riskLevel = sim.risk_level || 'SAFE';
  const isSafe = riskLevel === 'SAFE';
  const isTight = riskLevel === 'TIGHT';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-4">
          <Link
            href="/finance?tab=simulator"
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
            title="Back to Finance Hub"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black tracking-widest uppercase text-rose-400">
                AI DECISION EVALUATION
              </span>
              <span className="text-rose-200/40">•</span>
              <span className="text-xs text-slate-400">
                {new Date(sim.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-0.5">
              {sim.plan_name || 'Purchase Evaluation'}
            </h1>
          </div>
        </div>

        {/* Currency Switcher */}
        <div className="relative">
          <select
            value={currency}
            onChange={(e) => changeCurrency(e.target.value)}
            className="appearance-none pl-3.5 pr-8 py-2 rounded-2xl bg-[#12141C] border border-rose-500/30 text-xs font-bold text-rose-300 focus:outline-none cursor-pointer shadow-md"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code} className="bg-[#12141C] text-white">
                {c.symbol} {c.code}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-rose-300 pointer-events-none" />
        </div>
      </div>

      {/* ── Risk Banner (Mayramao AnimatedStatusCircle style) ── */}
      <div
        className={`p-6 lg:p-8 rounded-3xl border ${
          isSafe
            ? 'border-emerald-500/40 bg-emerald-500/10'
            : isTight
            ? 'border-amber-500/40 bg-amber-500/10'
            : 'border-rose-500/40 bg-rose-500/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div
            className={`h-16 w-16 rounded-2xl flex items-center justify-center font-black text-3xl border shrink-0 ${
              isSafe
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/20'
                : isTight
                ? 'border-amber-500 text-amber-400 bg-amber-500/20'
                : 'border-rose-500 text-rose-400 bg-rose-500/20'
            }`}
          >
            {isSafe ? '✓' : isTight ? '!' : '✕'}
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  isSafe ? 'bg-emerald-500 text-white' : isTight ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                }`}
              >
                {riskLevel} IMPACT
              </span>
              <span className="text-xs text-slate-400">
                Decision evaluated for {formatMoney(sim.purchase_amount)} commitment
              </span>
            </div>
            <h3 className="text-xl font-bold text-white">
              {isSafe
                ? 'Safe Financial Decision'
                : isTight
                ? 'Budget Strain Warning'
                : 'High Risk / Unadvisable'}
            </h3>
            <p className="text-sm text-slate-300">
              {sim.ai_guidance?.summary ||
                (isSafe
                  ? 'This purchase fits cleanly within your surplus and emergency reserves.'
                  : 'This expenditure significantly impacts liquidity or exceeds recommended debt-to-income limits.')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Parameters & Comparison Matrix ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-white/10 bg-[#12141C] p-6 space-y-4 shadow-xl">
          <h4 className="text-base font-bold text-white">Purchase Specifications</h4>
          <div className="space-y-3 text-sm divide-y divide-pink-500/10">
            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-400">Total Purchase / Capital</span>
              <span className="font-black text-white text-base">
                {formatMoney(sim.purchase_amount)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-slate-400">Payment Strategy</span>
              <span className="font-bold text-white">
                {sim.payment_type === 'loan' ? 'Financed / Loan' : 'Pay Upfront (Full)'}
              </span>
            </div>
            {sim.loan_duration ? (
              <div className="flex items-center justify-between pt-3">
                <span className="text-slate-400">Repayment Duration</span>
                <span className="font-bold text-white">{sim.loan_duration} Months</span>
              </div>
            ) : null}
            {sim.interest_rate ? (
              <div className="flex items-center justify-between pt-3">
                <span className="text-slate-400">Interest Rate</span>
                <span className="font-bold text-white">{sim.interest_rate}% APR</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#12141C] p-6 space-y-4 shadow-xl">
          <h4 className="text-base font-bold text-white">Strategic Impact Comparison</h4>
          <div className="space-y-3 text-sm divide-y divide-pink-500/10">
            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-400">Upfront Pay-in-full</span>
              <span className="font-black text-white">
                {formatMoney(sim.purchase_amount)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-slate-400">Monthly Financing Installment</span>
              <span className="font-black text-white">
                {formatMoney(sim.monthly_payment || 0)} / mo
              </span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-slate-400">Estimated Capital Recovery</span>
              <span className="font-bold text-rose-300">
                {sim.months_to_recover ? `${sim.months_to_recover} Months` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-slate-400">Post-Commitment Monthly Cushion</span>
              <span
                className={`font-black ${
                  (sim.remaining_cushion || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatMoney(sim.remaining_cushion || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Advisory Guidance ── */}
      <div className="rounded-3xl border border-white/10 bg-[#12141C] p-6 lg:p-8 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-950/40">
            <Sparkles size={18} />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">AI Financial Strategy Guidance</h4>
            <p className="text-xs text-slate-400">Personalized automated recommendations based on your cashflow.</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B0C11] border border-white/10 space-y-2 text-sm text-slate-300 leading-relaxed">
          <p>
            {sim.ai_guidance?.recommendation ||
              'Ensure you keep an active cash cushion in your liquid accounts. Delay non-essential capital investments if cash reserves dip below 3 months of living costs.'}
          </p>
        </div>
      </div>
    </div>
  );
}

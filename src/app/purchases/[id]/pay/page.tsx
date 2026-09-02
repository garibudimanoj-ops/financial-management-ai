import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordPurchasePaymentFormAction } from '@/actions/purchase';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface PurchaseBillPayPageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseBillPayPage({ params }: PurchaseBillPayPageProps) {
  const { id } = await params;
  const context = await requireBusinessContext();
  const canPay = hasPermission(context.role, 'PURCHASE_PAY');

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
    select: { baseCurrency: true },
  });

  const bill = await prisma.purchaseBill.findUnique({
    where: { id },
    include: {
      supplier: true,
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  });

  if (!bill || bill.businessId !== context.businessId) {
    notFound();
  }

  const currency = business?.baseCurrency || 'INR';
  const symbol = currency === 'INR' ? '₹' : '$';
  const fmt = (v: any) => v != null ? symbol + Number(v).toFixed(2) : symbol + '0.00';
  const totalPaid = bill.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balanceDue = Number(bill.totalAmount) - totalPaid;
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <h1 className="text-3xl font-bold text-white">Bill {bill.billNumber} Payment</h1>
        <Link href="/purchases" className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white">
          Back
        </Link>
      </div>

      <div className="glass-card p-6 space-y-4">
        <p className="text-gray-300">Supplier: {bill.supplier.name}</p>
        <p className="text-gray-300">Total: {fmt(bill.totalAmount)}</p>
        <p className="text-emerald-400">Paid: {fmt(totalPaid)}</p>
        <p className="text-white font-bold text-xl">Balance Due: {fmt(balanceDue)}</p>
      </div>

      {canPay && balanceDue > 0 && (
        <form action={recordPurchasePaymentFormAction.bind(null, context.businessId, bill.id, bill.supplierId)} className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Record Payment</h2>
          <input type="hidden" name="billId" value={bill.id} />
          <input type="hidden" name="supplierId" value={bill.supplierId} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input name="amount" type="number" step="0.01" min="0.01" max={balanceDue} required placeholder="Amount" className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl" />
            <select name="paymentMethod" className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
            <input name="paymentDate" type="date" defaultValue={today} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl" />
            <input name="reference" type="text" placeholder="Reference" className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl" />
          </div>
          <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-xl">Submit Payment</button>
        </form>
      )}
    </div>
  );
}

import { requireBusinessContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serializeInvoice, serializePayment } from '@/lib/serialize';
import InvoiceActions from '@/components/invoices/InvoiceActions';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const context = await requireBusinessContext();

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
    select: { baseCurrency: true },
  });

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: true,
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
      payments: {
        orderBy: { receivedAt: 'desc' },
      },
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  if (!invoice || invoice.businessId !== context.businessId) {
    notFound();
  }

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const serializedInvoice = serializeInvoice(invoice);

  const getStatusBadge = () => {
    switch (invoice.status) {
      case 'DRAFT':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      case 'ISSUED':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'PARTIALLY_PAID':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'PAID':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'REFUNDED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge()}`}>
              {invoice.status}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            {invoice.customer?.name || 'Walk-in Customer'} • {new Date(invoice.issueDate).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/invoices"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Invoices
          </Link>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <InvoiceActions
        businessId={context.businessId}
        invoice={serializedInvoice}
        currency={currency}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}

import Link from "next/link";
import {
  AlertTriangle,
  Package,
  ReceiptText,
  RotateCcw,
  TrendingUp,
} from "lucide-react";

import { requireOwnerPage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

const LOW_STOCK_LIMIT = 10;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);

  return date;
}

function rupiah(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="surface-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
          <h2 className="metric-value mt-2 text-2xl text-slate-900 dark:text-slate-100 sm:text-3xl">
            {value}
          </h2>
          {helper ? (
            <p className="mt-2 text-sm font-medium text-slate-500 opacity-80">
              {helper}
            </p>
          ) : null}
        </div>
        <Icon className="text-teal-500" size={28} />
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-5 text-sm text-slate-500 dark:text-slate-400">
      {label}
    </div>
  );
}

async function OwnerDashboard() {
  const todayStart = startOfToday();
  const monthStart = startOfMonth();

  const [
    salesToday,
    salesMonth,
    activeProductCount,
    lowStockProducts,
    recentSales,
    bestSellerGroups,
    recentPurchases,
    returnsToday,
    returnsMonth,
    recentReturns,
    paymentSummary,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: todayStart,
        },
      },
      _sum: {
        subtotal: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: monthStart,
        },
      },
      _sum: {
        subtotal: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.product.count({
      where: {
        isActive: true,
      },
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        stock: {
          lt: LOW_STOCK_LIMIT,
        },
      },
      orderBy: {
        stock: "asc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
      },
    }),
    prisma.sale.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        subtotal: true,
        paymentMethod: true,
        createdAt: true,
        cashier: {
          select: {
            name: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: {
          createdAt: {
            gte: todayStart,
          },
        },
      },
      _sum: {
        qty: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          qty: "desc",
        },
      },
      take: 5,
    }),
    prisma.purchase.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        purchaseNumber: true,
        total: true,
        createdAt: true,
        supplier: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    }),
    prisma.saleReturn.aggregate({
      where: {
        returnType: "CUSTOMER_RETURN",
        createdAt: {
          gte: todayStart,
        },
      },
      _sum: {
        totalRefund: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.saleReturn.aggregate({
      where: {
        returnType: "CUSTOMER_RETURN",
        createdAt: {
          gte: monthStart,
        },
      },
      _sum: {
        totalRefund: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.saleReturn.findMany({
      where: {
        returnType: "CUSTOMER_RETURN",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        reason: true,
        totalRefund: true,
        createdAt: true,
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            cashier: {
              select: {
                name: true,
              },
            },
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.sale.groupBy({
      by: ["paymentMethod"],
      where: {
        createdAt: {
          gte: todayStart,
        },
      },
      _sum: {
        subtotal: true,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _sum: {
          subtotal: "desc",
        },
      },
      take: 5,
    }),
  ]);

  const bestSellerProductIds = bestSellerGroups.map((item) => item.productId);
  const bestSellerProducts = bestSellerProductIds.length
    ? await prisma.product.findMany({
        where: {
          id: {
            in: bestSellerProductIds,
          },
        },
        select: {
          id: true,
          name: true,
          sku: true,
        },
      })
    : [];
  const productMap = new Map(
    bestSellerProducts.map((product) => [product.id, product]),
  );
  const grossOmzetToday = salesToday._sum.subtotal ?? 0;
  const returnValueToday = returnsToday._sum.totalRefund ?? 0;
  const netOmzetToday = Math.max(grossOmzetToday - returnValueToday, 0);
  const grossOmzetMonth = salesMonth._sum.subtotal ?? 0;
  const returnValueMonth = returnsMonth._sum.totalRefund ?? 0;
  const netOmzetMonth = Math.max(grossOmzetMonth - returnValueMonth, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Dashboard Owner</h1>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 opacity-80">
          Ringkasan operasional toko hari ini.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Omzet Hari Ini"
          value={rupiah(grossOmzetToday)}
          helper="Kotor sebelum retur"
          icon={TrendingUp}
        />
        <StatCard
          title="Omzet Bersih Hari Ini"
          value={rupiah(netOmzetToday)}
          helper="Omzet dikurangi retur"
          icon={TrendingUp}
        />
        <StatCard
          title="Retur Hari Ini"
          value={String(returnsToday._count._all)}
          helper={rupiah(returnValueToday)}
          icon={RotateCcw}
        />
        <StatCard
          title="Transaksi Hari Ini"
          value={String(salesToday._count._all)}
          helper="Semua transaksi"
          icon={ReceiptText}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Omzet Bulan Ini"
          value={rupiah(grossOmzetMonth)}
          helper={`${salesMonth._count._all} transaksi`}
          icon={TrendingUp}
        />
        <StatCard
          title="Omzet Bersih Bulan Ini"
          value={rupiah(netOmzetMonth)}
          helper={`${returnsMonth._count._all} retur`}
          icon={TrendingUp}
        />
        <StatCard
          title="Stok Rendah"
          value={String(lowStockProducts.length)}
          helper={`Stok < ${LOW_STOCK_LIMIT}`}
          icon={AlertTriangle}
        />
        <StatCard
          title="Produk Aktif"
          value={String(activeProductCount)}
          helper="Siap dijual"
          icon={Package}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Transaksi Terakhir</h2>
          <div className="mt-5 space-y-3">
            {recentSales.length === 0 ? <EmptyState label="Belum ada transaksi." /> : null}
            {recentSales.map((sale) => (
              <Link
                key={sale.id}
                href={`/invoices/${sale.id}`}
                className="surface-panel-soft block rounded-2xl p-4 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{sale.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {sale.cashier.name} - {sale.customer?.name ?? "Walk-in"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(sale.createdAt)} - {sale._count.items} item
                    </p>
                  </div>
                  <p className="metric-value">{rupiah(sale.subtotal)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Produk Terlaris Hari Ini</h2>
          <div className="mt-5 space-y-3">
            {bestSellerGroups.length === 0 ? (
              <EmptyState label="Belum ada produk terjual hari ini." />
            ) : null}
            {bestSellerGroups.map((item) => {
              const product = productMap.get(item.productId);

              return (
                <div
                  key={item.productId}
                  className="surface-panel-soft rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {product?.name ?? "Produk tidak ditemukan"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {product?.sku ?? "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="metric-value">{item._sum.qty ?? 0} pcs</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {rupiah(item._sum.subtotal ?? 0)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="surface-panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Retur Terbaru</h2>
          <div className="mt-5 space-y-3">
            {recentReturns.length === 0 ? <EmptyState label="Belum ada retur." /> : null}
            {recentReturns.map((saleReturn) => (
              <Link
                key={saleReturn.id}
                href={`/invoices/${saleReturn.sale.id}`}
                className="surface-panel-soft block rounded-2xl p-4 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {saleReturn.sale.invoiceNumber}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {saleReturn.sale.cashier.name} -{" "}
                      {saleReturn.sale.customer?.name ?? "Walk-in"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(saleReturn.createdAt)} - {saleReturn.reason}
                    </p>
                  </div>
                  <p className="metric-value text-rose-300">
                    {rupiah(saleReturn.totalRefund ?? 0)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payment Summary Hari Ini</h2>
          <div className="mt-5 space-y-3">
            {paymentSummary.length === 0 ? (
              <EmptyState label="Belum ada pembayaran hari ini." />
            ) : null}
            {paymentSummary.map((item) => (
              <div
                key={item.paymentMethod}
                className="surface-panel-soft flex items-center justify-between rounded-2xl p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                    {item.paymentMethod}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item._count._all} transaksi
                  </p>
                </div>
                <p className="metric-value">
                  {rupiah(item._sum.subtotal ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stok Rendah</h2>
          <div className="mt-5 space-y-3">
            {lowStockProducts.length === 0 ? (
              <EmptyState label="Tidak ada produk stok rendah." />
            ) : null}
            {lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="surface-panel-soft flex items-center justify-between rounded-2xl p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{product.name}</p>
                  <p className="text-sm text-slate-500">{product.sku ?? "-"}</p>
                </div>
                <span className="rounded-full bg-teal-500/10 px-3 py-1 text-sm font-semibold tabular-nums text-teal-400">
                  {product.stock}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pembelian Terakhir</h2>
          <div className="mt-5 space-y-3">
            {recentPurchases.length === 0 ? <EmptyState label="Belum ada pembelian." /> : null}
            {recentPurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="surface-panel-soft rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {purchase.purchaseNumber}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {purchase.supplier.name} - {purchase.user?.name ?? "User"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(purchase.createdAt)} - {purchase._count.items} item
                    </p>
                  </div>
                  <p className="metric-value">{rupiah(purchase.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  await requireOwnerPage();

  return <OwnerDashboard />;
}

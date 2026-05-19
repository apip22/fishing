import Link from "next/link";
import { Prisma } from "@prisma/client";

import { requireProtectedPage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

type SalesPageProps = {
  searchParams?: Promise<{
    from?: string;
    to?: string;
    cashier?: string;
    payment?: string;
    q?: string;
  }>;
};

function rupiah(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function dateRange(from?: string, to?: string) {
  const createdAt: Prisma.DateTimeFilter = {};

  if (from) {
    createdAt.gte = new Date(`${from}T00:00:00`);
  }

  if (to) {
    createdAt.lte = new Date(`${to}T23:59:59`);
  }

  return Object.keys(createdAt).length ? createdAt : undefined;
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const session = await requireProtectedPage();
  const params = (await searchParams) ?? {};
  const q = String(params.q ?? "").trim();
  const payment = String(params.payment ?? "").trim();
  const cashierId =
    session.role === "cashier"
      ? session.sub
      : params.cashier
        ? Number(params.cashier)
        : null;
  const where: Prisma.SaleWhereInput = {
    ...(cashierId ? { cashierId } : {}),
    ...(payment ? { paymentMethod: payment } : {}),
    ...(dateRange(params.from, params.to)
      ? { createdAt: dateRange(params.from, params.to) }
      : {}),
    ...(q
      ? {
          OR: [
            {
              invoiceNumber: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              customer: {
                name: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };
  const [sales, totals, cashiers, paymentMethods] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        subtotal: true,
        paymentMethod: true,
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
            returns: true,
          },
        },
      },
    }),
    prisma.sale.aggregate({
      where,
      _count: {
        _all: true,
      },
      _sum: {
        subtotal: true,
      },
    }),
    session.role === "cashier"
      ? Promise.resolve([])
      : prisma.user.findMany({
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
          },
        }),
    prisma.paymentMethod.findMany({
      orderBy: {
        code: "asc",
      },
      select: {
        code: true,
        name: true,
      },
    }),
  ]);
  const paymentLabel = new Map(
    paymentMethods.map((method) => [method.code, method.name]),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Riwayat Penjualan</h1>
        <p className="mt-3 text-slate-400">
          {session.role === "cashier"
            ? "Transaksi milik kasir login."
            : "Semua transaksi dengan filter dasar."}
        </p>
      </div>

      <form className="surface-panel grid gap-3 rounded-3xl p-4 sm:p-5 md:grid-cols-3 xl:grid-cols-6">
        <input
          type="date"
          name="from"
          defaultValue={params.from ?? ""}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-white"
        />
        <input
          type="date"
          name="to"
          defaultValue={params.to ?? ""}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-white"
        />
        {session.role !== "cashier" ? (
          <select
            name="cashier"
            defaultValue={params.cashier ?? ""}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-white"
          >
            <option value="">Semua kasir</option>
            {cashiers.map((cashier) => (
              <option key={cashier.id} value={cashier.id}>
                {cashier.name}
              </option>
            ))}
          </select>
        ) : null}
        <select
          name="payment"
          defaultValue={payment}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-white"
        >
          <option value="">Semua payment</option>
          {paymentMethods.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={q}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-white"
          placeholder="Invoice/customer"
        />
        <button className="rounded-2xl bg-teal-600 px-5 py-3 font-semibold text-white">
          Filter
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="surface-panel rounded-2xl p-5">
          <p className="text-sm text-slate-400">Total Transaksi</p>
          <h2 className="metric-value mt-2 text-3xl text-white">
            {totals._count._all}
          </h2>
        </div>
        <div className="surface-panel rounded-2xl p-5">
          <p className="text-sm text-slate-400">Total Omzet</p>
          <h2 className="metric-value mt-2 text-3xl text-white">
            {rupiah(totals._sum.subtotal ?? 0)}
          </h2>
        </div>
      </div>

      <div className="surface-panel overflow-hidden rounded-3xl">
        <div className="table-scroll">
        <table className="data-table">
          <thead className="bg-[#060B1F] text-sm text-slate-400">
            <tr>
              <th className="p-4 text-left">Invoice</th>
              <th className="p-4 text-left">Tanggal</th>
              <th className="p-4 text-left">Customer</th>
              <th className="p-4 text-left">Kasir</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Payment</th>
              <th className="p-4 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td className="p-5 text-slate-400" colSpan={7}>
                  Tidak ada transaksi sesuai filter.
                </td>
              </tr>
            ) : null}
            {sales.map((sale) => (
              <tr key={sale.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="p-4 font-semibold text-white">
                  {sale.invoiceNumber}
                  <p className="mt-1 text-xs text-slate-500">
                    {sale._count.items} item
                  </p>
                  {sale._count.returns > 0 ? (
                    <span className="mt-2 inline-flex rounded-full border border-rose-300 bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                      Ada retur
                    </span>
                  ) : null}
                </td>
                <td className="p-4 text-slate-300">
                  {formatDateTime(sale.createdAt)}
                </td>
                <td className="p-4 text-slate-300">
                  {sale.customer?.name ?? "Walk-in"}
                </td>
                <td className="p-4 text-slate-300">{sale.cashier.name}</td>
                <td
                    className={`p-4 font-semibold tabular-nums ${
                    sale._count.returns > 0
                    ? "!text-rose-700 dark:!text-rose-300"
                    : "text-slate-900 dark:text-white"
                 }`}
                >
                  {sale._count.returns > 0
                    ? `-${rupiah(sale.subtotal)}`
                    : rupiah(sale.subtotal)}
                </td>
                <td className="p-4 text-slate-300 capitalize">
                  {paymentLabel.get(sale.paymentMethod) ?? sale.paymentMethod}
                </td>
                <td className="p-4">
                  <Link
                    href={`/invoices/${sale.id}`}
                    className="text-sm font-semibold text-teal-400 hover:text-teal-200"
                  >
                    Invoice
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

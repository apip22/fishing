import { requireOwnerPage } from "@/lib/page-guards";
import { getOwnerReportSummary, rupiah } from "@/lib/reports";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="surface-panel rounded-2xl p-5">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
      <h2 className="metric-value mt-2 text-2xl text-slate-900 dark:text-slate-100 sm:text-3xl">
        {value}
      </h2>
    </div>
  );
}

export default async function ReportsPage() {
  await requireOwnerPage();

  const report = await getOwnerReportSummary();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="page-title">Laporan Owner</h1>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            Ringkasan penjualan, stok, pembelian, dan metode pembayaran.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/api/reports/export/excel"
            className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
          >
            Export Excel
          </a>
          <a
            href="/api/reports/export/pdf"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Export PDF
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Omzet Kotor Hari Ini"
          value={rupiah(report.today.grossOmzet)}
        />
        <StatCard
          title="Nilai Retur Hari Ini"
          value={rupiah(report.today.returnValue)}
        />
        <StatCard
          title="Omzet Bersih Hari Ini"
          value={rupiah(report.today.netOmzet)}
        />
        <StatCard
          title="Transaksi Hari Ini"
          value={String(report.today.transactions)}
        />
        <StatCard
          title="Total Retur Hari Ini"
          value={String(report.today.returnCount)}
        />
        <StatCard title="ATV Hari Ini" value={rupiah(report.today.averageTransaction)} />
        <StatCard
          title="Omzet Kotor Bulan Ini"
          value={rupiah(report.month.grossOmzet)}
        />
        <StatCard
          title="Nilai Retur Bulan Ini"
          value={rupiah(report.month.returnValue)}
        />
        <StatCard
          title="Omzet Bersih Bulan Ini"
          value={rupiah(report.month.netOmzet)}
        />
        <StatCard
          title="Transaksi Bulan Ini"
          value={String(report.month.transactions)}
        />
        <StatCard
          title="Total Retur Bulan Ini"
          value={String(report.month.returnCount)}
        />
        <StatCard title="ATV Bulan Ini" value={rupiah(report.month.averageTransaction)} />
        <StatCard
          title="Retur Supplier Hari Ini"
          value={rupiah(report.inventoryReturns.todayValue)}
        />
        <StatCard
          title="Retur Supplier Bulan Ini"
          value={rupiah(report.inventoryReturns.monthValue)}
        />
        <StatCard
          title="Net Pembelian Bulan Ini"
          value={rupiah(report.inventoryReturns.netPurchaseMonth)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Produk Terlaris Bulan Ini
          </h2>
          <div className="mt-5 space-y-3">
            {report.bestSellers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Belum ada penjualan bulan ini.
              </p>
            ) : null}
            {report.bestSellers.map((item) => (
              <div
                key={item.productId}
                className="surface-panel-soft flex items-center justify-between rounded-2xl p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="metric-value">{item.qty}</p>
                  <p className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{rupiah(item.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payment Summary</h2>
          <div className="mt-5 space-y-6">
            <div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Hari Ini</h3>
              <div className="mt-3 space-y-2">
                {report.today.paymentSummary.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada transaksi.</p>
                ) : null}
                {report.today.paymentSummary.map((item) => (
                  <div
                    key={item.paymentMethod}
                    className="surface-panel-soft flex justify-between rounded-2xl p-4"
                  >
                    <span className="capitalize text-slate-600 dark:text-slate-400">
                      {item.paymentLabel} ({item.transactions})
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {rupiah(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Bulan Ini</h3>
              <div className="mt-3 space-y-2">
                {report.month.paymentSummary.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada transaksi.</p>
                ) : null}
                {report.month.paymentSummary.map((item) => (
                  <div
                    key={item.paymentMethod}
                    className="surface-panel-soft flex justify-between rounded-2xl p-4"
                  >
                    <span className="capitalize text-slate-700 dark:text-slate-300">
                      {item.paymentLabel} ({item.transactions})
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {rupiah(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Ringkasan Retur</h2>
          <div className="mt-5 space-y-3">
            {report.returns.reasonSummary.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada retur bulan ini.</p>
            ) : null}
            {report.returns.reasonSummary.map((item) => (
              <div
                key={item.reason}
                className="surface-panel-soft flex items-center justify-between rounded-2xl p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                  <p className="text-sm text-slate-500">{item.returns} retur</p>
                </div>
                <p className="font-bold tabular-nums text-rose-700 dark:text-rose-400">{rupiah(item.total)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stok Rendah</h2>
          <div className="mt-5 space-y-3">
            {report.lowStockProducts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tidak ada produk stok rendah.
              </p>
            ) : null}
            {report.lowStockProducts.map((product) => (
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
            {report.recentPurchases.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada pembelian.</p>
            ) : null}
            {report.recentPurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="surface-panel-soft flex items-center justify-between rounded-2xl p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {purchase.purchaseNumber}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {purchase.supplier.name} -{" "}
                    {formatDateTime(purchase.createdAt)}
                  </p>
                </div>
                <p className="font-bold tabular-nums text-teal-400">
                  {rupiah(purchase.total)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Retur Supplier Terbaru</h2>
          <div className="mt-5 space-y-3">
            {report.inventoryReturns.recent.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Belum ada retur supplier.
              </p>
            ) : null}
            {report.inventoryReturns.recent.map((supplierReturn) => (
              <div
                key={supplierReturn.id}
                className="surface-panel-soft flex items-center justify-between rounded-2xl p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {supplierReturn.returnNumber}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {supplierReturn.supplier.name} - {formatDateTime(supplierReturn.createdAt)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {supplierReturn.supplier.type} - {supplierReturn.reason}
                  </p>
                </div>
                <p className="font-bold tabular-nums text-rose-700 dark:text-rose-400">
                  {rupiah(supplierReturn.totalAmount)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

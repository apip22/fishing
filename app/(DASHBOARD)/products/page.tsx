import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ProductEditButton from "@/components/products/product-edit-button";
import ProductStatusActionButton from "@/components/products/product-status-action-button";
import { requireOwnerPage } from "@/lib/page-guards";
import {
  Package,
  Boxes,
  DollarSign,
  Plus,
  Upload,
} from "lucide-react";

type ProductsPageProps = {
  searchParams?: Promise<{
    status?: string;
    q?: string;
    category?: string;
  }>;
};

const statusFilters = [
  {
    label: "Active",
    value: "active",
    href: "/products",
  },
  {
    label: "Inactive",
    value: "inactive",
    href: "/products?status=inactive",
  },
  {
    label: "Semua",
    value: "all",
    href: "/products?status=all",
  },
] as const;

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  await requireOwnerPage();

  const params = (await searchParams) ?? {};
  const status =
    params.status === "inactive" || params.status === "all"
      ? params.status
      : "active";
  const q = String(params.q ?? "").trim();
  const selectedCategory = String(params.category ?? "").trim();
  const where: Prisma.ProductWhereInput = {
    ...(status === "all" ? {} : { isActive: status === "active" }),
    ...(selectedCategory ? { category: selectedCategory } : {}),
    ...(q
      ? {
          OR: [
            {
              name: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              sku: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
  const [products, categories] =
    await Promise.all([
      prisma.product.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      }),
      prisma.product.findMany({
        where: {
          category: {
            not: null,
          },
        },
        distinct: ["category"],
        orderBy: {
          category: "asc",
        },
        select: {
          category: true,
        },
      }),
    ]);
  const categoryOptions = categories
    .map((product) => product.category)
    .filter((category): category is string => Boolean(category));

  const totalProducts =
    products.length;

  const totalStock = products.reduce(
    (acc, item) => acc + item.stock,
    0
  );

  const totalInventory =
    products.reduce(
      (acc, item) =>
        acc + item.price * item.stock,
      0
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="page-title">
            Inventory Produk
          </h1>

          <p className="mt-3 text-sm font-medium text-slate-400 opacity-80">
            Sistem POS Toko Pancing
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/products/import"
            className="btn-secondary flex items-center gap-2"
          >
            <Upload size={18} />
            Import Excel
          </Link>
          <Link
            href="/products/create"
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Tambah Produk
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface-panel rounded-3xl p-5 sm:p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-400">
              Total Produk
            </p>

            <h2 className="metric-value text-3xl text-white mt-3 sm:text-4xl">
              {totalProducts}
            </h2>
          </div>

          <Package
            className="text-teal-500"
            size={44}
          />
        </div>

        <div className="surface-panel rounded-3xl p-5 sm:p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-400">
              Total Stok
            </p>

            <h2 className="metric-value text-3xl text-white mt-3 sm:text-4xl">
              {totalStock}
            </h2>
          </div>

          <Boxes
            className="text-teal-500"
            size={44}
          />
        </div>

        <div className="surface-panel rounded-3xl p-5 sm:p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-400">
              Nilai Inventory
            </p>

            <h2 className="metric-value text-3xl text-white mt-3 sm:text-4xl">
              Rp{" "}
              {totalInventory.toLocaleString(
                "id-ID"
              )}
            </h2>
          </div>

          <DollarSign
            className="text-teal-500"
            size={44}
          />
        </div>
      </div>

      <div className="surface-panel rounded-3xl overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-slate-200 dark:border-slate-800 p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Daftar Produk
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-400 opacity-80">
              Produk active tampil di POS. Produk inactive tersimpan untuk histori.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Link
                key={filter.value}
                href={filter.href}
                className={
                  status === filter.value
                    ? "rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold !text-white hover:bg-teal-700"
                    : "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <form className="grid gap-3 border-b border-slate-200 dark:border-slate-800 p-5 md:grid-cols-[1fr_220px_auto]">
          <input type="hidden" name="status" value={status === "active" ? "" : status} />
          <input
            name="q"
            defaultValue={q}
            className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500 focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="Search nama atau SKU"
          />
          <select
            name="category"
            defaultValue={selectedCategory}
            className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Semua kategori/laci</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <button className="btn-primary" type="submit">
            Filter
          </button>
        </form>

        <div className="table-scroll">
        <table className="data-table">
          <thead className="bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="text-left p-5">
                Nama Produk
              </th>

              <th className="text-left p-5">
                SKU / Kategori
              </th>

              <th className="text-right p-5">
                Harga
              </th>

              <th className="text-right p-5">
                Stok
              </th>

              <th className="text-left p-5">
                Status
              </th>

              <th className="text-left p-5">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Tidak ada produk pada filter ini.
                </td>
              </tr>
            ) : null}
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-t border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                <td className="p-5 font-semibold text-slate-900 dark:text-slate-100">
                  {product.name}
                </td>

                <td className="p-5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{product.sku ?? "-"}</p>
                  <p className="text-slate-600 dark:text-slate-400">{product.category ?? "Tanpa kategori"}</p>
                </td>

                <td className="p-5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  Rp{" "}
                  {product.price.toLocaleString(
                    "id-ID"
                  )}
                </td>

                <td className="p-5 text-right">
                  <span className="bg-teal-500/20 text-teal-500 px-3 py-1 rounded-full text-sm font-semibold tabular-nums">
                    {product.stock}
                  </span>
                </td>

                <td className="p-5">
                  <span
                    className={
                      product.isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 px-3 py-1 rounded-full text-sm"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 px-3 py-1 rounded-full text-sm"
                    }
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                </td>

                <td className="p-5">
                  <ProductStatusActionButton
                    productId={product.id}
                    productName={product.name}
                    isActive={product.isActive}
                  />
                  <div className="mt-2">
                    <ProductEditButton
                      product={{
                        id: product.id,
                        sku: product.sku,
                        name: product.name,
                        price: product.price,
                        costPrice: product.costPrice,
                        stock: product.stock,
                        minStock: product.minStock,
                        unit: product.unit,
                        category: product.category,
                        description: product.description,
                      }}
                      categories={categoryOptions}
                    />
                  </div>
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

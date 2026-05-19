"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SaleMessageActions from "@/components/message-actions/sale-message-actions";
import PaymentConfirmationModal from "@/components/pos/payment-confirmation-modal";

type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
};

type ApiProduct = {
  id: number;
  name: string;
  sku: string | null;
  category: string | { name?: string | null } | null;
  selling_price: number | string;
  current_stock: number | string;
};

type CartItem = Product & {
  qty: number;
};

type UserPayload = {
  name: string;
  email: string;
  role?: {
    name: string;
    slug: string;
  } | null;
};

type CustomerLookup = {
  id: number;
  customerCode: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

type CheckoutSuccess = {
  id: string;
  invoiceNumber: string;
  total: number;
  paymentMethod: string;
};

type PaymentMethod = {
  code: string;
  name: string;
  type: string;
};

type PaymentSettings = {
  bankName: string;
  bankAccountNumber: string;
  bankAccountOwner: string;
  qrisImageUrl: string;
};

const TOKEN_KEY = "fishing_pos_token";
const USER_KEY = "fishing_pos_user";

function rupiah(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function readCategory(category: ApiProduct["category"]) {
  if (!category) {
    return "Tanpa kategori";
  }

  if (typeof category === "string") {
    return category;
  }

  return category.name ?? "Tanpa kategori";
}

function readStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(USER_KEY);

  return value ? (JSON.parse(value) as UserPayload) : null;
}

type PosAppProps = {
  currentUser: UserPayload;
  paymentMethods: PaymentMethod[];
  paymentSettings: PaymentSettings;
};

export default function PosApp({
  currentUser,
  paymentMethods,
  paymentSettings,
}: PosAppProps) {
  const [token, setToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem(TOKEN_KEY) ?? "",
  );
  const [user, setUser] = useState<UserPayload | null>(
    () => readStoredUser() ?? currentUser,
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<CustomerLookup | null>(
    null,
  );
  const [normalizedCustomerPhone, setNormalizedCustomerPhone] = useState("");
  const [customerLookupMessage, setCustomerLookupMessage] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(
    () =>
      paymentMethods.find((method) => method.code === "CASH")?.code ??
      paymentMethods[0]?.code ??
      "CASH",
  );
  const [successMessage, setSuccessMessage] = useState("");
  const [lastSaleId, setLastSaleId] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] =
    useState<CheckoutSuccess | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  const request = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const response = await fetch(url, {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? data?.error ?? "Request gagal");
      }

      return data;
    },
    [token],
  );

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams({
        per_page: "100",
      });

      const data = await request(`/api/products?${params.toString()}`);
      const mappedProducts = (data.data ?? []).map((product: ApiProduct) => ({
        id: product.id,
        name: product.name,
        sku: product.sku ?? "-",
        category: readCategory(product.category),
        price: Number(product.selling_price),
        stock: Number(product.current_stock),
      }));

      setProducts(mappedProducts);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memuat produk";
      setErrorMessage(message);

      if (message === "Unauthenticated.") {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
        setToken("");
        setUser(null);
        window.location.href = "/login";
      }
    } finally {
      setLoadingProducts(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProducts();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [fetchProducts]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const phone = customerPhone.trim();

      if (!phone) {
        setFoundCustomer(null);
        setNormalizedCustomerPhone("");
        setCustomerLookupMessage("");
        return;
      }

      setLoadingCustomer(true);

      try {
        const data = await request(
          `/api/customers?phone=${encodeURIComponent(phone)}`,
        );

        setNormalizedCustomerPhone(data.normalized_phone ?? "");

        if (data.found && data.data) {
          const customer = data.data as CustomerLookup;
          setFoundCustomer(customer);
          setCustomerName(customer.name);
          setCustomerAddress(customer.address ?? "");
          setCustomerLookupMessage("Customer lama ditemukan");
        } else {
          setFoundCustomer(null);
          setCustomerLookupMessage("Customer baru akan dibuat saat checkout");
        }
      } catch (error) {
        setFoundCustomer(null);
        setCustomerLookupMessage(
          error instanceof Error ? error.message : "Gagal mencari customer",
        );
      } finally {
        setLoadingCustomer(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [customerPhone, request]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      return acc + item.price * item.qty;
    }, 0);
  }, [cart]);
  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.code === paymentMethod,
  );
  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const sku = product.sku?.toLowerCase() || "";
      const category = product.category?.toLowerCase() || "";

      return (
        name.includes(keyword) ||
        sku.includes(keyword) ||
        category.includes(keyword)
      );
    });
  }, [products, search]);

  function addToCart(product: Product) {
    setSuccessMessage("");
    setLastSaleId("");
    setCheckoutSuccess(null);
    setErrorMessage("");

    if (product.stock <= 0) {
      setErrorMessage("Stok produk habis");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                qty: Math.min(item.qty + 1, product.stock),
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          ...product,
          qty: 1,
        },
      ];
    });
  }

  function increaseQty(id: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              qty: Math.min(item.qty + 1, item.stock),
            }
          : item,
      ),
    );
  }

  function decreaseQty(id: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? {
                ...item,
                qty: item.qty - 1,
              }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  }

  function checkoutPaidAmount() {
    return paidAmount ? Number(paidAmount) : subtotal;
  }

  function paymentSettingsReady() {
    if (selectedPaymentMethod?.type === "QRIS" && !paymentSettings.qrisImageUrl) {
      setErrorMessage("QRIS belum disetting di Pengaturan.");
      return false;
    }

    if (
      selectedPaymentMethod?.type === "BANK_TRANSFER" &&
      (!paymentSettings.bankName ||
        !paymentSettings.bankAccountNumber ||
        !paymentSettings.bankAccountOwner)
    ) {
      setErrorMessage("Rekening bank belum disetting di Pengaturan.");
      return false;
    }

    return true;
  }

  function initiateCheckout() {
    if (cart.length === 0) {
      setErrorMessage("Cart kosong");
      return;
    }

    const paid = checkoutPaidAmount();

    if (!Number.isFinite(paid) || paid < subtotal) {
      setErrorMessage("Pembayaran kurang");
      return;
    }

    if (!paymentSettingsReady()) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setPaymentModalOpen(true);
  }

  async function finalizeCheckout() {
    if (loadingCheckout) {
      return;
    }

    const paid = checkoutPaidAmount();

    setLoadingCheckout(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await request("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          paid_amount: paid,
          payment_method: paymentMethod,
          customer: customerPhone.trim()
            ? {
                name: customerName,
                phone: customerPhone,
                address: customerAddress,
              }
            : undefined,
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.qty,
          })),
        }),
      });

      setSuccessMessage(
        `Transaksi berhasil - ${response.data?.sale_number ?? ""}`,
      );
      setLastSaleId(response.data?.id ?? "");
      setCheckoutSuccess({
        id: response.data?.id ?? "",
        invoiceNumber: response.data?.sale_number ?? "",
        total: Number(response.data?.grand_total ?? 0),
        paymentMethod: response.data?.payment_method ?? "cash",
      });
      setCart([]);
      setPaidAmount("");
      setPaymentModalOpen(false);
      setPaymentMethod(
        paymentMethods.find((method) => method.code === "CASH")?.code ??
          paymentMethods[0]?.code ??
          "CASH",
      );
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setFoundCustomer(null);
      setNormalizedCustomerPhone("");
      setCustomerLookupMessage("");
      await fetchProducts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Checkout gagal");
    } finally {
      setLoadingCheckout(false);
    }
  }

  async function logout() {
    try {
      await request("/api/logout", {
        method: "POST",
      });
    } catch {
      // Token lokal tetap dibersihkan agar kasir bisa login ulang.
    }

    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setToken("");
    setUser(null);
    setProducts([]);
    setCart([]);
    setPaidAmount("");
    setPaymentMethod(
      paymentMethods.find((method) => method.code === "CASH")?.code ??
        paymentMethods[0]?.code ??
        "CASH",
    );
    setSuccessMessage("");
    setLastSaleId("");
    setCheckoutSuccess(null);
    setPaymentModalOpen(false);
    setErrorMessage("");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden cashier-shell px-4 py-4 text-slate-950 dark:text-slate-50 sm:px-6 md:px-8 lg:px-10">
      <div className="mx-auto w-full min-w-0 max-w-7xl">
        <PaymentConfirmationModal
          open={paymentModalOpen}
          paymentMethod={selectedPaymentMethod}
          paymentSettings={paymentSettings}
          total={subtotal}
          paidAmount={checkoutPaidAmount()}
          loading={loadingCheckout}
          onConfirm={finalizeCheckout}
          onCancel={() => {
            if (!loadingCheckout) {
              setPaymentModalOpen(false);
            }
          }}
        />

        <header className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Fishing POS
            </h1>

            <p className="mt-1 text-sm font-normal text-slate-500 dark:text-slate-400">
              {user?.name ?? "Kasir"} - Sistem kasir toko pancing
            </p>
          </div>

          <button
            onClick={logout}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            type="button"
          >
            Logout
          </button>
        </header>

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>{successMessage}</span>
              {lastSaleId ? (
                <Link
                  href={`/invoices/${lastSaleId}`}
                  className="font-semibold underline underline-offset-4"
                >
                  Lihat Invoice
                </Link>
              ) : null}
            </div>
          </div>
        )}

        {checkoutSuccess ? (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Checkout Success</p>
                <h2 className="metric-value text-xl">
                  {checkoutSuccess.invoiceNumber}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Total <span className="tabular-nums">{rupiah(checkoutSuccess.total)}</span> -{" "}
                  {checkoutSuccess.paymentMethod}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Link
                  href={`/invoices/${checkoutSuccess.id}?print=1`}
                  target="_blank"
                  className="min-h-10 rounded-xl bg-teal-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors duration-200 hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                >
                  Print Invoice
                </Link>
                <Link
                  href={`/invoices/${checkoutSuccess.id}`}
                  className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Open Invoice
                </Link>
                <div className="sm:col-span-2">
                  <SaleMessageActions saleId={checkoutSuccess.id} compact />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">
                  Produk
                </h2>

                <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  Cari nama, SKU, atau kategori
                </p>
              </div>

              <input
                type="text"
                placeholder="Cari produk atau SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-colors duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 sm:w-80"
              />
            </div>

            {loadingProducts ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Memuat produk
              </div>
            ) : null}

            {!loadingProducts && filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Produk tidak ditemukan
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">
                        {product.name}
                      </h3>

                      <p className="mt-1 break-words text-sm font-normal text-slate-500 dark:text-slate-400">
                        {product.sku}
                      </p>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className="min-h-10 min-w-10 rounded-lg bg-teal-600 px-3 py-1 text-sm font-semibold text-white transition-colors duration-200 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                      type="button"
                    >
                      +
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className="metric-value text-lg">{rupiah(product.price)}</p>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 break-words text-slate-500 dark:text-slate-400">
                        {product.category}
                      </span>
                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-sm font-semibold tabular-nums text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        Stok {product.stock}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-6 xl:self-start">
            <div className="mb-5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="mb-3">
                <h2 className="text-base font-semibold">Customer</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nomor WhatsApp sebagai identifier
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Nama
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-colors duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    placeholder="Nama customer"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-colors duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    placeholder="08123456789"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Alamat
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(event) => setCustomerAddress(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-colors duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    placeholder="Opsional"
                  />
                </div>

                {customerPhone ? (
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {loadingCustomer
                      ? "Mencari customer..."
                      : customerLookupMessage}
                    {normalizedCustomerPhone ? (
                      <p className="mt-1 tabular-nums">
                        Normalized: {normalizedCustomerPhone}
                      </p>
                    ) : null}
                    {foundCustomer ? (
                      <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {foundCustomer.customerCode} - {foundCustomer.name}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Cart</h2>

                <p className="text-sm text-slate-500 dark:text-slate-400">{cart.length} item</p>
              </div>
            </div>

            <div className="space-y-3">
              {cart.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Cart kosong
                </div>
              )}

              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>

                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.sku}</p>
                    </div>

                    <p className="font-semibold tabular-nums">
                      {rupiah(item.price * item.qty)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decreaseQty(item.id)}
                      className="min-h-10 min-w-10 rounded-lg border border-slate-300 px-3 py-1 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      type="button"
                    >
                      -
                    </button>

                    <span className="min-w-6 text-center font-semibold tabular-nums">
                      {item.qty}
                    </span>

                    <button
                      onClick={() => increaseQty(item.id)}
                      className="min-h-10 min-w-10 rounded-lg border border-slate-300 px-3 py-1 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Subtotal</span>

                <span className="metric-value text-2xl">{rupiah(subtotal)}</span>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Payment Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {paymentMethods.map((method) => (
                    <option key={method.code} value={method.code}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPaymentMethod?.type === "BANK_TRANSFER" ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-500/10 dark:text-teal-200">
                  <p className="font-semibold">Transfer Bank</p>
                  <p className="mt-1 text-xs">
                    Detail rekening akan tampil jelas di modal checkout.
                  </p>
                </div>
              ) : null}

              {selectedPaymentMethod?.type === "QRIS" ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-500/10 dark:text-teal-200">
                  <p className="font-semibold">QRIS Statis</p>
                  <p className="mt-1 text-xs">
                    QRIS besar akan tampil di modal checkout setelah kasir klik Checkout.
                  </p>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Dibayar
                </label>

                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={String(subtotal)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-colors duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <button
                onClick={initiateCheckout}
                disabled={loadingCheckout || cart.length === 0}
                className="min-h-12 w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                type="button"
              >
                {loadingCheckout ? "Memproses..." : "Checkout"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

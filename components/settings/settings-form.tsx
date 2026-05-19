"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SettingsFormProps = {
  settings: {
    storeName: string;
    storeWhatsApp: string;
    storeAddress: string;
    ownerName: string;
  };
  paymentMethods: {
    id: string;
    code: string;
    name: string;
    type: string;
    isActive: boolean;
  }[];
  paymentSettings: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountOwner: string;
    qrisImageUrl: string;
  };
  ownerEmail: string;
  appVersion: string;
};

const TOKEN_KEY = "fishing_pos_token";

export default function SettingsForm({
  settings,
  paymentMethods,
  paymentSettings,
  ownerEmail,
  appVersion,
}: SettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [paymentForm, setPaymentForm] = useState(paymentSettings);
  const [methods, setMethods] = useState(paymentMethods);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");

  async function submitSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const token =
        typeof window === "undefined"
          ? ""
          : window.localStorage.getItem(TOKEN_KEY) ?? "";
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? "Gagal menyimpan settings.");
      }

      setMessage("Settings berhasil disimpan.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal menyimpan settings.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitPaymentSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentLoading(true);
    setPaymentMessage("");
    setPaymentError("");

    try {
      const token =
        typeof window === "undefined"
          ? ""
          : window.localStorage.getItem(TOKEN_KEY) ?? "";
      const response = await fetch("/api/payment-settings", {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(paymentForm),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? "Gagal menyimpan payment settings.");
      }

      setPaymentMessage("Payment settings berhasil disimpan.");
      router.refresh();
    } catch (submitError) {
      setPaymentError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal menyimpan payment settings.",
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  async function toggleMethod(code: string, isActive: boolean) {
    setPaymentMessage("");
    setPaymentError("");

    try {
      const token =
        typeof window === "undefined"
          ? ""
          : window.localStorage.getItem(TOKEN_KEY) ?? "";
      const response = await fetch("/api/payment-methods", {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code,
          isActive,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? "Gagal update payment method.");
      }

      setMethods((current) =>
        current.map((method) =>
          method.code === code ? { ...method, isActive } : method,
        ),
      );
      setPaymentMessage("Status payment method berhasil diupdate.");
      router.refresh();
    } catch (submitError) {
      setPaymentError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal update payment method.",
      );
    }
  }

  async function uploadQris(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadLoading(true);
    setPaymentMessage("");
    setPaymentError("");

    try {
      const token =
        typeof window === "undefined"
          ? ""
          : window.localStorage.getItem(TOKEN_KEY) ?? "";
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/payment-settings/qris-upload", {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? "Gagal upload QRIS.");
      }

      setPaymentForm((current) => ({
        ...current,
        qrisImageUrl: data.data?.qrisImageUrl ?? "",
      }));
      setPaymentMessage("QRIS berhasil diupload.");
      router.refresh();
    } catch (submitError) {
      setPaymentError(
        submitError instanceof Error ? submitError.message : "Gagal upload QRIS.",
      );
    } finally {
      setUploadLoading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={submitSettings}
        className="surface-panel space-y-6 rounded-3xl p-5 sm:p-6"
      >
        {message ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div>
          <h2 className="text-2xl font-bold text-white">Profil Toko</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              value={form.storeName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  storeName: event.target.value,
                }))
              }
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
              placeholder="Nama toko"
            />
            <input
              value={form.storeWhatsApp}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  storeWhatsApp: event.target.value,
                }))
              }
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
              placeholder="Nomor WhatsApp toko"
            />
          </div>
          <textarea
            value={form.storeAddress}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                storeAddress: event.target.value,
              }))
            }
            className="mt-4 min-h-24 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
            placeholder="Alamat toko"
          />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white">Owner</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              value={form.ownerName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ownerName: event.target.value,
                }))
              }
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
              placeholder="Nama owner"
            />
            <input
              value={ownerEmail}
              readOnly
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-400 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan Settings"}
        </button>
      </form>

      <section className="surface-panel space-y-6 rounded-3xl p-5 sm:p-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Payment Method</h2>
          <p className="mt-2 text-sm text-slate-400">
            Kasir hanya bisa memilih metode pembayaran yang aktif.
          </p>
        </div>

        {paymentMessage ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {paymentMessage}
          </div>
        ) : null}
        {paymentError ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {paymentError}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          {methods.map((method) => (
            <div
              key={method.id}
              className="surface-panel-soft rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{method.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {method.code} - {method.type}
                  </p>
                </div>
                <span
                  className={
                    method.isActive
                      ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300"
                      : "rounded-full bg-slate-500/15 px-3 py-1 text-xs font-semibold text-slate-300"
                  }
                >
                  {method.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleMethod(method.code, !method.isActive)}
                className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {method.isActive ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={submitPaymentSettings} className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white">Transfer Bank</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input
                value={paymentForm.bankName}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    bankName: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
                placeholder="Nama bank"
              />
              <input
                value={paymentForm.bankAccountNumber}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    bankAccountNumber: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
                placeholder="Nomor rekening"
              />
              <input
                value={paymentForm.bankAccountOwner}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    bankAccountOwner: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
                placeholder="Nama pemilik rekening"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">QRIS Statis</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={uploadQris}
                disabled={uploadLoading}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-sm text-slate-900 outline-none dark:text-slate-100 file:mr-4 file:rounded-xl file:border-0 file:bg-teal-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
              />
              {paymentForm.qrisImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={paymentForm.qrisImageUrl}
                  alt="Preview QRIS"
                  className="h-32 w-32 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white object-contain p-2"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                  Belum ada QRIS
                </div>
              )}
            </div>
            <input
              value={paymentForm.qrisImageUrl}
              onChange={(event) =>
                setPaymentForm((current) => ({
                  ...current,
                  qrisImageUrl: event.target.value,
                }))
              }
              className="mt-4 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
              placeholder="/uploads/qris/file.png"
            />
          </div>

          <button
            type="submit"
            disabled={paymentLoading}
            className="rounded-2xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {paymentLoading ? "Menyimpan..." : "Simpan Payment Settings"}
          </button>
        </form>
      </section>

      <section className="surface-panel rounded-3xl p-5 sm:p-6">
        <h2 className="text-2xl font-bold text-white">Developer / Credit</h2>
        <div className="mt-4 space-y-1 text-sm text-slate-300">
          <p>Developer: Akbar Fahreza</p>
          <p>a.k.a Alexander Van Meijr</p>
          <p>Powered by Meijrverse</p>
        </div>
      </section>

      <section className="surface-panel rounded-3xl p-5 sm:p-6">
        <h2 className="text-2xl font-bold text-white">System Info</h2>
        <div className="mt-4 space-y-1 text-sm text-slate-300">
          <p>App version: {appVersion}</p>
          <p>Stack: Next.js + Prisma + PostgreSQL</p>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateProductForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("5");

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const response = await fetch(
      "/api/products",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          name,
          sku,
          category,
          price,
          costPrice,
          stock,
          minStock,
        }),
      }
    );

    if (response.ok) {
      alert("Produk berhasil ditambahkan");

      router.push("/products");
      router.refresh();
    } else {
      alert("Gagal tambah produk");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="page-title">
        Tambah Produk
      </h1>

      <p className="text-slate-400 mt-3">
        Tambahkan produk baru
      </p>

      <form
        onSubmit={handleSubmit}
        className="surface-panel mt-8 space-y-6 rounded-3xl p-5 sm:p-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm text-slate-300">
            SKU
          </label>

          <input
            type="text"
            value={sku}
            onChange={(e) =>
              setSku(e.target.value)
            }
            className="w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
            placeholder="Opsional"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Nama Produk
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            className="w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
            placeholder="Nama produk"
          />
        </div>
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Kategori / Laci
          </label>

          <input
            type="text"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
            className="w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
            placeholder="Joran, Reel, Kail, PE, Nilon, Leader, Umpan"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm text-slate-300">
            Harga Jual
          </label>

          <input
            type="number"
            value={price}
            onChange={(e) =>
              setPrice(e.target.value)
            }
            className="w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
            placeholder="Harga produk"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Harga Beli
          </label>

          <input
            type="number"
            value={costPrice}
            onChange={(e) =>
              setCostPrice(e.target.value)
            }
            className="w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
            placeholder="Harga beli"
          />
        </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm text-slate-300">
            Stok
          </label>

          <input
            type="number"
            value={stock}
            onChange={(e) =>
              setStock(e.target.value)
            }
            className="w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
            placeholder="Jumlah stok"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Min Stok
          </label>

          <input
            type="number"
            value={minStock}
            onChange={(e) =>
              setMinStock(e.target.value)
            }
            className="w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
            placeholder="Batas stok rendah"
          />
        </div>
        </div>

        <button
          type="submit"
          className="rounded-2xl bg-teal-600 px-6 py-3 font-semibold text-white transition-colors duration-150 hover:bg-teal-700"
        >
          Simpan Produk
        </button>
      </form>
    </div>
  );
}

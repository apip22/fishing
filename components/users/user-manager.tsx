"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UserRow = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  role: {
    name: string;
    slug: string;
  };
};

type UserManagerProps = {
  users: UserRow[];
};

const TOKEN_KEY = "fishing_pos_token";
const roles = ["owner", "cashier", "developer"];

function emptyForm() {
  return {
    id: 0,
    name: "",
    email: "",
    role: "cashier",
    password: "",
  };
}

export default function UserManager({ users }: UserManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isEditing = form.id > 0;

  async function request(method: "POST" | "PATCH", body: object) {
    const token =
      typeof window === "undefined"
        ? ""
        : window.localStorage.getItem(TOKEN_KEY) ?? "";
    const response = await fetch("/api/users", {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.message ?? "Request user gagal.");
    }
  }

  async function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await request(isEditing ? "PATCH" : "POST", form);
      setForm(emptyForm());
      setMessage(isEditing ? "User berhasil diupdate." : "User berhasil dibuat.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Request user gagal.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(user: UserRow) {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await request("PATCH", {
        id: user.id,
        isActive: !user.isActive,
      });
      setMessage(user.isActive ? "User dinonaktifkan." : "User diaktifkan.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Update user gagal.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={submitUser}
        className="surface-panel space-y-4 rounded-3xl p-5 sm:p-6"
      >
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? "Edit User" : "Tambah User"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Role final: OWNER, CASHIER, DEVELOPER.
          </p>
        </div>

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

        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
            placeholder="Nama"
          />
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
            placeholder="Email"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <select
            value={form.role}
            onChange={(event) =>
              setForm((current) => ({ ...current, role: event.target.value }))
            }
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role.toUpperCase()}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 text-slate-900 outline-none dark:text-slate-100"
            placeholder={isEditing ? "Password baru opsional" : "Password"}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : isEditing ? "Update User" : "Simpan User"}
          </button>
          {isEditing ? (
            <button
              type="button"
              onClick={() => setForm(emptyForm())}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 px-6 py-3 font-semibold text-slate-300"
            >
              Batal
            </button>
          ) : null}
        </div>
      </form>

      <div className="surface-panel overflow-hidden rounded-3xl">
        <div className="table-scroll">
        <table className="data-table">
          <thead className="bg-[#060B1F] text-sm text-slate-400">
            <tr>
              <th className="p-4 text-left">Nama</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Role</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="p-4 font-semibold text-white">{user.name}</td>
                <td className="p-4 text-slate-300">{user.email}</td>
                <td className="p-4 text-slate-300">{user.role.slug}</td>
                <td className="p-4">
                  <span
                    className={
                      user.isActive
                        ? "rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300"
                        : "rounded-full bg-slate-500/15 px-3 py-1 text-sm font-semibold text-slate-300"
                    }
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          role: user.role.slug,
                          password: "",
                        })
                      }
                      className="text-sm font-semibold text-teal-400"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(user)}
                      className="text-sm font-semibold text-red-300"
                    >
                      {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td className="p-5 text-slate-400" colSpan={5}>
                  Belum ada user.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

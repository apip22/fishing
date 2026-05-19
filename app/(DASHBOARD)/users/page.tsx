import UserManager from "@/components/users/user-manager";
import { requireOwnerPage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  await requireOwnerPage();

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      role: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">User Management</h1>
        <p className="mt-3 text-slate-400">
          Kelola user tanpa menampilkan password hash.
        </p>
      </div>

      <UserManager users={users} />
    </div>
  );
}

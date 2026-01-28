"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { api } from "@/utils/api";
import { User } from "@/types/auth";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await api.get<User[]>("/admin/users");
        setUsers(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load users");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
          <p className="text-gray-400">Manage user accounts and access roles.</p>
        </div>
        {/* Placeholder for future Add User button */}
        {/* <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded">Add User</button> */}
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded text-red-200 mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">Loading users...</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/50 border-b border-gray-700 text-xs uppercase text-gray-400 font-medium">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400 border border-gray-700">
                        {user.full_name
                          ? user.full_name[0].toUpperCase()
                          : user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">
                          {user.full_name || "No Name"}
                        </div>
                        <div className="text-gray-500 text-xs">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                        user.role === "admin"
                          ? "bg-purple-900/30 text-purple-300 border-purple-800"
                          : user.role === "clinician"
                            ? "bg-cyan-900/30 text-cyan-300 border-cyan-800"
                            : "bg-gray-800 text-gray-300 border-gray-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                        user.is_active ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-green-400" : "bg-red-400"}`}
                      />
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/users/detail?id=${user.id}`}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="View Details"
                      >
                        👁️
                      </Link>
                      <Link
                        href={`/admin/users/detail?id=${user.id}&edit=true`}
                        className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-700 rounded transition-colors"
                        title="Edit User"
                      >
                        ✏️
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

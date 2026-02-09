"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 rounded-lg shadow-md bg-white text-center">
        <h1 className="text-4xl font-bold mb-2 text-blue-400">Dashboard</h1>
        <p className="text-xl text-gray-700">
          Welcome, {session.user.name ?? session.user.email}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Role: {session.user.role}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-6 rounded-lg bg-gray-800 px-6 py-2 text-sm font-semibold text-white hover:bg-gray-700"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

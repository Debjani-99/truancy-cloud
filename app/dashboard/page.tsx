"use client"

import { signOut } from "next-auth/react";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // This is TEMP: it will allow UI development without auth/db
  // Will remove this when NextAuth is ready
  const devBypass = process.env.NODE_ENV === "development";

  if (!devBypass) {
    // When auth is ready, need to replace this with real session check
    redirect("/login");
  }

  return (
  <main className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="p-8 rounded-lg shadow-md bg-white text-center">
      <h1 className="text-8xl font-bold mb-2 text-blue-300">Dashboard</h1>
      <p className=" text-2xl text-gray-500">
        Welcome, User
      </p>
      <button
        onClick={() => signOut( {callbackUrl: "/"})}
        className="mt-6 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:opacity-60"
      >
        Sign out
      </button>
    </div>
  </main>
);

}

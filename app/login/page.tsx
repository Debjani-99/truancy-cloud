"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black/5 text-white">
      
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/ohio.jpg')" }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-linear-to-r from-black/30 via-black/10 to-black/5" />

      {/* Centered content */}
      <section className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-6">
        <div className="grid w-full grid-cols-1 gap-10 md:grid-cols-2">
          
          {/* Hero text */}
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center text-center">
            <h1 className="text-3xl font-semibold leading-tight sm:text-6xl">
              Welcome to the Truancy Cloud Portal
            </h1>

            <p className="mt-3 text-2xl text-white/300">
              Secure county-based access for schools and courts
            </p>

            <p className="mt-4 text-sm text-white/80">
              Upload and track attendance reports securely. Access is limited by
              county and role (School, Court, Admin).
            </p>
          </div>

          {/* Login card */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-white/30 p-6 text-center backdrop-blur-md ring-1 ring-white/15 shadow-2xl">
              
              <h2 className="text-2xl font-semibold">Sign in</h2>

              <p className="mt-2 text-sm text-white/75">
                Authorized county account required
              </p>

              <button
                onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
                className="mt-6 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:opacity-60"
              >
                Sign In
              </button>

              <div className="mt-4 text-xs text-white/70">
                Having trouble? Contact your county administrator.
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center text-s text-white/80">
        © {new Date().getFullYear()} Truancy Cloud • Internal use only
      </footer>

    </main>
  );
}

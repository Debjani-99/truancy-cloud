"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setSuccess("A reset code has been sent to that email")
      }
    } catch (err) {
      setError("Network error - please try again.");
    } finally {
      setLoading(false)
    }
  }

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
          <div className="absolute inset-0 bg-linear-to-r  from-black/10 via-black/5 to-transparent" />
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center text-center">
            <h1 className="text-8xl font-extrabold leading-tight sm:text-7xl drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
              Welcome to the Truancy Cloud Portal
            </h1>

            
            <p className="mt-3 text-4xl text-white/95 drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
              Secure county-based access for schools and courts
            </p>

            <p className="mt-5 text-xl text-white/110 drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
              Upload and track attendance reports securely. Access is limited by
              county and role (School, Court, Admin).
            </p>
          </div>

          {/* Login card */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-white/30 p-6 text-center backdrop-blur-md ring-1 ring-white/15 shadow-2xl">
              <h2 className="text-2xl font-semibold text-black/85">Enter Email to Reset Password</h2>

              <p className="mt-2 text-m text-black/85">
                Authorized county account required
              </p>

              {error && (
                <p className="mt-3 text-sm text-red-300">{error}</p>
              )}

              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className="mt-6 w-full rounded-lg bg-white px-4 py-2.5 text-sm text-black placeholder-gray-400"
                  required
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:opacity-80"
                >
                  {loading ? "Sending..." : "Send Reset Email"}
                </button>
              </form>
              <button
                  onClick={() => router.push("/login")}
                  className="mt-6 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:opacity-80"
              >
                  Return to login
              </button>

              <div className="mt-4 text-s text-black/90">
                Having trouble? Contact your county administrator.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center text-s text-white/80">
        &copy; {new Date().getFullYear()} Truancy Cloud &bull; Internal use only
      </footer>
    </main>
  );
}

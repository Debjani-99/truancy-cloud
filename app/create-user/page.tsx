"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession, signOut, getCsrfToken } from "next-auth/react";


type Role = "SCHOOL" | "COURT" | "ADMIN";

type School = {
  id: string;
  name: string;
};

function Card({
  title,
  subtitle,
  onClick,
  icon,
  className = "",
}: {
  title: string;
  subtitle?: string;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {icon && (
        <div className="relative z-10 mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-200">
          {icon}
        </div>
      )}

      <div className="relative z-10">
        <h3 className="text-xl font-bold text-gray-900 transition-colors group-hover:text-blue-900">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-2 text-sm text-gray-600 transition-colors group-hover:text-gray-700">
            {subtitle}
          </p>
        )}
        <div className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600 transition-colors group-hover:text-blue-700">
          Open
          <svg
            className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

export default function CreateAccountPage() {
    const [schoolName, setSchoolName] = useState("");
    const [countyName, setCountyName] = useState("");
    const [countyId, setCountyId] = useState("");
    const [email, setEmail] = useState("");
    const [newRole, setNewRole] = useState("");
    const [studentId, setStudentId] = useState("");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        if (newRole == "SCHOOL") {
          const res = await fetch("/api/initialize-users/new-school", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                schoolName,
                countyId,
                email,
                newRole
            }),
          });

          const data = await res.json();

          if (data.redirect) {
          window.location.href = data.redirect;
          return;
          }

          if (!res.ok) {
            setError(data.error || "Something went wrong");
          } else {
            setMessage("School Account Created Successfully");
            setSchoolName("");
            setCountyId("");
            setEmail("");
            setNewRole("");
          }
        
          setLoading(false);
        }

        if (newRole == "COURT") {
          const res = await fetch("/api/initialize-users/new-court", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                countyName,
                email,
                newRole
            }),
          });

          const data = await res.json();

          if (data.redirect) {
          window.location.href = data.redirect;
          return;
          }

          if (!res.ok) {
            setError(data.error || "Something went wrong");
          } else {
            setMessage("Court Account Created Successfully");
            setCountyName("");
            setEmail("");
            setNewRole("");
          }
        
          setLoading(false);
        }

        if (newRole == "PARENT") {
          const res = await fetch("/api/initialize-users/new-parent", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                newRole,
                studentId
            }),
          });

          const data = await res.json();

          if (data.redirect) {
          window.location.href = data.redirect;
          return;
          }

          if (!res.ok) {
            setError(data.error || "Something went wrong");
          } else {
            setMessage("Parent Account Created Successfully");
            setNewRole("");
            setStudentId("");
          }
        
          setLoading(false);
        }

        
    }

    // THIS IS ALL FROM DASHBOARD
      const router = useRouter();
      const { data: session, status } = useSession();
    
      const [scopeName, setScopeName] = useState<string | null>(null);
      const [schools, setSchools] = useState<School[]>([]);
      const [schoolsLoading, setSchoolsLoading] = useState(false);
    
      // Redirect logged-out users
      useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
      }, [status, router]);
    
      const role = (session?.user?.role ?? null) as Role | null;
      const displayName = session?.user?.name ?? session?.user?.email ?? "User";
    
      // Load county/school name
      useEffect(() => {
        const loadScopeName = async () => {
          if (!session || !role) return;
    
          setScopeName(null);
    
          try {
            if (role === "SCHOOL" && session.user.schoolId) {
              const res = await fetch(`/api/schools/${session.user.schoolId}`, {
                cache: "no-store",
              });
              if (!res.ok) return;
              const data = await res.json();
              setScopeName(data?.name ?? null);
            }
    
            if (role === "COURT" && session.user.countyId) {
              const res = await fetch(`/api/counties/${session.user.countyId}`, {
                cache: "no-store",
              });
              if (!res.ok) return;
              const data = await res.json();
              setScopeName(data?.name ?? null);
            }
          } catch {
            setScopeName(null);
          }
        };
    
        loadScopeName();
      }, [session, role]);
    
      // Load schools for COURT county
      useEffect(() => {
        const loadSchoolsForCourt = async () => {
          if (!session || role !== "COURT") return;
          if (!session.user.countyId) return;
    
          setSchoolsLoading(true);
          try {
            const res = await fetch(`/api/counties/${session.user.countyId}/schools`, {
              cache: "no-store",
            });
    
            if (!res.ok) {
              setSchools([]);
              return;
            }
    
            const data = await res.json();
            setSchools(Array.isArray(data?.schools) ? data.schools : []);
          } catch {
            setSchools([]);
          } finally {
            setSchoolsLoading(false);
          }
        };
    
        loadSchoolsForCourt();
      }, [session, role]);
    
      const scopeLabel = useMemo(() => {
        if (!session || !role) return "";
        if (role === "COURT") return `County: ${scopeName ?? "Loading county..."}`;
        if (role === "SCHOOL") return `School: ${scopeName ?? "Loading school..."}`;
        return "Scope: Admin (all)";
      }, [session, role, scopeName]);
    
      if (status === "loading") {
        return (
          <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
              <p className="mt-4 font-medium text-gray-600">Loading your dashboard...</p>
            </div>
          </main>
        );
      }
    
      if (!session) return null;

    return (
        <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
           {/* Background Pattern */}
           <div className="absolute inset-0 opacity-5">
             <div
               className="absolute inset-0"
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
               }}
             />
           </div>
   
           {/* Header */}
           <header className="relative z-10 border-b border-white/20 bg-white/80 backdrop-blur-xl">
             <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
               <div className="flex items-center space-x-4">
                 <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                   <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path
                       strokeLinecap="round"
                       strokeLinejoin="round"
                       strokeWidth={2}
                       d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                     />
                   </svg>
                 </div>
                 <div>
                   <h1 className="text-2xl font-bold text-gray-900">School Portal</h1>
                   <p className="text-sm text-gray-600">{scopeName ?? "Loading..."}</p>
                 </div>
               </div>
   
               <div className="flex items-center space-x-4">
                 <div className="hidden text-right sm:block">
                   <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                   {/* FIX: role can be null, so guard it */}
                   <p className="text-xs text-gray-500 capitalize">{role ? role.toLowerCase() : ""} User</p>
                 </div>
                 <button
                   onClick={() => signOut({ callbackUrl: "/login" })}
                   className="inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                 >
                   <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path
                       strokeLinecap="round"
                       strokeLinejoin="round"
                       strokeWidth={2}
                       d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                     />
                   </svg>
                   Sign Out
                 </button>
               </div>
             </div>
           </header>
           {/* MAIN CARD */}
           <section className="relative z-10 mx-auto max-w-7xl px-6 py-12">
            <h1 className="text-2xl font-semibold mb-6">Account Creation</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1 text-sm font-medium">Account Role</label>
                     <select                       
                       className="w-full rounded-lg border px-3 py-2"
                        value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                       required
                     >
                      <option value="">Select a role</option>
                      {role === "ADMIN" && (<option value="COURT">Court</option>)}
                      {((role === "ADMIN") || (role === "COURT")) && (<option value="SCHOOL">School</option>)}
                      <option value="PARENT">Parent</option>
                    </select>
                </div>
                {newRole === "SCHOOL" && (
                  <div>
                    <label className="block mb-1 text-sm font-medium">Account School Name</label>
                    <input
                     className="w-full rounded-lg border px-3 py-2"
                     value={schoolName}
                     onChange={(e) => setSchoolName(e.target.value)}
                     required={newRole === "SCHOOL"}
                    />
                  </div>
                )}

                {newRole === "SCHOOL" && role === "ADMIN" && (
                  <div>
                    <label className="block mb-1 text-sm font-medium">Account School County ID</label>
                    <input
                     className="w-full rounded-lg border px-3 py-2"
                     value={countyId}
                     onChange={(e) => setCountyId(e.target.value)}
                     required={(newRole === "SCHOOL") && (role === "ADMIN")}
                    />
                  </div>
                )}

                {newRole === "SCHOOL" && (
                  <div>
                    <label className="block mb-1 text-sm font-medium">Account Email</label>
                    <input
                     type="email"
                     className="w-full rounded-lg border px-3 py-2"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     required={newRole === "SCHOOL"}
                    />
                  </div>
                )}

                {newRole === "COURT" && (
                  <div>
                    <label className="block mb-1 text-sm font-medium">Account County</label>
                    <input
                     className="w-full rounded-lg border px-3 py-2"
                     value={schoolName}
                     onChange={(e) => setCountyName(e.target.value)}
                     required={newRole === "COURT"}
                    />
                  </div>
                )}


                {newRole === "COURT" && (
                  <div>
                    <label className="block mb-1 text-sm font-medium">Account Email</label>
                    <input
                     type="email"
                     className="w-full rounded-lg border px-3 py-2"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     required={newRole === "COURT"}
                    />
                  </div>
                )}


                {newRole === "PARENT" && (
                  <div>
                    <label className="block mb-1 text-sm font-medium">Student ID for Account</label>
                    <input
                     className="w-full rounded-lg border px-3 py-2"
                     value={studentId}
                     onChange={(e) => setStudentId(e.target.value)}
                     required={newRole === "PARENT"}
                    />
                  </div>
                )}

                {error && <p className="text-red-600 text-sm">{error}</p>}
                {message && <p className="text-green-600 text-sm">{message}</p>}

                {newRole === "SCHOOL" && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-2 rounded-lg hover:opacity-80"
                  >
                    {loading ? "Sending..." : "Send Email to Create School Account"}
                  </button>
                )}
                {newRole === "PARENT" && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-2 rounded-lg hover:opacity-80"
                  >
                    {loading ? "Creating..." : "Create Parent Account"}
                  </button>
                )}
            </form>
        
           </section>     
        </main>

    );
}
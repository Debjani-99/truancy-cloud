
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";


export default async function DashboardPage() {

  const session = await getServerSession(authOptions);

  // TEMP behavior:
  // - session is always null right now
  // - so this always redirects
  if (!session) {
    redirect("/login");
  }


  return (
  <main className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="p-8 rounded-lg shadow-md bg-white text-center">
      <h1 className="text-8xl font-bold mb-2 text-blue-300">Dashboard</h1>
      <p className=" text-2xl text-gray-500">
        Welcome, User
      </p>
    </div>
  </main>
);

}

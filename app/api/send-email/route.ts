import { Resend } from "resend";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

const resend = new Resend('re_iruxHtiM_9fEXsLVCD5iCA8zhw6GAqfbE');

export async function POST(req: Request) {
 
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    
    await resend.emails.send({
      from: "test@resend.dev",
      to: "truancycloud@gmail.com", 
      subject: "Reset Password",
      html: `
        <h2>Reset Password</h2>
        <p>Hello ${session.user.name},</p>
        <p>Here are instructions to reset your password.</p>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
}

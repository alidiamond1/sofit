import { Clock3, LogOut, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { refreshApprovalAction } from "@/app/actions/onboarding";
import logo from "@/assets/png.png";
import { readSession } from "@/lib/auth/session";
import { database } from "@/lib/db";

export default async function ApplicationPendingPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (session.role === "coach") redirect("/coach");

  const user = await database()("users").select("approval_status").where({ id: session.id, role: "client" }).first();
  if (!user) redirect("/");

  const rejected = user.approval_status === "rejected";
  return <main className="pending-page"><Image src={logo} alt="SoFit" priority /><section className="pending-card"><span className={rejected ? "pending-icon rejected" : "pending-icon"}>{rejected ? <ShieldCheck size={25} /> : <Clock3 size={25} />}</span><span className="eyebrow">{rejected ? "Application update" : "Account created"}</span><h1>{rejected ? "Your application was not approved." : "Your application is in review."}</h1><p>{rejected ? "Your account remains private and dashboard access is closed. Contact the coach if you need more information." : "The coach will review your intake and assign the right service. Check again after approval and SoFit will open your client dashboard."}</p><div className="pending-steps"><span className="done">1</span><p><strong>Intake submitted</strong><small>Your answers are saved securely.</small></p><span className="done">2</span><p><strong>Account created</strong><small>Your email and password are ready.</small></p><span className={rejected ? "rejected" : ""}>3</span><p><strong>Coach approval</strong><small>{rejected ? "Application closed." : "Waiting for review."}</small></p></div><div className="pending-actions">{!rejected ? <form action={refreshApprovalAction}><button className="button primary">Check approval status</button></form> : null}<form action={logoutAction}><button className="button secondary"><LogOut size={15} /> Sign out</button></form></div></section></main>;
}


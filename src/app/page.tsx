import { Activity, CheckCircle2, Sparkles } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { readSession } from "@/lib/auth/session";
import logo from "@/assets/png.png";

export default async function Home() {
  const session = await readSession();
  if (session) redirect(session.role === "coach" ? "/coach" : "/client");

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><Image src={logo} alt="SoFit" priority /></div>
        <div className="story-copy">
          <span className="story-kicker"><Sparkles size={14} /> Personal coaching, beautifully organized</span>
          <h2>Build strength.<br />Keep life in balance.</h2>
          <p>Plans, progress, and the conversations that keep every next step clear.</p>
          <div className="story-points">
            <span><CheckCircle2 size={17} /> Clear weekly direction</span>
            <span><CheckCircle2 size={17} /> Progress you can see</span>
            <span><CheckCircle2 size={17} /> Your coach, close by</span>
          </div>
        </div>
        <div className="story-quote"><Activity size={20} /><blockquote>Consistency gets easier when every next step feels clear.</blockquote><span>THE SOFIT METHOD</span></div>
      </section>
      <section className="login-panel">
        <div className="mobile-login-brand"><Image src={logo} alt="SoFit" priority /></div>
        <LoginForm />
        <p className="login-footer">? 2026 SoFit Coaching</p>
      </section>
    </main>
  );
}

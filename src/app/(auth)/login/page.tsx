"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.ok) router.push("/dashboard");
    else alert("Login failed");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Admin Login</h1>
        <input className="border p-2 w-full" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email"/>
        <input className="border p-2 w-full" value={password} type="password" onChange={(e)=>setPassword(e.target.value)} placeholder="Password"/>
        <button className="bg-black text-white px-4 py-2" disabled={loading}>
          {loading ? "..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

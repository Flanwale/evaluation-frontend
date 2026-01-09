"use client";
import { useState, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Loader2, LayoutDashboard, Database, ShieldCheck, Activity, Users, ArrowRight } from "lucide-react";
import { UserNav } from "@/components/user-nav";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const getFormattedPhone = (p: string) => p.startsWith("+86") ? p : `+86${p}`;

  const handleSendCode = async () => {
    if(!phone) return toast.error("请输入手机号");
    if(!turnstileToken) return toast.error("请等待人机验证完成");
    setIsSending(true);
    try {
      const response = await fetch("/api/auth/phone-number/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-turnstile-token": turnstileToken },
        body: JSON.stringify({ phoneNumber: getFormattedPhone(phone) })
      });
      if (!response.ok) throw new Error("发送失败");
      toast.success("验证码已发送");
    } catch (e: any) {
      toast.error(e.message || "发送失败");
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally { setIsSending(false); }
  };

  const handleLogin = async () => {
    if(!code) return toast.error("请输入验证码");
    setIsLoggingIn(true);
    await authClient.phoneNumber.verify({
        phoneNumber: getFormattedPhone(phone),
        code: String(code)
    }, {
        onSuccess: async () => {
            const { data } = await authClient.getSession();
            toast.success(`欢迎回来，${data?.user.name || "用户"}`);
            if (data?.user.role === 'admin') router.push("/admin/dashboard");
            else router.push("/user/dashboard");
        },
        onError: (c) => toast.error(c.error.message)
    });
    setIsLoggingIn(false);
  };

  if (isPending) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 h-16 flex items-center justify-between sticky top-0 z-50">
         <div className="flex items-center gap-2">
             <div className="bg-blue-600 p-1.5 rounded-lg"><Activity className="w-5 h-5 text-white" /></div>
             <span className="font-bold text-xl text-slate-800 tracking-tight">Clinical EDC</span>
         </div>
         {session ? (
             <div className="flex items-center gap-4">
                 <Button onClick={() => router.push(session.user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard')}>
                    进入控制台
                 </Button>
                 <UserNav session={session} />
             </div>
         ) : (
             <div className="text-sm text-slate-500">浙江大学附属第一医院数据中心</div>
         )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
          {/* Hero Section */}
          <section className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 md:p-12 gap-12 max-w-7xl mx-auto w-full">
              
              {/* Left: Text & Features */}
              <div className="flex-1 space-y-8 animate-in slide-in-from-left-4 duration-700">
                  <div className="space-y-4">
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200">
                          v2.0 新版上线
                      </div>
                      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                          新一代 <span className="text-blue-600">临床电子数据</span><br/>采集管理系统
                      </h1>
                      <p className="text-lg text-slate-600 max-w-xl">
                          专为多中心临床研究设计。支持动态 CRF 建模、实时数据校验、全流程审计追踪。安全、合规、高效。
                      </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                          <Database className="w-6 h-6 text-blue-500 mt-1" />
                          <div>
                              <h3 className="font-semibold text-slate-900">动态建模</h3>
                              <p className="text-sm text-slate-500">Excel 定义结构，一键生成数据库。</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                          <ShieldCheck className="w-6 h-6 text-emerald-500 mt-1" />
                          <div>
                              <h3 className="font-semibold text-slate-900">数据安全</h3>
                              <p className="text-sm text-slate-500">多重加密，自动脱敏，符合 GCP 规范。</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                          <Users className="w-6 h-6 text-indigo-500 mt-1" />
                          <div>
                              <h3 className="font-semibold text-slate-900">多端协同</h3>
                              <p className="text-sm text-slate-500">CRC/PI/DM 分权协作，实时同步。</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Right: Login Card */}
              <div className="w-full max-w-md animate-in slide-in-from-right-4 duration-700">
                  {session ? (
                      <Card className="border-blue-100 shadow-xl bg-white/50 backdrop-blur">
                          <CardContent className="pt-10 pb-10 text-center space-y-6">
                              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <Users className="w-10 h-10 text-blue-600" />
                              </div>
                              <div className="space-y-2">
                                  <h2 className="text-2xl font-bold">已登录系统</h2>
                                  <p className="text-slate-500">当前用户: {session.user.name || session.user.phoneNumber}</p>
                              </div>
                              <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                                  onClick={() => router.push(session.user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard')}>
                                  进入工作台 <ArrowRight className="ml-2 w-5 h-5"/>
                              </Button>
                          </CardContent>
                      </Card>
                  ) : (
                      <Card className="border-slate-200 shadow-2xl bg-white">
                          <CardHeader className="space-y-1 pb-2">
                              <CardTitle className="text-2xl text-center">系统登录</CardTitle>
                              <CardDescription className="text-center">
                                  使用手机号验证码快捷登录
                              </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-4">
                              <div className="space-y-2">
                                  <Input placeholder="手机号码" value={phone} onChange={e => setPhone(e.target.value)} className="h-11 bg-slate-50" />
                              </div>
                              
                              <div className="flex justify-center min-h-[65px] bg-slate-50 rounded-md border border-slate-100 items-center overflow-hidden">
                                  <Turnstile 
                                      ref={turnstileRef}
                                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                                      onSuccess={setTurnstileToken}
                                      onError={() => setTurnstileToken(null)}
                                      onExpire={() => setTurnstileToken(null)}
                                  />
                              </div>

                              <div className="flex gap-3">
                                  <Input placeholder="验证码" value={code} onChange={e => setCode(e.target.value)} className="h-11 bg-slate-50" />
                                  <Button className="h-11 w-32" variant="outline" onClick={handleSendCode} disabled={isSending || !turnstileToken}>
                                      {isSending ? <Loader2 className="w-4 h-4 animate-spin"/> : "获取验证码"}
                                  </Button>
                              </div>

                              <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-lg mt-2" onClick={handleLogin} disabled={isLoggingIn}>
                                  {isLoggingIn ? "登录中..." : "立即登录"}
                              </Button>
                              <p className="text-xs text-center text-slate-400 mt-4">
                                  未注册手机号将自动创建账户 (7天免登录)
                              </p>
                          </CardContent>
                      </Card>
                  )}
              </div>
          </section>
      </main>
      
      <footer className="py-6 text-center text-xs text-slate-400 border-t bg-white">
          <p>© 2024 Clinical Data Center. All rights reserved. | 隐私政策 | 服务条款</p>
      </footer>
    </div>
  );
}
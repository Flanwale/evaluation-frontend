"use client";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Activity, BarChart3, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [stats, setStats] = useState<any>({ user_count: 0, patient_count: 0, gender_stats: [], year_stats: [] });

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(res => res.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/");
  };

  // 简单的条形图组件
  const SimpleBar = ({ label, value, max, color = "bg-blue-500" }: any) => (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-100">{value}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000`} 
             style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-4">
        <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">系统管理后台</h1>
            <p className="text-slate-400 mt-1 text-sm">Administrator Console</p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" size="sm" className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => router.push("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> 返回首页
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> 退出
            </Button>
        </div>
      </div>
      
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-slate-900 border-slate-800 text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">系统用户总数</CardTitle>
              <Users className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent><div className="text-4xl font-bold">{stats.user_count}</div></CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">录入患者总数</CardTitle>
              <Activity className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent><div className="text-4xl font-bold">{stats.patient_count}</div></CardContent>
        </Card>
      </div>

      {/* 统计图表区 */}
      <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> 用户画像分析
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 性别分布 */}
          <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-base">用户性别分布</CardTitle></CardHeader>
              <CardContent>
                  {stats.gender_stats.length > 0 ? stats.gender_stats.map((g: any) => (
                      <SimpleBar key={g.name} label={g.name} value={g.value} max={stats.user_count} color="bg-pink-500" />
                  )) : <p className="text-slate-500 text-sm">暂无数据</p>}
              </CardContent>
          </Card>

          {/* 年龄分布 */}
          <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader><CardTitle className="text-base">用户出生年份分布</CardTitle></CardHeader>
              <CardContent className="max-h-[300px] overflow-y-auto pr-2">
                  {stats.year_stats.length > 0 ? stats.year_stats.map((y: any) => (
                      <SimpleBar key={y.year} label={`${y.year} 年`} value={y.count} max={Math.max(...stats.year_stats.map((i:any)=>i.count))} color="bg-cyan-500" />
                  )) : <p className="text-slate-500 text-sm">暂无数据</p>}
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
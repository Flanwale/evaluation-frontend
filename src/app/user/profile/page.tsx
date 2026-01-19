"use client";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UserProfile() {
  const { data: session, refetch } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    birthday: ""
  });

  // 加载初始数据
  useEffect(() => {
    if (session?.user) {
        setFormData({
            name: session.user.name || "",
            gender: (session.user as any).gender || "",
            // 处理 Prisma 返回的 Date 格式
            birthday: (session.user as any).birthday ? new Date((session.user as any).birthday).toISOString().split('T')[0] : ""
        });
    }
  }, [session]);

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    try {
        // 调用 FastAPI 后端更新
        const res = await fetch(`/api/user/${session.user.id}/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: formData.name,
                gender: formData.gender,
                birthday: formData.birthday ? new Date(formData.birthday).toISOString() : null
            })
        });
        const json = await res.json();
        
        if (json.success) {
            toast.success("保存成功");
            await refetch(); // 刷新 Session
            router.refresh();
        } else {
            toast.error("保存失败: " + json.error);
        }
    } catch (e) {
        toast.error("网络错误");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center gap-4 border-b border-slate-100 pb-4">
            <Link href="/">
                <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <CardTitle>个人信息设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
                <Label>手机号 (账号)</Label>
                <Input value={session?.user.phoneNumber || ""} disabled className="bg-slate-100 text-slate-500" />
            </div>

            <div className="space-y-2">
                <Label>姓名</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="请输入您的真实姓名" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>性别</Label>
                    <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                        <SelectTrigger><SelectValue placeholder="选择性别" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">男</SelectItem>
                            <SelectItem value="female">女</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>出生日期</Label>
                    <Input type="date" value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})} />
                </div>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={loading}>
                <Save className="w-4 h-4 mr-2" /> 保存更改
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings } from "lucide-react";

export function UserNav({ session }: { session: any }) {
  const router = useRouter();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full" suppressHydrationWarning>
          <Avatar className="h-10 w-10 border border-slate-200">
            <AvatarImage src={session?.user.image || ""} alt={session?.user.name || ""} />
            <AvatarFallback>{session?.user.name?.[0] || <User className="w-5 h-5"/>}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session?.user.name || "用户"}</p>
            <p className="text-xs leading-none text-muted-foreground">{session?.user.phoneNumber}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/user/profile")}>
            <User className="mr-2 h-4 w-4" />
            <span>个人中心</span>
          </DropdownMenuItem>
          {/* 这里可以加更多菜单项 */}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => {
             await authClient.signOut();
             router.refresh();
             router.push("/");
        }}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
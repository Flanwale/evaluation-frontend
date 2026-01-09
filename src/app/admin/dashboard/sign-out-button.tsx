"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button 
      variant="destructive" 
      size="sm"
      onClick={async () => {
        await authClient.signOut();
        router.push("/admin/login");
      }}
    >
      退出
    </Button>
  );
}
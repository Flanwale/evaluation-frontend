// src/lib/auth-client.ts

import { createAuthClient } from "better-auth/react";
import { phoneNumberClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth"; // ✅ 一定要 type-only 引入，避免把 server-only 代码打进前端

export const authClient = createAuthClient({
  // ✅ 建议用环境变量；没配时回退本地
  baseURL: "", // ✅ 同域
  plugins: [
    // ✅ 关键：把 server 端 additionalFields（role/gender/birthday）推导到 client 的 Session/User 类型里
    inferAdditionalFields<typeof auth>(),
    phoneNumberClient(),
  ],
});

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { phoneNumber } from "better-auth/plugins";
import { sendSms } from "@/lib/sms";
import { headers } from "next/headers";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { APIError } from "better-auth/api";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mysql" }),
  emailAndPassword: { enabled: false },
  // [关键] 设置 Session 有效期为 7 天
  session: {
    expiresIn: 60 * 60 * 24 * 7, 
    updateAge: 60 * 60 * 24, // 每天更新一次活跃状态
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        const headerList = await headers();
        const turnstileToken = headerList.get("x-turnstile-token");
        const verification = await verifyTurnstileToken(turnstileToken);
        if (!verification.success) throw new APIError("BAD_REQUEST", verification.message || "人机验证失败");
        await sendSms(phoneNumber, code);
      },
      // 这里的 temp email 逻辑保持不变
      signUpOnVerification: { enabled: true, getTempEmail: (phone) => `${phone}@temp.mobile` },
    }),
  ],
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "user", input: false },
      // [新增] 映射数据库新增字段
      gender: { type: "string", required: false },
      birthday: { type: "date", required: false },
    },
  },
});
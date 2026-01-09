import { createAuthClient } from "better-auth/react"
import { phoneNumberClient } from "better-auth/client/plugins" // 🔥 引入插件

export const authClient = createAuthClient({
    baseURL: "http://localhost:3000",
    plugins: [
        phoneNumberClient() // 🔥 必须在这里注册，才能用 sendOtp
    ]
})
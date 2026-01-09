export async function verifyTurnstileToken(token: string | null) {
  if (!token) {
    return { success: false, message: "缺少人机验证 Token" };
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error("Server Error: TURNSTILE_SECRET_KEY not set");
    return { success: false, message: "服务器配置错误" };
  }

  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);

    const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const result = await fetch(url, {
      body: formData,
      method: "POST",
    });

    const outcome = await result.json();
    if (outcome.success) {
      return { success: true };
    } else {
      console.error("Turnstile Validation Failed:", outcome);
      return { success: false, message: "人机验证失败，请刷新重试" };
    }
  } catch (e) {
    console.error("Turnstile Verify Error:", e);
    return { success: false, message: "验证服务连接超时" };
  }
}
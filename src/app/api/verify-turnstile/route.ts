// src/app/api/verify-turnstile/route.ts
interface TurnstileVerificationResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export async function POST(request: Request) {
  try {
    const { token } = (await request.json()) as { token?: string };

    if (!token) {
      return Response.json(
        { ok: false, error: "缺少 Turnstile token" },
        { status: 400 }
      );
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      console.error("[Turnstile] 缺少 TURNSTILE_SECRET_KEY 环境变量");
      return Response.json(
        { ok: false, error: "服务器配置错误" },
        { status: 500 }
      );
    }

    // 调用 Cloudflare 官方验证接口:contentReference[oaicite:4]{index=4}
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          response: token,
        }),
      }
    );

    const data = (await verifyRes.json()) as TurnstileVerificationResponse;

    if (!data.success) {
      console.error("[Turnstile] 验证失败:", data["error-codes"]);
      return Response.json(
        {
          ok: false,
          error: "人机验证未通过，请重试",
          codes: data["error-codes"] ?? [],
        },
        { status: 400 }
      );
    }

    // 验证通过
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[Turnstile] 服务器异常:", err);
    return Response.json(
      { ok: false, error: "服务器异常，请稍后重试" },
      { status: 500 }
    );
  }
}

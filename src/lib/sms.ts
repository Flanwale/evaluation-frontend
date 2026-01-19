// frontend/src/lib/sms.ts
import "server-only";

/**
 * 说明：
 * - 默认走 Spug 推送助手（推荐：简单、无需阿里云 SDK）
 * - 如果你想走阿里云短信 SDK：设置 SMS_PROVIDER=aliyun，并配置阿里云环境变量
 *
 * ✅ 所有敏感信息都必须走环境变量，禁止写死在代码里
 */

// ============ 通用配置 ============
type SmsProvider = "spug" | "aliyun";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizePhone(phone: string): string {
  // 你之前遇到 Spug 不识别 +86：这里统一处理
  return phone.replace(/^\+86/, "");
}

// ============ Spug 实现 ============
async function sendViaSpug(phone: string, code: string) {
  const spugUrl = getEnv("SPUG_URL"); // 例如: https://push.spug.cc/send/xxxx
  const spugName = process.env.SPUG_NAME ?? "验证码登录";

  const cleanPhone = normalizePhone(phone);

  console.log(`[Spug] sending code to ${cleanPhone} (raw: ${phone})`);

  const response = await fetch(spugUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: spugName,
      code,
      targets: cleanPhone,
    }),
  });

  let result: any = null;
  try {
    result = await response.json();
  } catch {
    // 如果返回不是 JSON
  }

  if (!response.ok) {
    console.error("[Spug] http error:", response.status, result);
    throw new Error(`Spug HTTP error: ${response.status}`);
  }
  // 你之前用的是 result.code === 200 的约定，这里保留
  if (result && typeof result.code !== "undefined" && result.code !== 200) {
    console.error("[Spug] api error:", result);
    throw new Error(result.msg || "Spug API Error");
  }

  console.log("[Spug] sent OK");
  return result;
}

// ============ 阿里云实现（可选）===========
// 只有当你真的需要阿里云 SDK 才使用；否则不用装依赖也没关系
async function sendViaAliyun(phone: string, code: string) {
  const accessKeyId = getEnv("ALIYUN_ACCESS_KEY_ID");
  const accessKeySecret = getEnv("ALIYUN_ACCESS_KEY_SECRET");
  const signName = getEnv("ALIYUN_SMS_SIGN_NAME"); // 例如: 阿里云短信测试
  const templateCode = getEnv("ALIYUN_SMS_TEMPLATE_CODE"); // 例如: SMS_154950909

  // 动态 import：避免你不装 aliyun 依赖时也能编译
  const [
    Dysmsapi20170525Module,
    OpenApiModule,
    UtilModule,
  ] = await Promise.all([
    import("@alicloud/dysmsapi20170525"),
    import("@alicloud/openapi-client"),
    import("@alicloud/tea-util"),
  ]);

  const Dysmsapi20170525 = Dysmsapi20170525Module.default;
  const $Dysmsapi20170525 = Dysmsapi20170525Module;
  const $OpenApi = OpenApiModule;
  const $Util = UtilModule;

  const config = new $OpenApi.Config({
    accessKeyId,
    accessKeySecret,
  });
  config.endpoint = "dysmsapi.aliyuncs.com";

  const client = new Dysmsapi20170525(config);

  const cleanPhone = normalizePhone(phone);

  const req = new $Dysmsapi20170525.SendSmsRequest({
    phoneNumbers: cleanPhone,
    signName,
    templateCode,
    templateParam: JSON.stringify({ code }),
  });

  const runtime = new $Util.RuntimeOptions({});

  console.log(`[Aliyun] sending code to ${cleanPhone} (raw: ${phone})`);
  const resp = await client.sendSmsWithOptions(req, runtime);

  const body = resp.body;
  if (!body) {
    console.error("[Aliyun] empty response body:", resp);
    throw new Error("Aliyun SMS response body is empty");
  }

  if (body.code !== "OK") {
    console.error("[Aliyun] rejected:", body.message);
    throw new Error(body.message || "Aliyun SMS rejected");
  }


  console.log("[Aliyun] sent OK, bizId:", body.bizId);
  return body;

}

// ============ 统一出口 ============
export async function sendSms(phone: string, code: string) {
  const provider = (process.env.SMS_PROVIDER as SmsProvider) || "spug";

  if (provider === "spug") {
    return sendViaSpug(phone, code);
  }
  if (provider === "aliyun") {
    return sendViaAliyun(phone, code);
  }

  throw new Error(`Unsupported SMS_PROVIDER: ${provider}`);
}

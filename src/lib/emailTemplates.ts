export type EmailLocale = "ar" | "en";
export type EmailTemplate = { subject: string; html: string; text: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

function layout(locale: EmailLocale, title: string, body: string, ctaLabel?: string, ctaUrl?: string, notice?: string) {
  const rtl = locale === "ar";
  const safeTitle = escapeHtml(title);
  const safeUrl = ctaUrl ? escapeHtml(ctaUrl) : "";
  const footer = rtl ? "نشمي — منصة مدنية رقمية مستقلة" : "Nashmi — an independent civic digital platform";
  const fallback = ctaUrl
    ? `<p style="margin:24px 0 0;color:#52605a;font-size:13px;line-height:1.7;word-break:break-all">${rtl ? "إذا لم يعمل الزر، انسخ الرابط:" : "If the button does not work, copy this link:"}<br><a href="${safeUrl}" style="color:#126b52">${safeUrl}</a></p>`
    : "";
  const action = ctaLabel && ctaUrl
    ? `<p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#126b52;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:12px">${escapeHtml(ctaLabel)}</a></p>`
    : "";
  return `<!doctype html><html lang="${locale}" dir="${rtl ? "rtl" : "ltr"}"><body style="margin:0;background:#f4f7f5;color:#17221e;font-family:Arial,Tahoma,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${safeTitle}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #dce6e1;border-radius:18px;overflow:hidden"><tr><td style="background:#126b52;padding:22px 28px;color:#fff;font-size:24px;font-weight:800">نشمي <span style="font-size:16px;font-weight:400">Nashmi</span></td></tr><tr><td style="padding:30px 28px;text-align:${rtl ? "right" : "left"}"><h1 style="margin:0 0 18px;font-size:25px;line-height:1.4">${safeTitle}</h1><div style="font-size:16px;line-height:1.9;color:#33443d">${body}</div>${action}${fallback}${notice ? `<p style="margin:24px 0 0;padding:14px;background:#f6f8f7;border-radius:10px;color:#52605a;font-size:13px;line-height:1.7">${escapeHtml(notice)}</p>` : ""}</td></tr><tr><td style="padding:18px 28px;border-top:1px solid #edf1ef;color:#64746d;font-size:12px;text-align:${rtl ? "right" : "left"}">${footer}</td></tr></table></td></tr></table></body></html>`;
}

const copy = {
  ar: {
    verifySubject: "فعّل بريدك الإلكتروني في نشمي", verifyTitle: "تأكيد البريد الإلكتروني", verifyBody: "أهلًا بك في نشمي. أكمل تفعيل حسابك بالضغط على الزر أدناه. ينتهي الرابط خلال 24 ساعة.", verifyCta: "تفعيل البريد", verifyNotice: "إذا لم تنشئ هذا الحساب، يمكنك تجاهل الرسالة بأمان.",
    welcomeSubject: "أهلًا بك في نشمي", welcomeTitle: "تم تفعيل حسابك", welcomeBody: "أصبح حسابك جاهزًا. يمكنك الآن تسجيل الدخول والمشاركة في خدمات المنصة.", welcomeCta: "تسجيل الدخول",
    resetSubject: "إعادة تعيين كلمة مرور نشمي", resetTitle: "إعادة تعيين كلمة المرور", resetBody: "تلقينا طلبًا لتعيين كلمة مرور جديدة. استخدم الرابط خلال ساعة واحدة.", resetCta: "اختيار كلمة مرور جديدة", resetNotice: "إذا لم تطلب ذلك، تجاهل الرسالة وستبقى كلمة مرورك كما هي.",
    changedSubject: "تم تغيير كلمة مرور حسابك في نشمي", changedTitle: "تم تغيير كلمة المرور", changedBody: "تم تغيير كلمة مرور حسابك بنجاح. تم إنهاء صلاحية الجلسات السابقة لحماية حسابك.", changedNotice: "إذا لم تقم بهذا التغيير، تواصل مع مالك المنصة فورًا.",
    inviteSubject: "تم إنشاء حسابك في نشمي", inviteTitle: "أكمل إعداد حسابك", inviteBody: "أنشأ مسؤول المنصة حسابًا لك. اختر كلمة مرور آمنة باستخدام الرابط لمرة واحدة خلال 24 ساعة.", inviteCta: "إعداد الحساب", inviteNotice: "لا تشارك هذا الرابط مع أي شخص. إذا لم تكن تتوقع الدعوة، تجاهل الرسالة."
  },
  en: {
    verifySubject: "Verify your Nashmi email", verifyTitle: "Verify your email", verifyBody: "Welcome to Nashmi. Activate your account with the button below. This link expires in 24 hours.", verifyCta: "Verify email", verifyNotice: "If you did not create this account, you can safely ignore this email.",
    welcomeSubject: "Welcome to Nashmi", welcomeTitle: "Your account is verified", welcomeBody: "Your account is ready. You can now sign in and use the platform.", welcomeCta: "Sign in",
    resetSubject: "Reset your Nashmi password", resetTitle: "Reset your password", resetBody: "We received a request to choose a new password. Use this link within one hour.", resetCta: "Choose a new password", resetNotice: "If you did not request this, ignore this email and your password will remain unchanged.",
    changedSubject: "Your Nashmi password was changed", changedTitle: "Password changed", changedBody: "Your password was changed successfully. Previous sessions were invalidated to protect your account.", changedNotice: "If you did not make this change, contact the platform owner immediately.",
    inviteSubject: "Your Nashmi account was created", inviteTitle: "Finish setting up your account", inviteBody: "A platform administrator created an account for you. Choose a secure password using this one-time link within 24 hours.", inviteCta: "Set up account", inviteNotice: "Do not share this link. If you were not expecting this invitation, ignore this email."
  }
} as const;

function textVersion(lines: string[]) { return lines.filter(Boolean).join("\n\n"); }

export function verificationEmail(locale: EmailLocale, url: string): EmailTemplate {
  const c = copy[locale];
  return { subject: c.verifySubject, html: layout(locale, c.verifyTitle, c.verifyBody, c.verifyCta, url, c.verifyNotice), text: textVersion([c.verifyTitle, c.verifyBody, url, c.verifyNotice]) };
}
export function welcomeEmail(locale: EmailLocale, loginUrl: string): EmailTemplate {
  const c = copy[locale];
  return { subject: c.welcomeSubject, html: layout(locale, c.welcomeTitle, c.welcomeBody, c.welcomeCta, loginUrl), text: textVersion([c.welcomeTitle, c.welcomeBody, loginUrl]) };
}
export function passwordResetEmail(locale: EmailLocale, url: string): EmailTemplate {
  const c = copy[locale];
  return { subject: c.resetSubject, html: layout(locale, c.resetTitle, c.resetBody, c.resetCta, url, c.resetNotice), text: textVersion([c.resetTitle, c.resetBody, url, c.resetNotice]) };
}
export function passwordChangedEmail(locale: EmailLocale): EmailTemplate {
  const c = copy[locale];
  return { subject: c.changedSubject, html: layout(locale, c.changedTitle, c.changedBody, undefined, undefined, c.changedNotice), text: textVersion([c.changedTitle, c.changedBody, c.changedNotice]) };
}
export function accountInvitationEmail(locale: EmailLocale, url: string): EmailTemplate {
  const c = copy[locale];
  return { subject: c.inviteSubject, html: layout(locale, c.inviteTitle, c.inviteBody, c.inviteCta, url, c.inviteNotice), text: textVersion([c.inviteTitle, c.inviteBody, url, c.inviteNotice]) };
}

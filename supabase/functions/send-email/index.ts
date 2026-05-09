// Supabase Edge Function — envio de e-mail via AWS SES
// Disparado por Database Webhooks em library_memberships (verificação) e notify_requests (livro disponível).
// Deploy: cole este arquivo em Edge Functions → New function → name: send-email
// Secrets necessários (Settings → Edge Functions → Secrets):
//   AWS_REGION (ex: us-east-1)
//   AWS_ACCESS_KEY_ID
//   AWS_SECRET_ACCESS_KEY
//   MAIL_FROM (ex: naoresponder@acerva.app — precisa estar verificado no SES)
//   FRONTEND_URL (ex: https://acerva.vercel.app — usado em links nos e-mails)

import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

interface WebhookPayload<T = Record<string, unknown>> {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: T;
  old_record: T | null;
}

interface MembershipRow {
  library_id: string;
  user_id: string;
  verification_status: "pending" | "submitted" | "verified" | "rejected";
  rejection_reason: string | null;
  is_blocked: boolean;
  block_reason: string | null;
}

interface NotifyRow {
  id: string;
  user_id: string;
  book_id: string;
  library_id: string;
  status: "pending" | "notified" | "cancelled";
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AWS_REGION = Deno.env.get("AWS_REGION") ?? "us-east-1";
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID")!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "naoresponder@acerva.app";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") ?? "https://acerva.app";

const aws = new AwsClient({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  service: "ses",
  region: AWS_REGION,
});

async function adminFetch(path: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
}

async function getProfile(userId: string) {
  const r = await adminFetch(`profiles?id=eq.${userId}&select=id,name,email`);
  const arr = await r.json();
  return arr?.[0] as { id: string; name: string | null; email: string | null } | undefined;
}

async function getLibrary(libraryId: string) {
  const r = await adminFetch(
    `libraries?id=eq.${libraryId}&select=id,slug,name,city,state`,
  );
  const arr = await r.json();
  return arr?.[0] as
    | { id: string; slug: string; name: string; city: string | null; state: string | null }
    | undefined;
}

async function getBook(bookId: string) {
  const r = await adminFetch(`books?id=eq.${bookId}&select=id,title,author`);
  const arr = await r.json();
  return arr?.[0] as { id: string; title: string; author: string } | undefined;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail({ to, subject, html, text }: SendArgs) {
  const url = `https://email.${AWS_REGION}.amazonaws.com/v2/email/outbound-emails`;
  const body = {
    FromEmailAddress: MAIL_FROM,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
          Text: { Data: text, Charset: "UTF-8" },
        },
      },
    },
  };
  const resp = await aws.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`SES ${resp.status}: ${err}`);
  }
}

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#fdfaf3;margin:0;padding:32px">
    <table align="center" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e0cf">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #e8e0cf;color:#0e3b2c">
        <strong style="font-size:20px;font-family:'Playfair Display',serif">ACERVA</strong>
      </td></tr>
      <tr><td style="padding:28px 32px;color:#1f2937;line-height:1.6">
        <h1 style="font-family:'Playfair Display',serif;font-size:24px;color:#0e3b2c;margin:0 0 16px">${title}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:16px 32px;background:#fafaf6;color:#6b7280;font-size:12px;text-align:center">
        Você está recebendo porque tem cadastro no ACERVA.
      </td></tr>
    </table>
  </body></html>`;
}

async function handleMembership(record: MembershipRow, old: MembershipRow | null) {
  // Aprovação: status mudou pra 'verified'
  if (record.verification_status === "verified" && old?.verification_status !== "verified") {
    const [profile, library] = await Promise.all([
      getProfile(record.user_id),
      getLibrary(record.library_id),
    ]);
    if (!profile?.email || !library) return;
    const link = `${FRONTEND_URL}/${library.slug}`;
    await sendEmail({
      to: profile.email,
      subject: `Cadastro aprovado — ${library.name}`,
      html: shell(
        "Cadastro aprovado!",
        `<p>Olá ${profile.name ?? ""},</p>
         <p>Seu cadastro na <strong>${library.name}</strong> foi aprovado pela bibliotecária.
         Você já pode reservar livros, acompanhar empréstimos e avaliar leituras.</p>
         <p style="margin:24px 0">
           <a href="${link}" style="background:#0e3b2c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
             Acessar o catálogo
           </a>
         </p>
         <p>Bem-vindo(a)! 📚</p>`,
      ),
      text: `Seu cadastro na ${library.name} foi aprovado. Acesse: ${link}`,
    });
    return;
  }

  // Rejeição: status mudou pra 'rejected'
  if (record.verification_status === "rejected" && old?.verification_status !== "rejected") {
    const [profile, library] = await Promise.all([
      getProfile(record.user_id),
      getLibrary(record.library_id),
    ]);
    if (!profile?.email || !library) return;
    const link = `${FRONTEND_URL}/${library.slug}/conta`;
    await sendEmail({
      to: profile.email,
      subject: `Cadastro precisa de revisão — ${library.name}`,
      html: shell(
        "Cadastro precisa de revisão",
        `<p>Olá ${profile.name ?? ""},</p>
         <p>Seu cadastro na <strong>${library.name}</strong> não foi aprovado.</p>
         <p><strong>Motivo:</strong> ${record.rejection_reason ?? "não informado"}</p>
         <p>Acesse sua conta e reenvie os documentos corrigidos.</p>
         <p style="margin:24px 0">
           <a href="${link}" style="background:#0e3b2c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
             Atualizar cadastro
           </a>
         </p>`,
      ),
      text: `Cadastro não aprovado. Motivo: ${record.rejection_reason}. Acesse: ${link}`,
    });
    return;
  }

  // Bloqueio: passou de não-bloqueado pra bloqueado
  if (record.is_blocked && !old?.is_blocked) {
    const [profile, library] = await Promise.all([
      getProfile(record.user_id),
      getLibrary(record.library_id),
    ]);
    if (!profile?.email || !library) return;
    await sendEmail({
      to: profile.email,
      subject: `Conta bloqueada — ${library.name}`,
      html: shell(
        "Sua conta foi bloqueada",
        `<p>Olá ${profile.name ?? ""},</p>
         <p>Sua conta na <strong>${library.name}</strong> foi bloqueada.</p>
         <p><strong>Motivo:</strong> ${record.block_reason ?? "não informado"}</p>
         <p>Procure a biblioteca para regularizar.</p>`,
      ),
      text: `Conta bloqueada. Motivo: ${record.block_reason}.`,
    });
  }
}

async function handleNotify(record: NotifyRow, old: NotifyRow | null) {
  // Disparou aviso: status mudou pra 'notified'
  if (record.status !== "notified" || old?.status === "notified") return;

  const [profile, library, book] = await Promise.all([
    getProfile(record.user_id),
    getLibrary(record.library_id),
    getBook(record.book_id),
  ]);
  if (!profile?.email || !library || !book) return;

  const link = `${FRONTEND_URL}/${library.slug}/livros/${book.id}`;
  await sendEmail({
    to: profile.email,
    subject: `"${book.title}" disponível — corra reservar`,
    html: shell(
      "Seu livro está disponível!",
      `<p>Olá ${profile.name ?? ""},</p>
       <p>O livro que você queria voltou pra estante:</p>
       <p style="background:#f0ebd9;padding:16px;border-radius:8px;margin:16px 0">
         <strong style="font-family:'Playfair Display',serif;font-size:18px;color:#0e3b2c">${book.title}</strong><br>
         <span style="color:#6b7280">${book.author}</span>
       </p>
       <p>Reserve já — você tem 24 horas pra retirar na biblioteca depois de reservado.</p>
       <p style="margin:24px 0">
         <a href="${link}" style="background:#0e3b2c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
           Reservar agora
         </a>
       </p>`,
    ),
    text: `O livro "${book.title}" está disponível. Reserve em: ${link}`,
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = (await req.json()) as WebhookPayload;

    if (payload.table === "library_memberships" && payload.type === "UPDATE") {
      await handleMembership(
        payload.record as unknown as MembershipRow,
        payload.old_record as unknown as MembershipRow | null,
      );
    } else if (payload.table === "notify_requests" && payload.type === "UPDATE") {
      await handleNotify(
        payload.record as unknown as NotifyRow,
        payload.old_record as unknown as NotifyRow | null,
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

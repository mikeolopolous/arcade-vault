"use server";

import { Resend } from "resend";
import {
  HONEYPOT_FIELD,
  validateContact,
  type ContactState,
} from "@/lib/contact";

const DEFAULT_FROM = "Arcade Vault <onboarding@resend.dev>";
const SEND_ERROR = "[ERR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = readString(formData, "name");
  const email = readString(formData, "email");
  const msg = readString(formData, "msg");

  // Honeypot relleno → éxito falso, sin llamar a Resend.
  if (readString(formData, HONEYPOT_FIELD).trim()) {
    return { status: "success", name: name.trim() };
  }

  const result = validateContact({ name, email, msg });
  if (!result.ok) {
    return { status: "error", message: `[ERR] REVISA LOS CAMPOS: ${result.reason}` };
  }
  const data = result.data;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  // `||` y no `??`: una variable vacía en .env cuenta como ausente.
  const from = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM;

  if (!apiKey || !to) {
    const missing = [!apiKey && "RESEND_API_KEY", !to && "CONTACT_TO_EMAIL"]
      .filter(Boolean)
      .join(", ");
    console.error(`[contacto] Faltan variables de entorno: ${missing}`);
    return { status: "error", message: SEND_ERROR };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: data.email,
      // El nombre va en una cabecera: se colapsan saltos de línea y espacios.
      subject: `[Arcade Vault] Mensaje de ${data.name.replace(/\s+/g, " ")}`,
      text: `Nombre: ${data.name}\n\nCorreo: ${data.email}\n\nMensaje:\n${data.msg}\n`,
    });

    if (error) {
      console.error(`[contacto] Resend devolvió un error (${error.name}): ${error.message}`);
      return { status: "error", message: SEND_ERROR };
    }
  } catch (err) {
    console.error("[contacto] Excepción al enviar con Resend:", err);
    return { status: "error", message: SEND_ERROR };
  }

  return { status: "success", name: data.name };
}

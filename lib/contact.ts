// Tipos y validación del formulario de contacto (SPEC 03).
// Sin "use server": lo importan tanto el cliente como la Server Action.

export type ContactField = "name" | "email" | "msg";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string } // nombre ya recortado
  | { status: "error"; message: string }; // texto para la línea [ERR]

export const CONTACT_LIMITS = {
  name: { max: 80 },
  email: { max: 254 },
  msg: { min: 10, max: 2000 },
} as const;

export const HONEYPOT_FIELD = "website";

export type ContactInput = Record<ContactField, string>;

export type ContactValidation =
  | { ok: true; data: ContactInput }
  | { ok: false; field: ContactField; reason: string };

// Formato simple `algo@algo.algo`, sin espacios.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Recorta los tres campos y devuelve los datos limpios o el motivo del
 * primer campo inválido (orden: nombre, correo, mensaje).
 */
export function validateContact(input: ContactInput): ContactValidation {
  const data: ContactInput = {
    name: input.name.trim(),
    email: input.email.trim(),
    msg: input.msg.trim(),
  };

  if (!data.name) {
    return { ok: false, field: "name", reason: "EL NOMBRE ES OBLIGATORIO" };
  }
  if (data.name.length > CONTACT_LIMITS.name.max) {
    return {
      ok: false,
      field: "name",
      reason: `EL NOMBRE ADMITE COMO MÁXIMO ${CONTACT_LIMITS.name.max} CARACTERES`,
    };
  }

  if (!data.email) {
    return { ok: false, field: "email", reason: "EL CORREO ES OBLIGATORIO" };
  }
  if (data.email.length > CONTACT_LIMITS.email.max) {
    return {
      ok: false,
      field: "email",
      reason: `EL CORREO ADMITE COMO MÁXIMO ${CONTACT_LIMITS.email.max} CARACTERES`,
    };
  }
  if (!EMAIL_RE.test(data.email)) {
    return { ok: false, field: "email", reason: "EL CORREO NO TIENE UN FORMATO VÁLIDO" };
  }

  if (data.msg.length < CONTACT_LIMITS.msg.min) {
    return {
      ok: false,
      field: "msg",
      reason: `EL MENSAJE NECESITA AL MENOS ${CONTACT_LIMITS.msg.min} CARACTERES`,
    };
  }
  if (data.msg.length > CONTACT_LIMITS.msg.max) {
    return {
      ok: false,
      field: "msg",
      reason: `EL MENSAJE ADMITE COMO MÁXIMO ${CONTACT_LIMITS.msg.max} CARACTERES`,
    };
  }

  return { ok: true, data };
}

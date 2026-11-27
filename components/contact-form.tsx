"use client";

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { sendContact } from "@/app/acerca/actions";
import { HONEYPOT_FIELD, type ContactState } from "@/lib/contact";
import { useSession } from "@/lib/session";

type ContactValues = { name: string; email: string; msg: string };
// `name: null` = el usuario aún no ha tocado el campo (se muestra el de la sesión).
type ContactDraft = Omit<ContactValues, "name"> & { name: string | null };

const EMPTY: ContactDraft = { name: null, email: "", msg: "" };
const CLEARED: ContactDraft = { name: "", email: "", msg: "" };
const INITIAL_STATE: ContactState = { status: "idle" };
const SHAKE_MS = 400;

// Fuera de la vista, pero no `display: none`: algunos bots ignoran esos campos.
const HONEYPOT_STYLE = {
  position: "absolute",
  left: "-10000px",
  top: "auto",
  width: 1,
  height: 1,
  overflow: "hidden",
} as const;

export function ContactForm() {
  const { user } = useSession();
  const id = useId();
  const [draft, setDraft] = useState<ContactDraft>(EMPTY);
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Estado de éxito que el usuario ya cerró con "ENVIAR OTRO MENSAJE".
  const [dismissed, setDismissed] = useState<ContactState | null>(null);

  // Prefill derivado, sin efecto: `useSession` devuelve `null` en el servidor y
  // en la hidratación, así que no hay desajuste; al leer localStorage aparece el
  // nombre. Solo se usa mientras el usuario no haya escrito en el campo.
  const form: ContactValues = { ...draft, name: draft.name ?? user?.name ?? "" };

  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    },
    [],
  );

  const triggerShake = () => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShake(true);
    shakeTimer.current = setTimeout(() => setShake(false), SHAKE_MS);
  };

  // Se envuelve `sendContact` solo para sacudir el formulario cuando el
  // servidor responde con error (sin setState dentro de un efecto).
  const [state, formAction, pending] = useActionState(
    async (prev: ContactState, formData: FormData): Promise<ContactState> => {
      const next = await sendContact(prev, formData);
      if (next.status === "error") triggerShake();
      return next;
    },
    INITIAL_STATE,
  );

  const update = (field: keyof ContactValues) =>
    (e: { target: { value: string } }) =>
      setDraft((d) => ({ ...d, [field]: e.target.value }));

  // Validación de vacíos en cliente: si falta algo, no se llama a la acción.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      e.preventDefault();
      triggerShake();
    }
  };

  const sentName =
    state.status === "success" && state !== dismissed ? state.name : null;

  const sendAnother = () => {
    setDismissed(state);
    setDraft(CLEARED);
  };

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      action={formAction}
      onSubmit={onSubmit}
      aria-busy={pending}
    >
      {sentName === null ? (
        <>
          <div className="field">
            <label htmlFor={`${id}-name`}>NOMBRE</label>
            <input
              id={`${id}-name`}
              name="name"
              value={form.name}
              onChange={update("name")}
              placeholder="px_kai"
              autoComplete="name"
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor={`${id}-email`}>CORREO ELECTRÓNICO</label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="jugador@vault.gg"
              autoComplete="email"
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor={`${id}-msg`}>MENSAJE</label>
            <textarea
              id={`${id}-msg`}
              name="msg"
              rows={5}
              value={form.msg}
              onChange={update("msg")}
              placeholder="Cuéntanos qué tienes en mente…"
              disabled={pending}
            />
          </div>

          <div style={HONEYPOT_STYLE} aria-hidden="true">
            <label htmlFor={`${id}-${HONEYPOT_FIELD}`}>Sitio web</label>
            <input
              id={`${id}-${HONEYPOT_FIELD}`}
              name={HONEYPOT_FIELD}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>

          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={pending}
          >
            {pending ? "▶ TRANSMITIENDO…" : "▶  ENVIAR MENSAJE"}
          </button>

          {state.status === "error" && !pending && (
            <p className="form-error" role="alert">
              {state.message}
            </p>
          )}
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body" role="status">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
              {sentName.toUpperCase()}.<span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={sendAnother}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

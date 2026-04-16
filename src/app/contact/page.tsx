"use client";

import { useActionState, useRef } from "react";
import { submitContactForm, type ContactFormState } from "./actions";
import styles from "./page.module.css";

const INQUIRY_OPTIONS = [
  { value: "", label: "Select one…" },
  { value: "Consulting inquiry", label: "Consulting inquiry" },
  { value: "Platform question", label: "Platform question" },
  { value: "General question", label: "General question" },
];

const initialState: ContactFormState = { status: "idle" };

export default function ContactPage() {
  const [state, action, pending] = useActionState(submitContactForm, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className={styles.wrap}>
      <div className={styles.layout}>

        {/* ── LEFT: intro copy ── */}
        <div className={styles.intro}>
          <span className={styles.eyebrow}>Contact</span>
          <h1 className={styles.title}>Get in touch</h1>
          <p className={styles.body}>
            Whether you have a question about the platform, want to explore
            consulting services, or just aren&apos;t sure where to start —
            send a message and we&apos;ll get back to you.
          </p>
          <p className={styles.body}>
            No sales process. No automated follow-up sequence. A real response
            from someone who can actually help.
          </p>
          <div className={styles.directContact}>
            <span className={styles.directLabel}>Or email directly</span>
            <a href="mailto:info@fulcral.org" className={styles.directEmail}>
              info@fulcral.org
            </a>
          </div>
        </div>

        {/* ── RIGHT: form ── */}
        <div className={styles.formWrap}>
          {state.status === "success" ? (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.successTitle}>Message received</h2>
              <p className={styles.successBody}>
                We&apos;ll get back to you shortly. If your question is urgent,
                you can also reach us at{" "}
                <a href="mailto:info@fulcral.org">info@fulcral.org</a>.
              </p>
            </div>
          ) : (
            <form ref={formRef} action={action} className={styles.form}>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="name" className={styles.label}>
                    Name <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    className={styles.input}
                    placeholder="Your name"
                    disabled={pending}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="email" className={styles.label}>
                    Email <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={styles.input}
                    placeholder="you@yourfirm.com"
                    disabled={pending}
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="firmName" className={styles.label}>
                    Firm or company{" "}
                    <span className={styles.optional}>(optional)</span>
                  </label>
                  <input
                    id="firmName"
                    name="firmName"
                    type="text"
                    autoComplete="organization"
                    className={styles.input}
                    placeholder="Acme Law Group"
                    disabled={pending}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="inquiryType" className={styles.label}>
                    What is this about?{" "}
                    <span className={styles.optional}>(optional)</span>
                  </label>
                  <select
                    id="inquiryType"
                    name="inquiryType"
                    className={styles.select}
                    disabled={pending}
                    defaultValue=""
                  >
                    {INQUIRY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="message" className={styles.label}>
                  Message <span className={styles.required}>*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  className={styles.textarea}
                  placeholder="Tell us where you are and what you're trying to solve."
                  disabled={pending}
                />
              </div>

              {state.status === "error" && (
                <p className={styles.errorMsg}>{state.message}</p>
              )}

              <button
                type="submit"
                className={styles.submit}
                disabled={pending}
              >
                {pending ? "Sending…" : "Send message"}
              </button>

            </form>
          )}
        </div>

      </div>
      <p className={styles.fallback}>
        Form not working?{" "}
        <a href="mailto:info@fulcral.org">Email us directly at info@fulcral.org</a>
      </p>
    </div>
  );
}

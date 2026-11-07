import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./components";
import { api, setCsrf } from "./api";
import "./assistant.css";

const suggestions = [
  "Cách tạo link hoàn tiền",
  "Theo dõi đơn hàng ở đâu?",
  "Cách dùng ví demo",
];
export function Assistant({ appPage }) {
  const [open, setOpen] = useState(false),
    [access, setAccess] = useState(null),
    [statusError, setStatusError] = useState("");
  const [turns, setTurns] = useState([]),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const launcher = useRef(null),
    panel = useRef(null),
    input = useRef(null),
    log = useRef(null),
    request = useRef(null),
    sequence = useRef(0);
  const clear = () => {
    sequence.current++;
    request.current?.abort();
    setTurns([]);
    setDraft("");
    setError("");
    setBusy(false);
  };
  useEffect(() => {
    const changed = (event) => {
      clear();
      setAccess((value) =>
        value
          ? {
              ...value,
              authenticated:
                event.type === "la:unauthorized"
                  ? false
                  : event.detail.authenticated,
            }
          : value,
      );
    };
    window.addEventListener("la:session-changed", changed);
    window.addEventListener("la:unauthorized", changed);
    return () => {
      window.removeEventListener("la:session-changed", changed);
      window.removeEventListener("la:unauthorized", changed);
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setAccess(null);
    setStatusError("");
    api("/assistant/status", { signal: controller.signal })
      .then((value) => {
        setCsrf(value.csrf);
        setAccess(value);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setStatusError(err.message);
      });
    const outsideFocus = (event) => {
      if (
        !panel.current?.contains(event.target) &&
        !launcher.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("focusin", outsideFocus);
    const escape = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) close();
    };
    window.addEventListener("keydown", escape);
    panel.current?.focus();
    return () => {
      controller.abort();
      document.removeEventListener("focusin", outsideFocus);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);
  useEffect(() => {
    if (open && access?.authenticated && access.configured)
      input.current?.focus();
  }, [access, open]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [turns, busy, error, open]);
  const close = () => {
    setOpen(false);
    launcher.current?.focus();
  };
  async function send(question = draft) {
    question = question.trim();
    if (
      !question ||
      question.length > 1500 ||
      busy ||
      !access?.authenticated ||
      !access.configured
    )
      return;
    const context = turns.slice(-10);
    while (context.reduce((sum, item) => sum + item.text.length, 0) > 8000)
      context.splice(0, 2);
    const messages = [...context, { role: "user", text: question }];
    const before = turns;
    setTurns([...turns, { role: "user", text: question }]);
    setDraft("");
    setBusy(true);
    setError("");
    const current = ++sequence.current;
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await api("/assistant/chat", {
        method: "POST",
        body: { messages },
        signal: controller.signal,
      });
      if (current === sequence.current)
        setTurns((value) =>
          [...value, { role: "model", text: result.text }].slice(-30),
        );
    } catch (err) {
      if (current === sequence.current && err.name !== "AbortError") {
        setTurns(before);
        setDraft((value) => value || question);
        setError(err.message);
      }
    } finally {
      if (current === sequence.current) {
        setBusy(false);
        input.current?.focus();
      }
    }
  }
  return (
    <div className="la-assistant" data-app={appPage}>
      {open && (
        <section
          ref={panel}
          tabIndex={-1}
          className="assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Trò chuyện với Lá AI"
          id="la-ai-panel"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <header className="assistant-header">
            <span className="assistant-mark">
              <Icon name="leaf" size={24} />
            </span>
            <div>
              <h2>Lá AI</h2>
              <p>Trợ lý hướng dẫn của bạn</p>
            </div>
            <button
              type="button"
              className="assistant-icon"
              aria-label="Bắt đầu cuộc trò chuyện mới"
              onClick={() => {
                clear();
                input.current?.focus();
              }}
              disabled={!turns.length && !busy}
            >
              <Icon name="refresh" size={18} />
            </button>
            <button
              type="button"
              className="assistant-icon"
              aria-label="Thu gọn Lá AI"
              onClick={close}
            >
              <Icon name="close" />
            </button>
          </header>
          <div
            className="assistant-messages"
            ref={log}
            role="log"
            aria-label="Nội dung trò chuyện"
            aria-live="polite"
            aria-relevant="additions text"
          >
            <div className="assistant-welcome">
              <Icon name="leaf" size={28} />
              <h3>Bạn cần Lá giúp gì?</h3>
              <p>Hỏi cách tạo link, theo dõi đơn hoặc dùng ví trong bản demo</p>
            </div>
            {!access && !statusError && (
              <p role="status" className="assistant-note">
                Đang kết nối trợ lý…
              </p>
            )}
            {statusError && (
              <div role="alert" className="assistant-error">
                {statusError}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    launcher.current?.focus();
                  }}
                >
                  Đóng và thử lại
                </button>
              </div>
            )}
            {access && !access.configured && (
              <p className="assistant-note">
                Lá AI chưa sẵn sàng. Bạn có thể xem{" "}
                <a href="/app#faq" onClick={close}>
                  Hỏi đáp
                </a>{" "}
                trong lúc chờ kết nối.
              </p>
            )}
            {access?.configured && !access.authenticated && (
              <div className="assistant-signin">
                <p>Đăng nhập tài khoản Lá để bắt đầu trò chuyện</p>
                <a href="/app#links" onClick={close}>
                  Mở ứng dụng và đăng nhập <Icon name="arrow" size={16} />
                </a>
              </div>
            )}
            {access?.configured && access.authenticated && !turns.length && (
              <div className="assistant-suggestions">
                {suggestions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    disabled={busy}
                    onClick={() => send(question)}
                  >
                    {question}
                    <Icon name="arrow" size={16} />
                  </button>
                ))}
              </div>
            )}
            {turns.map((message, i) => (
              <article key={i} className={`assistant-message ${message.role}`}>
                <span>{message.role === "user" ? "Bạn" : "Lá AI"}</span>
                <p>{message.text}</p>
              </article>
            ))}
            {busy && (
              <p role="status" className="assistant-thinking">
                Lá đang soạn câu trả lời…
              </p>
            )}
            {error && (
              <p role="alert" className="assistant-error">
                {error}
              </p>
            )}
          </div>
          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label className="assistant-input-label" htmlFor="la-ai-question">
              Câu hỏi cho Lá AI
            </label>
            <div>
              <textarea
                ref={input}
                id="la-ai-question"
                rows={2}
                maxLength={1500}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Nhập câu hỏi của bạn…"
                disabled={!access?.configured || !access.authenticated}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              <button
                type="submit"
                aria-label="Gửi câu hỏi"
                disabled={
                  busy ||
                  !draft.trim() ||
                  !access?.configured ||
                  !access.authenticated
                }
              >
                <Icon name="arrow" size={21} />
              </button>
            </div>
            <p>
              Nội dung chat được gửi đến Gemini · AI có thể trả lời chưa chính
              xác
            </p>
          </form>
        </section>
      )}
      <button
        ref={launcher}
        type="button"
        className="assistant-launcher"
        aria-label={open ? "Thu gọn Lá AI" : "Mở trợ lý Lá AI"}
        aria-expanded={open}
        aria-controls={open ? "la-ai-panel" : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? "close" : "leaf"} size={25} />
        <span>Lá AI</span>
      </button>
    </div>
  );
}

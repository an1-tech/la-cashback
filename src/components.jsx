import React, { useEffect, useRef, useState } from "react";
import { api, statusLabels } from "./api";
export function Icon({ name, size = 20, ...props }) {
  const paths = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
      </>
    ),
    bag: (
      <>
        <path d="M5 7h14l2 14H3L5 7Z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </>
    ),
    gift: (
      <>
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M5 12v9h14v-9M12 8v13" />
        <path d="M12 8C2 8 6 0 10 4l2 4c10 0 6-8 2-4l-2 4Z" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M3 8V5a2 2 0 0 1 2-2h12M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
    external: (
      <>
        <path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
      </>
    ),
    link: (
      <>
        <path d="m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    shield: (
      <>
        <path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
    moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />,
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 8a3 3 0 1 1 4 3c-1 0-1 2-1 3m0 3v.1" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    copy: (
      <>
        <rect x="8" y="8" width="13" height="13" rx="2" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15 15 6 6" />
      </>
    ),
    bookmark: <path d="M5 3h14v19l-7-5-7 5Z" />,
    logout: (
      <>
        <path d="M9 3H3v18h6m7-15 6 6-6 6m-9-6h15" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    leaf: (
      <>
        <path d="M4 18C0 3 14 2 21 3c0 14-8 19-17 15Zm0 3L16 8" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10v.1" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7V2l-4 4a8 8 0 1 0 4 10M20 2h-5" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="12" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.info}
    </svg>
  );
}
export function Badge({ status, children }) {
  return (
    <span className={"badge " + (status || "")}>
      {children || statusLabels[status] || status}
    </span>
  );
}
export function Empty({ title = "Chưa có dữ liệu", children, icon = "bag" }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={30} />
      </span>
      <h3>{title}</h3>
      <p>{children || "Dữ liệu sẽ hiển thị ở đây khi được ghi nhận."}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Đang tải dữ liệu…
    </div>
  );
}
export function useData(path, version) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: !s.data, error: "" }));
    api(path)
      .then((data) => alive && setState({ loading: false, data, error: "" }))
      .catch(
        (error) =>
          alive &&
          setState({ loading: false, data: null, error: error.message }),
      );
    return () => {
      alive = false;
    };
  }, [path, version]);
  return state;
}
export function DataState({ state, children }) {
  if (state.loading) return <Loading />;
  if (state.error)
    return (
      <div className="alert error" role="alert">
        {state.error}
      </div>
    );
  return children(state.data);
}
export function Form({
  onSubmit,
  children,
  submitLabel = "Lưu thay đổi",
  className = "",
  initial = {},
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  return (
    <form
      className={"form " + className}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = e.currentTarget;
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          await onSubmit(
            { ...initial, ...Object.fromEntries(new FormData(form)) },
            form,
          );
          setSuccess("Thao tác thành công.");
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        {children}
        {error && (
          <div role="alert" className="alert error">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="alert success">
            {success}
          </div>
        )}
        <button className="button primary" type="submit">
          {busy ? (
            <>
              <span className="spinner" />
              Đang xử lý…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </fieldset>
    </form>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function DealArt({ type = 0 }) {
  return (
    <svg className="deal-art" viewBox="0 0 300 160" aria-hidden="true">
      <ellipse
        cx="155"
        cy="137"
        rx="66"
        ry="9"
        fill="currentColor"
        opacity=".10"
      />
      {type % 4 === 0 ? (
        <g>
          <path
            d="M90 66h117v10H90zM105 76l-10 61m98-61 12 61"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
          />
          <rect
            x="116"
            y="29"
            width="63"
            height="38"
            rx="5"
            fill="currentColor"
            opacity=".75"
          />
          <path d="M147 67v10m-16 0h33" stroke="currentColor" strokeWidth="4" />
          <path
            d="M203 67V37m0 0-12 10m12-10 12 10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <rect
            x="192"
            y="63"
            width="24"
            height="10"
            rx="3"
            fill="currentColor"
          />
        </g>
      ) : type % 4 === 1 ? (
        <g>
          <rect
            x="91"
            y="54"
            width="52"
            height="82"
            rx="9"
            fill="currentColor"
            opacity=".65"
          />
          <rect
            x="101"
            y="36"
            width="32"
            height="20"
            rx="3"
            fill="currentColor"
          />
          <rect
            x="101"
            y="79"
            width="32"
            height="29"
            rx="2"
            fill="#fff"
            opacity=".6"
          />
          <path d="M165 55h44l-5 79h-34Z" fill="currentColor" opacity=".85" />
          <rect
            x="173"
            y="134"
            width="29"
            height="6"
            rx="2"
            fill="currentColor"
          />
          <path
            d="M177 80h21m-21 7h15"
            stroke="#fff"
            opacity=".6"
            strokeWidth="2"
          />
        </g>
      ) : type % 4 === 2 ? (
        <g transform="translate(100 22)">
          <path
            d="M6 70V48a44 44 0 0 1 88 0v22"
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
          />
          <path
            d="M7 67V45a43 43 0 0 1 86 0v22"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            opacity=".35"
          />
          <rect
            x="-3"
            y="59"
            width="28"
            height="48"
            rx="12"
            fill="currentColor"
          />
          <rect
            x="75"
            y="59"
            width="28"
            height="48"
            rx="12"
            fill="currentColor"
          />
          <path
            d="M2 71v23m96-23v23"
            stroke="#fff"
            opacity=".25"
            strokeWidth="4"
          />
        </g>
      ) : (
        <g>
          <path
            d="m116 36 25-9h20l25 9 21 30-21 13-10-15v72h-50V64l-10 15-21-13Z"
            fill="currentColor"
            opacity=".8"
          />
          <path
            d="M141 28c1 19 18 19 20 0m-33 86h45"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            opacity=".35"
          />
        </g>
      )}
    </svg>
  );
}

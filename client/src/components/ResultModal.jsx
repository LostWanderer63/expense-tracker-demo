import { useEffect, useRef } from "react";

const VIEWS = {
  SUCCESSFUL: {
    icon: "✓",
    cls: "success",
    title: "Transaction successful",
    text: "You are now a premium member. Enjoy the premium features!",
  },
  FAILED: {
    icon: "✕",
    cls: "failed",
    title: "TRANSACTION FAILED",
    text: "Your payment could not be completed. Please try again.",
  },
  PENDING: {
    icon: "…",
    cls: "pending",
    title: "Payment pending",
    text: "We are waiting for confirmation from the bank. Check back in a few minutes.",
  },
};

export default function ResultModal({ status, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!status) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [status, onClose]);

  if (!status) return null;
  const view = VIEWS[status] || VIEWS.FAILED;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resultTitle"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className={`modal-icon ${view.cls}`}>{view.icon}</div>
        <h3 className="modal-title" id="resultTitle">
          {view.title}
        </h3>
        <p className="modal-text">{view.text}</p>
        <button className="btn" ref={closeRef} onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}

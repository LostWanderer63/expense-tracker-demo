import { useEffect, useRef, useState } from "react";
import { fetchJSON, errorMessage, isAbort } from "../api.js";
import { CATEGORIES, CATEGORY_STYLES } from "../format.js";

const SUGGEST_DELAY_MS = 600;
const SUGGEST_MIN_CHARS = 3;
const EMPTY = { amount: "", description: "", category: "", note: "" };

export default function ExpenseForm({ onAdded }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [aiHint, setAiHint] = useState({ text: "", state: "" });
  const amountRef = useRef(null);
  // Latest category, readable from async callbacks.
  const categoryRef = useRef(values.category);
  useEffect(() => {
    categoryRef.current = values.category;
  }, [values.category]);

  // AI suggestion bookkeeping (refs: they don't affect rendering).
  const suggest = useRef({
    timer: null,
    controller: null,
    lastFor: "",
    chosenByUser: false,
    available: true,
  });

  useEffect(() => {
    const s = suggest.current;
    return () => {
      clearTimeout(s.timer);
      if (s.controller) s.controller.abort();
    };
  }, []);

  function setField(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: "" }));
  }

  async function requestSuggestion(description) {
    const s = suggest.current;
    if (s.controller) s.controller.abort();
    const controller = new AbortController();
    s.controller = controller;
    setAiHint({ text: "✨ Suggesting a category...", state: "loading" });

    try {
      const { category } = await fetchJSON("/expense/suggest-category", {
        method: "POST",
        body: JSON.stringify({ description }),
        signal: controller.signal,
      });
      if (s.controller !== controller) return;
      s.lastFor = description;

      if (s.chosenByUser) {
        const current = categoryRef.current;
        setAiHint({ text: current === category ? "" : `✨ AI suggests ${category}`, state: "" });
        return;
      }
      setField("category", category);
      setAiHint({ text: `✨ ${category} suggested by AI — change it if needed`, state: "done" });
    } catch (err) {
      if (isAbort(err) || s.controller !== controller) return;
      if (/not configured/i.test(err.message)) s.available = false;
      setAiHint({ text: "", state: "" });
    } finally {
      if (s.controller === controller) s.controller = null;
    }
  }

  function handleDescription(value) {
    setField("description", value);
    const s = suggest.current;
    clearTimeout(s.timer);
    if (!s.available) return;
    const description = value.trim();
    if (description.length < SUGGEST_MIN_CHARS) {
      if (s.controller) s.controller.abort();
      setAiHint({ text: "", state: "" });
      return;
    }
    if (description === s.lastFor) return;
    s.timer = setTimeout(() => requestSuggestion(description), SUGGEST_DELAY_MS);
  }

  function handleCategory(value) {
    suggest.current.chosenByUser = true;
    setField("category", value);
    setAiHint({ text: "", state: "" });
  }

  function validate() {
    const amount = Number(values.amount);
    const description = values.description.trim();
    const next = {};
    if (!values.amount || !Number.isFinite(amount) || amount <= 0) next.amount = "Enter an amount greater than 0";
    if (!description) next.description = "Description is required";
    if (!values.category) next.category = "Choose a category";
    setErrors(next);
    return Object.keys(next).length
      ? null
      : { amount, description, category: values.category, note: values.note.trim() };
  }

  function resetSuggestion() {
    const s = suggest.current;
    clearTimeout(s.timer);
    if (s.controller) s.controller.abort();
    s.controller = null;
    s.lastFor = "";
    s.chosenByUser = false;
    setAiHint({ text: "", state: "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const data = validate();
    if (!data) return;

    setSubmitting(true);
    try {
      await fetchJSON("/expense", { method: "POST", body: JSON.stringify(data) });
      setValues(EMPTY);
      resetSuggestion();
      amountRef.current?.focus();
      onAdded();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card form-card">
      <h2 className="card-title">Add expense</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="amount">Amount spent</label>
          <div className="amount-wrap">
            <span className="amount-prefix">₹</span>
            <input
              ref={amountRef}
              type="number"
              id="amount"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              required
              className={errors.amount ? "invalid" : ""}
              value={values.amount}
              onChange={(e) => setField("amount", e.target.value)}
            />
          </div>
          <small className="error">{errors.amount}</small>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <input
            type="text"
            id="description"
            maxLength={255}
            placeholder="e.g. Lunch with team"
            required
            className={errors.description ? "invalid" : ""}
            value={values.description}
            onChange={(e) => handleDescription(e.target.value)}
          />
          <small className="error">{errors.description}</small>
        </div>

        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            required
            className={errors.category ? "invalid" : ""}
            value={values.category}
            onChange={(e) => handleCategory(e.target.value)}
          >
            <option value="" disabled>
              Select a category
            </option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_STYLES[cat].icon} {cat}
              </option>
            ))}
          </select>
          {aiHint.text && (
            <small className={`ai-hint ${aiHint.state}`.trim()} aria-live="polite">
              {aiHint.text}
            </small>
          )}
          <small className="error">{errors.category}</small>
        </div>

        <div className="field">
          <label htmlFor="note">
            Note <span className="optional">(optional)</span>
          </label>
          <input
            type="text"
            id="note"
            maxLength={255}
            placeholder="e.g. Paid by card"
            value={values.note}
            onChange={(e) => setField("note", e.target.value)}
          />
          <small className="error">{errors.note}</small>
        </div>

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Adding..." : "Add expense"}
        </button>
        <p className={`form-message${formError ? " error-msg" : ""}`} role="status" aria-live="polite">
          {formError}
        </p>
      </form>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";

export default function useToast() {
  const [toast, setToast] = useState({ text: "", type: "success", show: false });
  const timer = useRef(null);

  const show = useCallback((text, type = "success") => {
    setToast({ text, type, show: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2500);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [toast, show];
}

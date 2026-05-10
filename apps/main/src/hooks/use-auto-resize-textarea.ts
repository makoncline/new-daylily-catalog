import { useEffect, useRef } from "react";

export function useAutoResizeTextArea() {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = () => {
    const textarea = textAreaRef.current;
    if (textarea) {
      const scrollHeight = textarea.scrollHeight;
      textarea.style.cssText += `;height:${scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, []);

  return { textAreaRef, adjustHeight };
}

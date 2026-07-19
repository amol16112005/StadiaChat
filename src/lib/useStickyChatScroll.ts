"use client";

import { useCallback, useEffect, useRef } from "react";

const NEAR_BOTTOM_PX = 120;

/**
 * Auto-scroll only when the user is already near the bottom (or after an explicit pin).
 * Prevents poll/refresh from yanking the viewport while reading history.
 */
export function useStickyChatScroll(messageCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const pinNextRef = useRef(false);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_PX;
  }, []);

  /** Call after the user sends a message so we jump to latest. */
  const pinToBottom = useCallback(() => {
    pinNextRef.current = true;
    stickToBottomRef.current = true;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    if (!pinNextRef.current && !stickToBottomRef.current) return;
    pinNextRef.current = false;
    // instant on first paint / when pinned by send; smooth for live arrivals while stuck
    scrollToBottom("smooth");
  }, [messageCount, scrollToBottom]);

  return { containerRef, bottomRef, onScroll, pinToBottom, scrollToBottom };
}

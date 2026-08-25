"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, MessageSquareWarning, Wallet, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/formatting/relative-time";
import type { Notification, NotificationType } from "@/types/notification";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification-api";

// Polling the (cheap, index-backed) unread-count endpoint every 30s is
// the only continuous network activity this component causes — the full
// list is fetched once, on demand, the first time the panel is opened,
// and polling pauses entirely while the tab isn't visible. That's the
// whole performance budget for "real-time-ish" without websockets/SSE.
const POLL_INTERVAL_MS = 30_000;

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  MITRA_TOPUP_REQUESTED: Wallet,
  MITRA_COMPLAINT: MessageSquareWarning,
  RECONCILIATION_ISSUE: AlertTriangle,
  MIDTRANS_TOPUP_FAILED: XCircle,
};

// Where clicking a notification should take the admin — omitted types
// (MITRA_COMPLAINT) have no dedicated page yet, so clicking just marks
// them read in place; the full complaint text is already in the body.
const TYPE_LINK: Partial<Record<NotificationType, string>> = {
  MITRA_TOPUP_REQUESTED: "/dashboard/super-admin/wallets?tab=topup",
  MIDTRANS_TOPUP_FAILED: "/dashboard/super-admin/wallets?tab=topup",
  RECONCILIATION_ISSUE: "/dashboard/super-admin/reconciliation",
};

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const controller = new AbortController();

    async function fetchCount() {
      try {
        const { count } = await getUnreadCount(controller.signal);
        setUnreadCount(count);
      } catch {
        // A failed poll just tries again next interval — not worth
        // surfacing an error for a background badge count.
      }
    }

    function start() {
      fetchCount();
      intervalId = setInterval(fetchCount, POLL_INTERVAL_MS);
    }
    function stop() {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") start();
      else stop();
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      controller.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const loadList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const result = await getNotifications();
      setNotifications(result.notifications);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && notifications === null) {
      loadList();
    }
  }

  async function handleMarkRead(id: string) {
    setNotifications((prev) => prev?.map((item) => (item.id === id ? { ...item, is_read: true } : item)) ?? prev);
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch {
      // Best-effort — the next poll/panel-open reconciles the real state.
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev?.map((item) => ({ ...item, is_read: true })) ?? prev);
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      // Best-effort, same as above.
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifikasi"
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        // Anchored to the viewport corner (fixed), not the bell button
        // (absolute) — the button isn't flush against the screen edge
        // (the logout icon and header padding sit to its right on
        // mobile), so a width nearly as wide as the viewport anchored off
        // the button's own edge pushed the panel's left side off-screen.
        // Fixed positioning with a matching left/right margin keeps it
        // centered in the safe width regardless of where the button sits.
        <div className="fixed top-14 right-4 left-4 z-50 mx-auto flex max-h-[70vh] w-auto max-w-sm flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg sm:left-auto">
          <div className="flex shrink-0 items-center justify-between border-b p-3">
            <p className="text-sm font-semibold">Notifikasi</p>
            {unreadCount > 0 ? (
              <button type="button" onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                Tandai semua dibaca
              </button>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingList ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Memuat...</p>
            ) : !notifications || notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Tidak ada notifikasi</p>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onOpen={() => setOpen(false)}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationItem({
  notification,
  onOpen,
  onMarkRead,
}: {
  notification: Notification;
  onOpen: () => void;
  onMarkRead: (id: string) => void;
}) {
  const Icon = TYPE_ICON[notification.type];
  const href = TYPE_LINK[notification.type];

  const content = (
    <div className={cn("flex gap-3 border-b p-3 text-sm last:border-b-0", !notification.is_read && "bg-accent/50")}>
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{notification.title}</p>
        {notification.body ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(notification.created_at)}</p>
      </div>
      {!notification.is_read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /> : null}
    </div>
  );

  if (href) {
    return (
      <li>
        <Link
          href={href}
          onClick={() => {
            onOpen();
            if (!notification.is_read) onMarkRead(notification.id);
          }}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        className="w-full text-left"
        onClick={() => !notification.is_read && onMarkRead(notification.id)}
      >
        {content}
      </button>
    </li>
  );
}

"use client";

import { useState } from "react";
import { useApi, useMutate } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { Bell, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtRelative } from "@/lib/preship";
import { toast } from "sonner";

type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  linkView: string | null;
  linkId: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useApi<{ notifications: NotificationItem[]; unreadCount: number }>(
    "/api/notifications"
  );
  const mutate = useMutate();
  const navigate = usePreship((s) => s.navigate);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markAllRead = async () => {
    await mutate("/api/notifications/read", { method: "POST", body: {} });
    toast.success("All marked read →");
  };

  const markOneRead = async (id: string) => {
    await mutate("/api/notifications/read", { method: "POST", body: { id } });
  };

  const deleteOne = async (id: string) => {
    await mutate(`/api/notifications/${id}`, { method: "DELETE" });
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.read) markOneRead(n.id);
    if (n.linkView) {
      const view = n.linkView as Parameters<typeof navigate>[0]["view"];
      const link = { view } as Parameters<typeof navigate>[0];
      if (n.linkView === "war-room" && n.linkId) link.postId = n.linkId;
      if (n.linkView === "synergy" && n.linkId) link.synergyId = n.linkId;
      if (n.linkView === "idealab" && n.linkId) link.sessionId = n.linkId;
      if (n.linkView === "profile" && n.linkId) link.founderId = n.linkId;
      navigate(link);
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="tactile-flat relative flex h-9 items-center gap-1.5 rounded-md px-2.5 font-mono text-xs uppercase tracking-widest text-[#0E1909]/65 hover:bg-[#0E1909]/5 hover:text-[#0E1909]"
        aria-label="Notifications"
      >
        <Bell size={15} className="transition-transform duration-150 hover:scale-110" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DAFF01] px-1 font-mono text-[9px] font-bold text-[#0E1909] ring-1 ring-[#0E1909]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-[#0E1909]/15 bg-white shadow-[0_8px_24px_rgba(14,25,9,0.12)]">
            {/* header */}
            <div className="flex items-center justify-between border-b border-[#0E1909]/8 bg-[#f8f9f3] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-[#0E1909]/60" />
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/70">
                  notifications
                </span>
                {unreadCount > 0 && (
                  <span className="rounded bg-[#DAFF01] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#0E1909]">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="tactile-flat flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/55 hover:text-[#0E1909]"
                >
                  <Check size={11} /> mark all read
                </button>
              )}
            </div>

            {/* list */}
            <div className="max-h-96 overflow-y-auto scroll-thin">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={22} className="mx-auto text-[#0E1909]/15" />
                  <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[#0E1909]/35">
                    no notifications yet
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#0E1909]/6">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={cn(
                        "group relative cursor-pointer px-4 py-3 transition-colors hover:bg-[#f8f9f3]",
                        !n.read && "bg-[#f4ffd6]/40"
                      )}
                      onClick={() => handleClick(n)}
                    >
                      <div className="flex items-start gap-2.5">
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#DAFF01]" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={cn("font-display text-[13px] text-[#0E1909]", !n.read && "font-semibold")}>
                            {n.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-[#0E1909]/60">{n.body}</p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/35">
                            {fmtRelative(n.createdAt)} ago · {n.kind.replace("-", " ")}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteOne(n.id);
                          }}
                          className="shrink-0 rounded p-1 text-[#0E1909]/20 opacity-0 transition hover:text-[#e0463c] group-hover:opacity-100"
                          aria-label="Delete notification"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

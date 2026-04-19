"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  Mail,
  MessageSquareReply,
  PenSquare,
  Search,
  ShieldCheck,
  Users,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DriverMessageWithRelations } from "@/types";

interface DriverOption {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  user?: { id: string } | null;
}

const LIVE_UPDATE_EVENT = "daylog:live-update";

interface MessageThreadSummary {
  driverId: string;
  driverName: string;
  phoneNumber: string | null;
  unreadCount: number;
  messageCount: number;
  lastMessageId: string;
  lastMessageAt: string;
  lastMessage: string;
  lastSubject: string | null;
  lastDirection: DriverMessageWithRelations["direction"];
  lastIsRead: boolean;
  lastSender: DriverMessageWithRelations["senderUser"];
}

function directionLabel(direction: DriverMessageWithRelations["direction"]) {
  return direction === "OFFICE_TO_DRIVER" ? "Ofis -> Sofor" : "Sofor -> Ofis";
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DriverMessageTable() {
  const [messages, setMessages] = useState<DriverMessageWithRelations[]>([]);
  const [threads, setThreads] = useState<MessageThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  // New message dialog
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [allDrivers, setAllDrivers] = useState<DriverOption[]>([]);
  const [newMsgDriverId, setNewMsgDriverId] = useState<"ALL" | string>("ALL");
  const [newMsgSubject, setNewMsgSubject] = useState("");
  const [newMsgBody, setNewMsgBody] = useState("");
  const [sendingNew, setSendingNew] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/driver-messages?take=500", { cache: "no-store" });
    if (!res.ok) {
      toast.error("Mesajlar yuklenemedi");
      setLoading(false);
      return;
    }

    const json = (await res.json()) as {
      messages?: DriverMessageWithRelations[];
      threads?: MessageThreadSummary[];
    };

    setMessages(json.messages ?? []);
    setThreads(json.threads ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!showNewMessage || allDrivers.length > 0) return;
    fetch("/api/drivers?take=200", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: { drivers?: DriverOption[] }) => setAllDrivers((json.drivers ?? []).filter((d) => d.user?.id)))
      .catch(() => toast.error("Soforler yuklenemedi"));
  }, [showNewMessage, allDrivers.length]);

  async function sendNewMessage() {
    if (!newMsgBody.trim()) { toast.error("Mesaj bos olamaz"); return; }
    const targets = newMsgDriverId === "ALL" ? allDrivers.map((d) => d.id) : [newMsgDriverId];
    if (targets.length === 0) { toast.error("En az bir sofor secin"); return; }
    setSendingNew(true);
    try {
      for (const id of targets) {
        const res = await fetch("/api/driver-messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverId: id, subject: newMsgSubject || "Ofis Mesaji", message: newMsgBody }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error((err as { error?: string }).error ?? "Gonderilemedi");
        }
      }
      toast.success(targets.length > 1 ? `Mesaj ${targets.length} soforee gonderildi` : "Mesaj gonderildi");
      setShowNewMessage(false);
      setNewMsgSubject("");
      setNewMsgBody("");
      setNewMsgDriverId("ALL");
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gonderilemedi");
    } finally {
      setSendingNew(false);
    }
  }

  useEffect(() => {
    const handleLiveUpdate = () => {
      if (!replyMessage.trim() && !submittingReply) {
        void fetchData();
      }
    };

    window.addEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate);
    return () => window.removeEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate);
  }, [fetchData, replyMessage, submittingReply]);

  // Auto-refresh every 30 seconds, paused while composing a reply
  useEffect(() => {
    const interval = setInterval(() => {
      if (!replyMessage.trim() && !submittingReply) {
        void fetchData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData, replyMessage, submittingReply]);

  const unreadCount = useMemo(
    () => messages.filter((item) => item.direction === "DRIVER_TO_OFFICE" && !item.isRead).length,
    [messages]
  );

  const visibleThreads = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("tr-TR");

    return threads.filter((thread) => {
      if (showUnreadOnly && thread.unreadCount === 0) return false;
      if (!query) return true;

      return [thread.driverName, thread.phoneNumber ?? "", thread.lastSubject ?? "", thread.lastMessage]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(query);
    });
  }, [searchTerm, showUnreadOnly, threads]);

  useEffect(() => {
    setSelectedDriverId((current) => {
      if (visibleThreads.length === 0) return "";
      if (current && visibleThreads.some((thread) => thread.driverId === current)) return current;
      return visibleThreads[0].driverId;
    });
  }, [visibleThreads]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.driverId === selectedDriverId) ?? null,
    [selectedDriverId, threads]
  );

  const threadMessages = useMemo(
    () =>
      messages
        .filter((message) => message.driverId === selectedDriverId)
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()),
    [messages, selectedDriverId]
  );

  useEffect(() => {
    if (!selectedThread) {
      setReplySubject("");
      return;
    }

    setReplySubject(selectedThread.lastSubject ? `Re: ${selectedThread.lastSubject}` : "Ofis Mesaji");
  }, [selectedThread?.driverId]);

  async function markRead(message: DriverMessageWithRelations) {
    if (message.isRead || message.direction !== "DRIVER_TO_OFFICE") return;
    try {
      setMarkingReadId(message.id);
      const res = await fetch(`/api/driver-messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Mesaj guncellenemedi");
      }
      toast.success("Mesaj okundu olarak isaretlendi");
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mesaj guncellenemedi");
    } finally {
      setMarkingReadId(null);
    }
  }

  async function submitReply() {
    if (!selectedThread) return;
    if (!replyMessage.trim()) {
      toast.error("Cevap mesaji bos olamaz");
      return;
    }

    try {
      setSubmittingReply(true);
      const res = await fetch("/api/driver-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: selectedThread.driverId,
          subject: replySubject,
          message: replyMessage,
          replyToMessageId:
            threadMessages
              .slice()
              .reverse()
              .find((message) => message.direction === "DRIVER_TO_OFFICE")?.id ?? undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Cevap gonderilemedi");
      }

      toast.success("Yanıt surucuye gonderildi");
      setReplyMessage("");
      setReplySubject(selectedThread.lastSubject ? `Re: ${selectedThread.lastSubject}` : "Ofis Mesaji");
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cevap gonderilemedi");
    } finally {
      setSubmittingReply(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={unreadCount > 0 ? `Mesajlar (${unreadCount} bekleyen)` : "Mesajlar"}
        description="Her sofor icin uygulama ve ofis mesajlari ayni ortak akista tutulur."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{threads.length} sofor</Badge>
            <Button
              variant={showUnreadOnly ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowUnreadOnly((current) => !current)}
            >
              <Mail className="mr-2 h-4 w-4" />
              {showUnreadOnly ? "Tum konusmalar" : "Sadece okunmamis"}
            </Button>
            <Button size="sm" onClick={() => setShowNewMessage(true)}>
              <PenSquare className="mr-2 h-4 w-4" />
              Yeni Mesaj
            </Button>
          </div>
        }
      />

      <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Mesaj Gonder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Alici</Label>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setNewMsgDriverId("ALL")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                    newMsgDriverId === "ALL"
                      ? "border-primary/50 bg-primary/10 text-primary font-medium"
                      : "border-border/60 hover:border-primary/30 hover:bg-muted/40"
                  )}
                >
                  <Users className="h-4 w-4" />
                  Tüm Ekip ({allDrivers.length > 0 ? allDrivers.length : "…"} sürücü)
                </button>
                <ScrollArea className="h-40 rounded-xl border border-border/60 p-2">
                  <div className="space-y-1">
                    {allDrivers.length === 0 && (
                      <p className="p-2 text-xs text-muted-foreground">Yukleniyor...</p>
                    )}
                    {allDrivers.map((driver) => (
                      <button
                        key={driver.id}
                        type="button"
                        onClick={() => setNewMsgDriverId(driver.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                          newMsgDriverId === driver.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-[10px] font-bold text-white">
                            {initialsFromName(driver.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate text-left">{driver.fullName}</span>
                        {driver.phoneNumber && (
                          <span className="text-xs text-muted-foreground">{driver.phoneNumber}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-subject">Konu</Label>
              <Input
                id="new-subject"
                value={newMsgSubject}
                onChange={(e) => setNewMsgSubject(e.target.value)}
                placeholder="Ofis Mesaji"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-body">Mesaj</Label>
              <Textarea
                id="new-body"
                value={newMsgBody}
                onChange={(e) => setNewMsgBody(e.target.value)}
                placeholder="Mesajinizi yazin..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMessage(false)}>Vazgec</Button>
            <Button onClick={() => void sendNewMessage()} disabled={sendingNew || !newMsgBody.trim()}>
              <MessageSquareReply className="mr-2 h-4 w-4" />
              {sendingNew ? "Gonderiliyor..." : newMsgDriverId === "ALL" ? `Tum Ekibe Gonder` : "Gonder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-muted-foreground">Yukleniyor...</p>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
          <Mail className="h-10 w-10" />
          <p>Henuz mesaj yok.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Card className="min-h-[620px] overflow-hidden">
            <CardContent className="flex h-full flex-col p-0">
              <div className="p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Sofor veya mesaj ara"
                    className="pl-9"
                  />
                </div>
              </div>
              <Separator />
              <ScrollArea className="flex-1">
                <div className="space-y-2 p-3">
                  {visibleThreads.length === 0 ? (
                    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center text-muted-foreground">
                      <UserRound className="h-8 w-8" />
                      <p>Filtreye uyan sofor konusmasi bulunamadi.</p>
                    </div>
                  ) : (
                    visibleThreads.map((thread) => {
                      const active = thread.driverId === selectedDriverId;

                      return (
                        <button
                          key={thread.driverId}
                          type="button"
                          onClick={() => setSelectedDriverId(thread.driverId)}
                          className={cn(
                            "w-full rounded-2xl border p-3 text-left transition-all",
                            active
                              ? "border-cyan-500/40 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                              : "border-border/70 bg-background/35 hover:border-cyan-500/20 hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-semibold text-white">
                                {initialsFromName(thread.driverName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {thread.driverName}
                                </p>
                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                  {formatDate(thread.lastMessageAt)}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {thread.phoneNumber ? (
                                  <span className="text-xs text-muted-foreground">{thread.phoneNumber}</span>
                                ) : null}
                                {thread.unreadCount > 0 ? (
                                  <Badge variant="success">{thread.unreadCount} yeni</Badge>
                                ) : (
                                  <Badge variant="secondary">Takipte</Badge>
                                )}
                              </div>
                              {thread.lastSubject ? (
                                <p className="truncate text-xs font-medium text-foreground/80">{thread.lastSubject}</p>
                              ) : null}
                              <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                                {thread.lastMessage}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="min-h-[620px] overflow-hidden">
            <CardContent className="flex h-full flex-col p-0">
              {!selectedThread ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <MessageSquareReply className="h-10 w-10" />
                  <p>Konusmayi acmak icin soldan bir sofor secin.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-semibold text-white">
                          {initialsFromName(selectedThread.driverName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{selectedThread.driverName}</h3>
                          {selectedThread.unreadCount > 0 ? (
                            <Badge variant="success">{selectedThread.unreadCount} bekleyen</Badge>
                          ) : (
                            <Badge variant="secondary">Guncel</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {selectedThread.phoneNumber ? <span>{selectedThread.phoneNumber}</span> : null}
                          <span>{selectedThread.messageCount} toplam mesaj</span>
                          <span>Son hareket: {formatDate(selectedThread.lastMessageAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Ortak thread</Badge>
                      <Badge variant="info">App kullanicisi ile bagli</Badge>
                    </div>
                  </div>

                  <Separator />

                  <ScrollArea className="flex-1 bg-background/20">
                    <div className="space-y-4 p-4">
                      {threadMessages.map((message) => {
                        const fromOffice = message.direction === "OFFICE_TO_DRIVER";

                        return (
                          <div
                            key={message.id}
                            className={cn("flex", fromOffice ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[85%] rounded-3xl border px-4 py-3 shadow-sm",
                                fromOffice
                                  ? "border-cyan-500/30 bg-cyan-500/10"
                                  : "border-border bg-background/60"
                              )}
                            >
                              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/80">{message.senderUser.name}</span>
                                <Badge variant={fromOffice ? "info" : "warning"}>
                                  {directionLabel(message.direction)}
                                </Badge>
                                <span>{formatDate(message.createdAt)}</span>
                                {message.direction === "DRIVER_TO_OFFICE" ? (
                                  <Badge variant={message.isRead ? "secondary" : "success"}>
                                    {message.isRead ? "Okundu" : "Bekliyor"}
                                  </Badge>
                                ) : (
                                  <Badge variant={message.isRead ? "secondary" : "outline"}>
                                    {message.isRead ? "Surucu okudu" : "Surucuya gitti"}
                                  </Badge>
                                )}
                              </div>

                              {message.subject ? (
                                <p className="mb-2 text-sm font-semibold text-foreground">{message.subject}</p>
                              ) : null}

                              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                                {message.message}
                              </p>

                              {message.direction === "DRIVER_TO_OFFICE" && !message.isRead ? (
                                <div className="mt-3 flex justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={markingReadId === message.id}
                                    onClick={() => void markRead(message)}
                                  >
                                    <CheckCheck className="mr-2 h-4 w-4" />
                                    Okundu olarak isle
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  <Separator />

                  <div className="space-y-3 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-cyan-400" />
                      Cevap secili soforun uygulama kullanicisina ayni ortak thread icinde gonderilir.
                    </div>

                    <Input
                      value={replySubject}
                      onChange={(event) => setReplySubject(event.target.value)}
                      placeholder="Konu"
                    />
                    <Textarea
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      placeholder="Sofore gonderilecek cevap"
                      rows={5}
                    />

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Mesaj gonderildiginde surucunun uygulamasinda aninda gorunur ve ayni konusma akisina eklenir.
                      </p>
                      <Button onClick={() => void submitReply()} disabled={submittingReply || !selectedThread}>
                        <MessageSquareReply className="mr-2 h-4 w-4" />
                        {submittingReply ? "Gonderiliyor..." : "Yaniti Gonder"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

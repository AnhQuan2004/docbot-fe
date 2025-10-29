import { Send, Sparkles, FileCheck, Loader2, CircleHelp, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { queryDocuments } from "@/lib/api";
import type { QueryResponse } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatAreaProps {
  isIndexing: boolean;
  isReady: boolean;
  conversationId: string;
  userName?: string;
  space?: string;
  mode?: string;
  documentCount?: number;
  lastIndexedAt?: string;
}

type MessageRole = "user" | "assistant";

interface MessageItem {
  id: string;
  role: MessageRole;
  content: string;
  status: "idle" | "loading" | "complete" | "error";
  createdAt: string;
  references?: string[];
}

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const extractAnswer = (data: QueryResponse) => {
  if (typeof data.answer === "string" && data.answer.trim()) return data.answer.trim();
  if (typeof data.response === "string" && data.response.trim()) return data.response.trim();
  if (typeof data.result === "string" && data.result.trim()) return data.result.trim();
  if (data.data && typeof data.data === "string" && data.data.trim()) return data.data.trim();
  if (data.data && typeof data.data === "object") return JSON.stringify(data.data, null, 2);
  return "Không tìm thấy câu trả lời phù hợp cho câu hỏi này.";
};

const STORAGE_PREFIX = "chat-history";

const parseAnswer = (answer: string) => {
  const matches = Array.from(answer.matchAll(/\[[^\]]+\]/g));
  const references: string[] = [];

  matches.forEach((match) => {
    const ref = match[0].slice(1, -1).trim();
    if (ref && !references.includes(ref)) {
      references.push(ref);
    }
  });

  const content = matches.length
    ? answer.replace(/\[[^\]]+\]/g, "").replace(/\n{3,}/g, "\n\n").trim()
    : answer.trim();

  return {
    content: content.length > 0 ? content : answer.trim(),
    references,
  };
};

export const ChatArea = ({
  isIndexing,
  isReady,
  conversationId,
  userName = "",
  space = "Physics 4A",
  mode = "Flash",
  documentCount = 0,
  lastIndexedAt,
}: ChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [isSending, setIsSending] = useState(false);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const storageKey = useMemo(
    () => (conversationId ? `${STORAGE_PREFIX}:${conversationId}` : undefined),
    [conversationId]
  );
  const [referenceVisibility, setReferenceVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!messageContainerRef.current) return;

    const element = messageContainerRef.current;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsedRaw = JSON.parse(stored) as Array<Partial<MessageItem>>;
        const parsed = parsedRaw.map((item) => ({
          ...item,
          references: Array.isArray(item.references) ? item.references : undefined,
        })) as MessageItem[];
        setMessages(parsed);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to parse chat history", error);
      setMessages([]);
    }

    return () => {
      if (!storageKey || typeof window === "undefined") return;
      window.localStorage.setItem(storageKey, JSON.stringify(messagesRef.current));
    };
  }, [storageKey]);

  useEffect(() => {
    setReferenceVisibility({});
  }, [conversationId]);

  const quickPrompts = useMemo(
    () => [
      "Quy chế đào tạo có những điểm gì đáng chú ý?",
      "Tóm tắt các yêu cầu chính trong tài liệu.",
      "Có quy định nào về thời hạn nộp hồ sơ không?",
    ],
    []
  );

  const generateId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const handleSend = async (payload?: string) => {
    const question = (payload ?? message).trim();
    if (!question || !isReady || isSending) return;

    const createdAt = new Date().toISOString();
    const userMessage: MessageItem = {
      id: generateId(),
      role: "user",
      content: question,
      status: "complete",
      createdAt,
    };

    const assistantMessageId = generateId();
    const pendingAssistant: MessageItem = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      status: "loading",
      createdAt,
      references: [],
    };

    setMessages((prev) => [...prev, userMessage, pendingAssistant]);
    setMessage("");
    setIsSending(true);

    try {
      const response = await queryDocuments(question);
      const answer = extractAnswer(response);
      const { content, references } = parseAnswer(answer);

      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantMessageId
            ? { ...item, content, status: "complete", references }
            : item
        )
      );
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Không thể lấy câu trả lời từ hệ thống.";
      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantMessageId
            ? { ...item, content: description, status: "error", references: [] }
            : item
        )
      );
      toast({
        title: "Không thể gửi câu hỏi",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setMessage(prompt);
    handleSend(prompt);
  };

  const handleSendClick = () => {
    if (!message.trim() || !isReady) return;
    handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleReferences = (messageId: string) => {
    setReferenceVisibility((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  return (
    <main className="flex-1 flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileCheck className="w-4 h-4" />
            <span className="text-sm font-medium">New Conversation</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {documentCount} document{documentCount === 1 ? "" : "s"} in {space}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className="bg-admin-bg text-admin-text hover:bg-admin-bg border-0 font-medium">
            Admin
          </Badge>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Mode:</span>
            <Badge variant="secondary" className="font-medium">
              <Sparkles className="w-3 h-3 mr-1" />
              {mode}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-10 py-8 overflow-hidden">
        <div className="flex flex-col gap-6 h-full">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold text-foreground leading-tight">
                    Hi {userName || "there"}, how are you?
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Ask anything or upload documents to get grounded answers from your knowledge base.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 bg-background">
                  <span className="font-medium text-foreground">Total sources</span>
                  <Badge variant="secondary" className="px-2 py-0.5">
                    {documentCount}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 bg-background">
                  <span className="font-medium text-foreground">Mode</span>
                  <Badge variant="secondary" className="px-2 py-0.5">
                    {mode}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              {isIndexing && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Đang lập chỉ mục tài liệu, vui lòng đợi...
                  </span>
                </div>
              )}

              {!isIndexing && documentCount > 0 && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-success/20 bg-success/10 px-4 py-3">
                  <FileCheck className="w-4 h-4 text-success" />
                  <span className="text-sm text-success font-medium">
                    All {documentCount} source{documentCount === 1 ? "" : "s"} indexed. Ready to chat!
                  </span>
                </div>
              )}

              {!isIndexing && documentCount === 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-muted-foreground">
                  <CircleHelp className="w-4 h-4" />
                  <span>
                    Chưa có tài liệu nào được lập chỉ mục. Bạn vẫn có thể đặt câu hỏi chung.
                  </span>
                </div>
              )}

              {lastIndexedAt && (
                <p className="text-xs text-muted-foreground">
                  Lần lập chỉ mục gần nhất: {formatTimestamp(lastIndexedAt)}
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col rounded-3xl border border-border/80 bg-card/60 shadow-inner overflow-hidden">
            <div
              ref={messageContainerRef}
              className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
            >
              {messages.length === 0 ? (
                <div className="max-w-2xl rounded-2xl border border-dashed border-border bg-background/40 px-6 py-8 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Bắt đầu trò chuyện</h3>
                  <p className="text-sm text-muted-foreground">
                    Gửi câu hỏi đầu tiên của bạn hoặc chọn một gợi ý bên dưới để trợ lý cung cấp câu trả lời.
                  </p>
                </div>
              ) : (
                messages.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2">
                    {item.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="flex items-end gap-3 max-w-[80%]">
                          <div className="flex flex-col items-end gap-1">
                            <div
                              className={cn(
                                "rounded-3xl px-5 py-3 text-sm font-medium shadow-sm bg-primary text-primary-foreground border border-primary",
                                item.status === "error" && "bg-destructive/10 text-destructive border-destructive/50"
                              )}
                            >
                              {item.status === "loading" ? (
                                <div className="flex items-center gap-2 text-primary-foreground/80">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Đang gửi câu hỏi...</span>
                                </div>
                              ) : (
                                <span className="whitespace-pre-wrap break-words font-normal text-base">
                                  {item.content}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatTimestamp(item.createdAt)}
                            </span>
                          </div>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold uppercase">
                            Bạn
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <div className="flex items-start gap-3 max-w-[80%]">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground text-xs font-semibold uppercase">
                            AI
                          </div>
                          <div className="flex flex-col gap-2">
                            <div
                              className={cn(
                                "rounded-3xl border border-border bg-background px-5 py-4 text-sm leading-relaxed shadow-sm",
                                item.status === "error" && "border-destructive/50 bg-destructive/5 text-destructive"
                              )}
                            >
                              {item.status === "loading" ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Đang tạo câu trả lời...</span>
                                </div>
                              ) : (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-ul:my-2 prose-li:marker:text-primary"
                                  components={{
                                    p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
                                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                    code: ({ className, children, ...props }) => {
                                      const match = /language-(\w+)/.exec(className || "");
                                      return match ? (
                                        <pre className="rounded-lg bg-secondary/60 p-3 text-xs font-mono overflow-auto">
                                          <code className={className}>{children}</code>
                                        </pre>
                                      ) : (
                                        <code className="rounded bg-secondary px-1.5 py-0.5 text-xs" {...props}>
                                          {children}
                                        </code>
                                      );
                                    },
                                  }}
                                >
                                  {item.content}
                                </ReactMarkdown>
                              )}
                            </div>
                            {item.references && item.references.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="self-start rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                  onClick={() => toggleReferences(item.id)}
                                >
                                  <span className="flex items-center gap-2">
                                    {referenceVisibility[item.id] ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                    <BookOpen className="w-4 h-4" />
                                    Sources ({item.references.length})
                                  </span>
                                </Button>
                                {referenceVisibility[item.id] && (
                                  <div className="rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
                                    {item.references.map((ref) => (
                                      <div key={`${item.id}-${ref}`} className="leading-relaxed">
                                        {ref}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {formatTimestamp(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {isReady && messages.length === 0 && documentCount > 0 && (
              <div className="border-t border-border/70 bg-background/80 px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => handleQuickPrompt(prompt)}
                      disabled={isSending}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-background shadow-lg px-6 py-5">
            <div className="flex flex-col gap-3">
              <div
                className={cn(
                  "relative flex items-end gap-3 rounded-2xl border px-4 py-3 bg-card",
                  isReady ? "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10" : "border-dashed border-border/70 bg-muted/30 opacity-70 cursor-not-allowed"
                )}
              >
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isReady
                      ? documentCount > 0
                        ? "Ask a question about your documents..."
                        : "Ask me anything hoặc tải tài liệu để có câu trả lời sâu hơn..."
                      : "Waiting for indexing..."
                  }
                  disabled={!isReady || isSending}
                  rows={2}
                  className="min-h-[64px] resize-none border-0 bg-transparent px-0 py-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  onClick={handleSendClick}
                  disabled={!isReady || !message.trim() || isSending}
                  size="icon"
                  className={cn(
                    "h-11 w-11 rounded-full",
                    isReady && message.trim() && !isSending
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  Press <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border font-mono text-[10px]">Enter</kbd> to send,{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border font-mono text-[10px]">Shift + Enter</kbd> for new line
                </span>
                <div className="flex items-center gap-4">
                  <span>Total sources: {documentCount}</span>
                  <span>Indexed sources: {documentCount}</span>
                  <span className="flex items-center gap-1">
                    Mode: <Badge variant="secondary" className="font-medium px-2 py-0.5">{mode}</Badge>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

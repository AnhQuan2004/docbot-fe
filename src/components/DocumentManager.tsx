import { useMemo, useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import type { IndexDocumentsResponse } from "@/lib/api";

export interface IndexedDocument {
  id: string;
  name: string;
  size: number;
  indexedAt: string;
}

interface DocumentManagerProps {
  documents: IndexedDocument[];
  isIndexing: boolean;
  lastIndexedAt?: string;
  lastMessage?: string;
  onIndexDocuments: (files: File[]) => Promise<{ response: IndexDocumentsResponse; indexedAt: string }>;
}

const formatFileSize = (size: number) => {
  if (size === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(size) / Math.log(1024));
  const value = size / Math.pow(1024, index);
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
};

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString();
};

export const DocumentManager = ({
  documents,
  isIndexing,
  lastIndexedAt,
  lastMessage,
  onIndexDocuments,
}: DocumentManagerProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const totalSelectedSize = useMemo(
    () => selectedFiles.reduce((acc, file) => acc + file.size, 0),
    [selectedFiles]
  );

  const handleFilePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    setError(null);
    setSelectedFiles(Array.from(event.target.files));
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.name !== fileName));
  };

  const handleTriggerPicker = () => {
    fileInputRef.current?.click();
  };

  const handleIndexDocuments = async () => {
    if (selectedFiles.length === 0) {
      setError("Hãy chọn ít nhất một tài liệu PDF để lập chỉ mục.");
      return;
    }

    const indexedCount = selectedFiles.length;

    try {
      const { response, indexedAt: completedAt } = await onIndexDocuments(selectedFiles);
      setSelectedFiles([]);
      toast({
        title: "Lập chỉ mục thành công",
        description:
          response.message ??
          `Đã lập chỉ mục ${indexedCount} tài liệu vào ${formatTimestamp(completedAt)}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể lập chỉ mục tài liệu.";
      setError(message);
      toast({
        title: "Có lỗi xảy ra",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <main className="flex-1 flex flex-col h-screen bg-background px-10 py-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary text-sm font-medium">
            <Upload className="w-4 h-4" />
            Document Indexing
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Chuẩn bị tài liệu cho trợ lý AI
          </h1>
          <p className="text-muted-foreground">
            Tải lên các tệp PDF để lập chỉ mục. Sau khi hoàn tất, bạn có thể đặt câu hỏi ngay trong khu vực trò chuyện.
          </p>
        </header>

        <Card className="border-dashed border-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Tải tài liệu PDF</CardTitle>
              <CardDescription>
                Chỉ hỗ trợ định dạng PDF. Mỗi lần bạn có thể tải lên tối đa 5 tệp (≤ 25MB mỗi tệp).
              </CardDescription>
            </div>
            <Button onClick={handleTriggerPicker} variant="outline" disabled={isIndexing}>
              <Upload className="w-4 h-4 mr-2" />
              Chọn tệp PDF
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFilePick}
              className="hidden"
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedFiles.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{selectedFiles.length} tệp đã chọn</span>
                  <span>{formatFileSize(totalSelectedSize)}</span>
                </div>
                <div className="space-y-2">
                  {selectedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{file.name}</span>
                        <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveFile(file.name)}
                        disabled={isIndexing}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-secondary/30 px-6 py-8 text-center text-sm text-muted-foreground">
                Chưa có tệp nào được chọn. Nhấn &ldquo;Chọn tệp PDF&rdquo; để bắt đầu hoặc kéo thả tệp trực tiếp vào khu vực này.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isIndexing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lập chỉ mục tài liệu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>Sẵn sàng lập chỉ mục</span>
                  </>
                )}
              </div>
              <Button
                onClick={handleIndexDocuments}
                disabled={isIndexing || selectedFiles.length === 0}
                className="min-w-[180px]"
              >
                {isIndexing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Bắt đầu lập chỉ mục"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tài liệu đã lập chỉ mục</CardTitle>
            <CardDescription>
              {documents.length > 0 ? (
                <>
                  Đã lập chỉ mục {documents.length} tài liệu.
                  {lastMessage && (
                    <span className="block sm:inline"> {lastMessage}</span>
                  )}
                </>
              ) : (
                "Sau khi hoàn tất, danh sách tài liệu sẽ xuất hiện tại đây."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Chưa có tài liệu nào được lập chỉ mục.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg border border-border px-4 py-3 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-sm font-medium text-foreground">
                      <span>{doc.name}</span>
                      <Badge variant="secondary">{formatFileSize(doc.size)}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Lập chỉ mục: {formatTimestamp(doc.indexedAt)}</span>
                      {lastIndexedAt && <span>Lần cuối cập nhật: {formatTimestamp(lastIndexedAt)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Quy trình gợi ý</h2>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Tải lên các tài liệu PDF cần tham chiếu.</li>
            <li>2. Đợi hệ thống lập chỉ mục hoàn tất (khoảng 1-2 phút).</li>
            <li>3. Chuyển sang tab &ldquo;Conversations&rdquo; để bắt đầu đặt câu hỏi.</li>
          </ol>
        </section>
      </div>
    </main>
  );
};

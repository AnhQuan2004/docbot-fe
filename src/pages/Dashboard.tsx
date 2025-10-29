import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { DocumentManager, type IndexedDocument } from "@/components/DocumentManager";
import { indexDocuments as sendIndexRequest } from "@/lib/api";
import type { IndexDocumentsResponse } from "@/lib/api";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<"conversations" | "documents">("conversations");
  const [isIndexing, setIsIndexing] = useState(false);
  const [isReady, setIsReady] = useState(true);
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [lastIndexedAt, setLastIndexedAt] = useState<string | undefined>();
  const [lastMessage, setLastMessage] = useState<string | undefined>();

  const [conversations] = useState([
    {
      id: "1",
      title: "New Chat",
      model: "Flash",
      timestamp: "09:49 PM"
    }
  ]);
  const activeConversationId = conversations[0]?.id ?? "default";

  const handleNewConversation = () => {
    console.log("Creating new conversation...");
  };

  const handleIndexDocuments = async (files: File[]) => {
    setIsIndexing(true);
    setIsReady(false);
    const generateId = () => {
      if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
      }

      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    try {
      const response: IndexDocumentsResponse = await sendIndexRequest(files);
      const indexedAt = new Date().toISOString();
      const indexedDocuments: IndexedDocument[] = files.map((file) => ({
        id: generateId(),
        name: file.name,
        size: file.size,
        indexedAt,
      }));

      setDocuments((prev) => [...prev, ...indexedDocuments]);
      setLastIndexedAt(indexedAt);
      setLastMessage(response.message);
      setIsReady(true);

      return { response, indexedAt };
    } catch (error) {
      throw error;
    } finally {
      setIsIndexing(false);
      setIsReady(true);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        conversations={conversations}
        onNewConversation={handleNewConversation}
      />
      {activeTab === "conversations" ? (
        <ChatArea
          isIndexing={isIndexing}
          isReady={isReady}
          conversationId={activeConversationId}
          documentCount={documents.length}
          lastIndexedAt={lastIndexedAt}
        />
      ) : (
        <DocumentManager
          documents={documents}
          isIndexing={isIndexing}
          lastIndexedAt={lastIndexedAt}
          lastMessage={lastMessage}
          onIndexDocuments={handleIndexDocuments}
        />
      )}
    </div>
  );
};

export default Dashboard;

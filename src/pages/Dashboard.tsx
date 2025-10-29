import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { DocumentManager, type IndexedDocument } from "@/components/DocumentManager";
import { indexDocuments as sendIndexRequest } from "@/lib/api";
import type { IndexDocumentsResponse } from "@/lib/api";

const DOCUMENT_STORAGE_KEY = "indexed-documents";
const DOCUMENT_MESSAGE_KEY = "indexed-documents:last-message";
const CONVERSATION_STORAGE_KEY = "conversations";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<"conversations" | "documents">("conversations");
  const [isIndexing, setIsIndexing] = useState(false);
  const [isReady, setIsReady] = useState(true);
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [lastIndexedAt, setLastIndexedAt] = useState<string | undefined>();
  const [lastMessage, setLastMessage] = useState<string | undefined>();

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedConversations = window.localStorage.getItem(CONVERSATION_STORAGE_KEY);
      if (storedConversations) {
        const parsed = JSON.parse(storedConversations);
        setConversations(parsed);
        if (parsed.length > 0) {
          setActiveConversationId(parsed[0].id);
        }
      } else {
        const defaultConversation = {
          id: "1",
          title: "New Chat",
          model: "Flash",
          timestamp: "09:49 PM",
        };
        setConversations([defaultConversation]);
        setActiveConversationId(defaultConversation.id);
      }
    } catch (error) {
      console.error("Failed to load conversations from storage", error);
    }
  }, []);

  const handleNewConversation = () => {
    const newConversation = {
      id: Date.now().toString(),
      title: "New Chat",
      model: "Flash",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  useEffect(() => {
    if (typeof window === "undefined" || conversations.length === 0) return;
    window.localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedDocuments = window.localStorage.getItem(DOCUMENT_STORAGE_KEY);
      if (storedDocuments) {
        const parsed = JSON.parse(storedDocuments) as IndexedDocument[];
        setDocuments(parsed);
        if (parsed.length > 0) {
          setIsReady(true);
          const latestIndexedAt = parsed.reduce(
            (latest, doc) =>
              !latest || (doc.indexedAt && doc.indexedAt > latest) ? doc.indexedAt : latest,
            parsed[0]?.indexedAt ?? ""
          );
          setLastIndexedAt(latestIndexedAt);
        }
      }

      const storedMessage = window.localStorage.getItem(DOCUMENT_MESSAGE_KEY);
      if (storedMessage) {
        setLastMessage(storedMessage);
      }
    } catch (error) {
      console.error("Failed to load indexed documents from storage", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lastMessage) {
      window.localStorage.setItem(DOCUMENT_MESSAGE_KEY, lastMessage);
    } else {
      window.localStorage.removeItem(DOCUMENT_MESSAGE_KEY);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (documents.length === 0) return;
    const latestIndexedAt = documents.reduce(
      (latest, doc) =>
        !latest || (doc.indexedAt && doc.indexedAt > latest) ? doc.indexedAt : latest,
      documents[0]?.indexedAt ?? ""
    );
    setLastIndexedAt(latestIndexedAt);
  }, [documents]);

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

      setDocuments((prev) => {
        const combined = [...prev];
        indexedDocuments.forEach((doc) => {
          const existingIndex = combined.findIndex((item) => item.name === doc.name);
          if (existingIndex >= 0) {
            combined[existingIndex] = doc;
          } else {
            combined.push(doc);
          }
        });
        return combined.sort((a, b) => (b.indexedAt ?? "").localeCompare(a.indexedAt ?? ""));
      });
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
        activeConversationId={activeConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
      />
      {activeTab === "conversations" ? (
        <ChatArea
          key={activeConversationId}
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

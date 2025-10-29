import { Search, Plus, MessageSquare, FileText, Home, Moon, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  model: string;
  timestamp: string;
}

interface SidebarProps {
  activeTab: "conversations" | "documents";
  onTabChange: (tab: "conversations" | "documents") => void;
  conversations: Conversation[];
  onNewConversation: () => void;
}

export const Sidebar = ({ activeTab, onTabChange, conversations, onNewConversation }: SidebarProps) => {
  return (
    <aside className="w-64 border-r border-border bg-background flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Home className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Moon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Grid3x3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 px-4 pt-4 pb-2">
        <button
          onClick={() => onTabChange("conversations")}
          className={cn(
            "text-sm font-medium pb-2 border-b-2 transition-colors",
            activeTab === "conversations"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Conversations
        </button>
        <button
          onClick={() => onTabChange("documents")}
          className={cn(
            "text-sm font-medium pb-2 border-b-2 transition-colors",
            activeTab === "documents"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Documents
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "conversations" && (
          <>
            {/* Conversations Header */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 text-sm mb-3">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">Conversations</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {conversations.length} chat
                </Badge>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-9 h-9 bg-secondary border-0"
                />
              </div>
            </div>

            {/* New Conversation Button */}
            <div className="px-4 pb-3">
              <Button
                onClick={onNewConversation}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Conversation
              </Button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-4 space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className="w-full p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all text-left group"
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conversation.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{conversation.model}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {activeTab === "documents" && (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No documents yet</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

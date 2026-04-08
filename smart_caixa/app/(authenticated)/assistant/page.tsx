"use client";

import ChatInterface from "@/components/Chat/ChatInterface";

export default function AssistantPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">Assistente IA</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Converse com a IA sobre seus dados financeiros
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}

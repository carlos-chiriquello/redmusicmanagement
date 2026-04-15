import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6" data-testid="chat-page">
      <div>
        <h1 className="text-3xl font-bold text-[#111111] tracking-tight flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-[#c72137]" />
          Mensagens
        </h1>
        <p className="text-base text-[#6b7280] mt-2">Chat interno do ministério</p>
      </div>

      <div className="bg-white rounded-xl border border-[#e28b95]/20 p-6 h-[600px] flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-3" data-testid="chat-messages">
          {messages.length === 0 && (
            <p className="text-center text-[#6b7280] py-12">Nenhuma mensagem ainda</p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            data-testid="chat-input"
            className="flex-1"
          />
          <Button
            data-testid="chat-send-button"
            className="bg-[#c72137] hover:bg-[#cf3f57]"
            disabled={!newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { MessageSquare, Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ChatPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadUsers();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadMessages();
      intervalRef.current = setInterval(loadMessages, 3000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUsers = async () => {
    try {
      const { data } = await axios.get(`${API}/volunteers`, { withCredentials: true });
      setUsers(data.filter(u => u.status === 'Ativo'));
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    }
  };

  const loadMessages = async () => {
    if (!selectedUser) return;
    try {
      const { data } = await axios.get(`${API}/chat/messages/${selectedUser.id}`, { withCredentials: true });
      setMessages(data);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    setSending(true);
    try {
      await axios.post(
        `${API}/chat/messages`,
        { to_user_id: selectedUser.id, message: newMessage },
        { withCredentials: true }
      );
      setNewMessage('');
      loadMessages();
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="chat-page">
      <div>
        <h1 className="text-3xl font-bold text-[#111111] tracking-tight flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-[#c72137]" />
          Mensagens
        </h1>
        <p className="text-base text-[#6b7280] mt-2">Chat interno do ministério</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-240px)]">
        <Card className="border-[#e28b95]/20 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#e28b95]/20">
              <Users className="w-5 h-5 text-[#c72137]" />
              <h2 className="font-semibold text-[#111111]">Contatos</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-360px)]">
              <div className="space-y-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedUser?.id === u.id
                        ? 'bg-[#f7e1e1] border border-[#c72137]'
                        : 'hover:bg-[#fcf7f6] border border-transparent'
                    }`}
                    data-testid={`contact-${u.id}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#f7e1e1] flex items-center justify-center text-[#c72137] font-bold">
                      {u.name.charAt(0)}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium text-[#111111] truncate">{u.name}</p>
                      <p className="text-xs text-[#6b7280] truncate">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-[#e28b95]/20 lg:col-span-3 flex flex-col">
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center" data-testid="no-chat-selected">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-[#e28b95] mx-auto mb-4" />
                <p className="text-[#6b7280]">Selecione um contato para iniciar uma conversa</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-[#e28b95]/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f7e1e1] flex items-center justify-center text-[#c72137] font-bold">
                    {selectedUser.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111111]">{selectedUser.name}</p>
                    <p className="text-sm text-[#6b7280]">{selectedUser.email}</p>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4" data-testid="chat-messages">
                  {messages.length === 0 ? (
                    <p className="text-center text-[#6b7280] py-8">Nenhuma mensagem ainda. Inicie a conversa!</p>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.from_user_id === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwn
                                ? 'bg-[#c72137] text-white'
                                : 'bg-[#fcf7f6] text-[#111111] border border-[#e28b95]/20'
                            }`}
                          >
                            {!isOwn && (
                              <p className="text-xs font-medium mb-1 text-[#c72137]">
                                {msg.from_user_name}
                              </p>
                            )}
                            <p className="text-sm break-words">{msg.message}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwn ? 'text-white/70' : 'text-[#6b7280]'
                              }`}
                            >
                              {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <form onSubmit={sendMessage} className="p-4 border-t border-[#e28b95]/20">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    data-testid="chat-input"
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    data-testid="chat-send-button"
                    className="bg-[#c72137] hover:bg-[#cf3f57]"
                    disabled={!newMessage.trim() || sending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

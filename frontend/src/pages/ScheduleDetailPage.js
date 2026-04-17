import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Music, Users, CheckCircle, AlertCircle, Clock, Download, GripVertical, Send } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import jsPDF from 'jspdf';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ScheduleDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [selectedFunction, setSelectedFunction] = useState('Vocal');
  const [selectedSong, setSelectedSong] = useState('');
  const [songKey, setSongKey] = useState('');
  const [mainVocal, setMainVocal] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [scheduleRes, volunteersRes, songsRes] = await Promise.all([
        axios.get(`${API}/schedules/${id}`, { withCredentials: true }),
        axios.get(`${API}/volunteers`, { withCredentials: true }),
        axios.get(`${API}/songs`, { withCredentials: true })
      ]);
      setSchedule(scheduleRes.data);
      setVolunteers(volunteersRes.data.filter(v => v.status === 'Ativo'));
      setSongs(songsRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
      navigate('/schedules');
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    if (!selectedVolunteer) return;
    try {
      const res = await axios.post(
        `${API}/schedules/${id}/members`,
        { volunteer_id: selectedVolunteer, function: selectedFunction },
        { withCredentials: true }
      );
      if (res.data.warning) {
        toast.warning(res.data.warning);
      } else {
        toast.success('Membro adicionado à escala');
      }
      loadData();
      setMemberDialogOpen(false);
      setSelectedVolunteer('');
    } catch (error) {
      toast.error('Erro ao adicionar membro');
    }
  };

  const removeMember = async (memberId) => {
    try {
      await axios.delete(`${API}/schedules/${id}/members/${memberId}`, { withCredentials: true });
      toast.success('Membro removido');
      loadData();
    } catch (error) {
      toast.error('Erro ao remover membro');
    }
  };

  const updateMemberStatus = async (memberId, status) => {
    try {
      await axios.put(
        `${API}/schedules/${id}/members/${memberId}`,
        { confirmation_status: status },
        { withCredentials: true }
      );
      toast.success('Status atualizado');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const addSongToSetlist = async () => {
    if (!selectedSong) return;
    try {
      const order = (schedule?.setlist?.length || 0) + 1;
      await axios.post(
        `${API}/setlists/${id}/songs`,
        {
          song_id: selectedSong,
          key_for_this_event: songKey,
          main_vocal_volunteer_id: mainVocal,
          order
        },
        { withCredentials: true }
      );
      toast.success('Música adicionada ao setlist');
      loadData();
      setSongDialogOpen(false);
      setSelectedSong('');
      setSongKey('');
      setMainVocal('');
    } catch (error) {
      toast.error('Erro ao adicionar música');
    }
  };

  const removeSongFromSetlist = async (songEntryId) => {
    try {
      await axios.delete(`${API}/setlists/${id}/songs/${songEntryId}`, { withCredentials: true });
      toast.success('Música removida do setlist');
      loadData();
    } catch (error) {
      toast.error('Erro ao remover música');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(schedule.setlist);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setSchedule({ ...schedule, setlist: updatedItems });

    try {
      await axios.put(
        `${API}/setlists/${id}/reorder`,
        { songs: updatedItems },
        { withCredentials: true }
      );
      toast.success('Ordem atualizada');
    } catch (error) {
      toast.error('Erro ao reordenar');
      loadData();
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(199, 33, 55);
    doc.text('Red Music', 20, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(schedule?.name || 'Escala', 20, 35);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Data: ${schedule?.date} às ${schedule?.time}`, 20, 45);
    
    let y = 60;
    doc.setFontSize(14);
    doc.setTextColor(199, 33, 55);
    doc.text('Equipe:', 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    schedule?.members?.forEach(member => {
      doc.text(`${member.volunteer_name} - ${member.function}`, 25, y);
      y += 7;
    });
    
    y += 10;
    doc.setFontSize(14);
    doc.setTextColor(199, 33, 55);
    doc.text('Setlist:', 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    schedule?.setlist?.forEach((song, index) => {
      const vocalName = vocals.find(v => v.volunteer_id === song.main_vocal_volunteer_id)?.volunteer_name || 'N/D';
      doc.text(`${index + 1}. ${song.song_name} (${song.key_for_this_event}) - Vocal: ${vocalName}`, 25, y);
      y += 7;
    });
    
    doc.save(`escala-${schedule?.name?.replace(/\s+/g, '-')}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const sendNotifications = async () => {
    try {
      const promises = schedule?.members?.map(member => {
        const volunteer = volunteers.find(v => v.id === member.volunteer_id);
        if (!volunteer?.email) return null;
        
        return axios.post(
          `${API}/notifications/send`,
          {
            recipient_email: volunteer.email,
            subject: `Você foi escalado - ${schedule.name}`,
            message: `Olá ${volunteer.name}! Você foi escalado para ${schedule.name} no dia ${schedule.date} às ${schedule.time} como ${member.function}. Por favor, confirme sua presença no sistema.`,
            channel: 'email'
          },
          { withCredentials: true }
        );
      }).filter(Boolean);
      
      await Promise.all(promises);
      toast.success('Notificações enviadas com sucesso!');
      setNotifyDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao enviar notificações');
    }
  };

  const vocals = schedule?.members?.filter(m => m.function.toLowerCase().includes('vocal')) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="schedule-detail-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/schedules')}
            data-testid="back-button"
            className="hover:bg-[#f7e1e1]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#111111] tracking-tight">{schedule?.name}</h1>
            <p className="text-base text-[#6b7280]">
              {schedule?.date} às {schedule?.time}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#c72137] text-[#c72137] hover:bg-[#f7e1e1]" data-testid="notify-button">
                <Send className="w-4 h-4 mr-2" />
                Notificar Equipe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Notificações</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-[#6b7280]">
                  Deseja enviar notificações por e-mail para todos os membros escalados?
                </p>
                <p className="text-xs text-[#6b7280]">
                  {schedule?.members?.length || 0} membros serão notificados.
                </p>
                <Button
                  onClick={sendNotifications}
                  className="w-full bg-[#c72137] hover:bg-[#cf3f57]"
                  data-testid="confirm-notify"
                >
                  Enviar Notificações
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={exportPDF} className="bg-[#c72137] hover:bg-[#cf3f57]" data-testid="export-pdf-button">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="members" data-testid="tab-members">
            <Users className="w-4 h-4 mr-2" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="setlist" data-testid="tab-setlist">
            <Music className="w-4 h-4 mr-2" />
            Setlist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#111111]">Membros da Equipe</h2>
            <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#c72137] hover:bg-[#cf3f57]" data-testid="add-member-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Membro à Escala</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Voluntário</Label>
                    <Select value={selectedVolunteer} onValueChange={setSelectedVolunteer}>
                      <SelectTrigger data-testid="select-volunteer">
                        <SelectValue placeholder="Selecione um voluntário" />
                      </SelectTrigger>
                      <SelectContent>
                        {volunteers.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Função</Label>
                    <Select value={selectedFunction} onValueChange={setSelectedFunction}>
                      <SelectTrigger data-testid="select-function">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vocal">Vocal</SelectItem>
                        <SelectItem value="Backing Vocal">Backing Vocal</SelectItem>
                        <SelectItem value="Violão">Violão</SelectItem>
                        <SelectItem value="Guitarra">Guitarra</SelectItem>
                        <SelectItem value="Baixo">Baixo</SelectItem>
                        <SelectItem value="Teclado">Teclado</SelectItem>
                        <SelectItem value="Bateria">Bateria</SelectItem>
                        <SelectItem value="Técnico de Som">Técnico de Som</SelectItem>
                        <SelectItem value="Técnico de Imagem">Técnico de Imagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={addMember}
                    className="w-full bg-[#c72137] hover:bg-[#cf3f57]"
                    data-testid="confirm-add-member"
                  >
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedule?.members?.length === 0 ? (
              <p className="text-[#6b7280] col-span-3 text-center py-8">Nenhum membro escalado ainda</p>
            ) : (
              schedule?.members?.map(member => (
                <Card key={member.id} className="border-[#e28b95]/20" data-testid={`member-card-${member.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#f7e1e1] flex items-center justify-center text-[#c72137] font-bold">
                          {member.volunteer_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-[#111111]">{member.volunteer_name}</p>
                          <p className="text-sm text-[#6b7280]">{member.function}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`remove-member-${member.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Select
                        value={member.confirmation_status}
                        onValueChange={(v) => updateMemberStatus(member.id, v)}
                      >
                        <SelectTrigger data-testid={`status-select-${member.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-yellow-600" />
                              Pendente
                            </div>
                          </SelectItem>
                          <SelectItem value="Confirmado">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Confirmado
                            </div>
                          </SelectItem>
                          <SelectItem value="Preciso de Substituto">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              Preciso de Substituto
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge
                        className={
                          member.confirmation_status === 'Confirmado'
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : member.confirmation_status === 'Preciso de Substituto'
                            ? 'bg-red-100 text-red-800 hover:bg-red-100'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                        }
                      >
                        {member.confirmation_status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="setlist" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#111111]">Lista de Músicas</h2>
            <Dialog open={songDialogOpen} onOpenChange={setSongDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#c72137] hover:bg-[#cf3f57]" data-testid="add-song-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Música
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Música ao Setlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Música</Label>
                    <Select value={selectedSong} onValueChange={(v) => {
                      setSelectedSong(v);
                      const song = songs.find(s => s.id === v);
                      if (song) setSongKey(song.original_key);
                    }}>
                      <SelectTrigger data-testid="select-song">
                        <SelectValue placeholder="Selecione uma música" />
                      </SelectTrigger>
                      <SelectContent>
                        {songs.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.original_key})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tom para este evento</Label>
                    <Input
                      value={songKey}
                      onChange={(e) => setSongKey(e.target.value)}
                      placeholder="Ex: C, D, Em"
                      data-testid="song-key-input"
                    />
                  </div>
                  {vocals.length > 0 && (
                    <div>
                      <Label>Vocal Principal</Label>
                      <Select value={mainVocal} onValueChange={setMainVocal}>
                        <SelectTrigger data-testid="select-main-vocal">
                          <SelectValue placeholder="Selecione o vocal" />
                        </SelectTrigger>
                        <SelectContent>
                          {vocals.map(v => (
                            <SelectItem key={v.id} value={v.volunteer_id}>
                              {v.volunteer_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button
                    onClick={addSongToSetlist}
                    className="w-full bg-[#c72137] hover:bg-[#cf3f57]"
                    data-testid="confirm-add-song"
                  >
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-xl border border-[#e28b95]/20 p-6">
            {schedule?.setlist?.length === 0 ? (
              <p className="text-[#6b7280] text-center py-8">Nenhuma música adicionada ainda</p>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="setlist">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                      {schedule?.setlist?.map((song, index) => {
                        const vocalName = vocals.find(v => v.volunteer_id === song.main_vocal_volunteer_id)?.volunteer_name || 'Não definido';
                        return (
                          <Draggable key={song.id} draggableId={song.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center justify-between p-4 bg-[#fcf7f6] rounded-lg ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                                data-testid={`setlist-song-${song.id}`}
                              >
                                <div className="flex items-center gap-4">
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-5 h-5 text-[#6b7280]" />
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-[#c72137] text-white flex items-center justify-center font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-[#111111]">{song.song_name}</p>
                                    <div className="flex items-center gap-4 text-sm text-[#6b7280] mt-1">
                                      <span>Tom: {song.key_for_this_event}</span>
                                      <span>•</span>
                                      <span>Vocal: {vocalName}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSongFromSetlist(song.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  data-testid={`remove-song-${song.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

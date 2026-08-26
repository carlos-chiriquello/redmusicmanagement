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
import { ArrowLeft, Plus, Trash2, Music, Users, CheckCircle, AlertCircle, Clock, Download, GripVertical, Send, Users2, Music2, ArrowRight, AlertTriangle, Share2, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import jsPDF from 'jspdf';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_FLOW = ['Disponibilidade', 'Rascunho', 'Em Validação', 'Fechada'];
const STATUS_COLORS = {
  'Disponibilidade': 'bg-blue-100 text-blue-800',
  'Rascunho': 'bg-yellow-100 text-yellow-800',
  'Em Validação': 'bg-orange-100 text-orange-800',
  'Validado': 'bg-green-100 text-green-800',
  'Fechada': 'bg-green-100 text-green-800'
};

const SLOT_LIMITS = {
  'Vocal': 6,
  'Violão': 2,
  'Guitarra': 2,
  'Teclado': 2,
  'Baixo': 1,
  'Percussão': 1,
  'Bateria': 1
};

export const ScheduleDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState('Vocal');
  const [selectedSong, setSelectedSong] = useState('');
  const [songKey, setSongKey] = useState('');
  const [mainVocal, setMainVocal] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [scheduleRes, volunteersRes, songsRes, availableRes] = await Promise.allSettled([
        axios.get(`${API}/schedules/${id}`, { withCredentials: true }),
        axios.get(`${API}/volunteers`, { withCredentials: true }),
        axios.get(`${API}/songs`, { withCredentials: true }),
        axios.get(`${API}/schedules/${id}/available-volunteers`, { withCredentials: true })
      ]);
      
      if (scheduleRes.status === 'fulfilled') {
        setSchedule(scheduleRes.value.data);
      } else {
        toast.error('Erro ao carregar escala');
        navigate('/schedules');
        return;
      }
      
      if (volunteersRes.status === 'fulfilled') {
        setVolunteers(volunteersRes.value.data.filter(v => v.status === 'Ativo'));
      }
      
      if (songsRes.status === 'fulfilled') {
        setSongs(songsRes.value.data);
      }
      
      if (availableRes.status === 'fulfilled') {
        setAvailableVolunteers(availableRes.value.data);
      } else {
        console.warn('Falha ao carregar voluntários disponíveis:', availableRes.reason);
        setAvailableVolunteers([]);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const addMemberByCard = async (volunteerId) => {
    try {
      const res = await axios.post(
        `${API}/schedules/${id}/members`,
        { volunteer_id: volunteerId, function: selectedFunction },
        { withCredentials: true }
      );
      if (res.data.warning) {
        toast.warning(res.data.warning);
      } else {
        toast.success('Membro adicionado à escala');
      }
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao adicionar membro');
    }
  };

  const addMember = async () => {
    // Deprecated - substituído por addMemberByCard
  };

  const updateScheduleStatus = async (newStatus) => {
    try {
      await axios.put(`${API}/schedules/${id}`, { status: newStatus }, { withCredentials: true });
      toast.success(`Status alterado para: ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const copyShareLink = () => {
    if (!schedule?.share_token) {
      toast.error('Token de compartilhamento indisponível');
      return;
    }
    const url = `${window.location.origin}/public/schedule/${schedule.share_token}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link público copiado! Compartilhe com a equipe.');
    }).catch(() => {
      toast.error('Não foi possível copiar. Link: ' + url);
    });
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

  // Contagem de vagas preenchidas por função
  const slotCounts = {};
  Object.keys(SLOT_LIMITS).forEach(func => {
    if (func === 'Vocal') {
      slotCounts[func] = schedule?.members?.filter(m => 
        m.function === 'Vocal' || m.function === 'Backing Vocal'
      ).length || 0;
    } else {
      slotCounts[func] = schedule?.members?.filter(m => m.function === func).length || 0;
    }
  });

  const currentStatus = schedule?.status || 'Rascunho';
  const currentStatusIndex = STATUS_FLOW.indexOf(currentStatus);
  const nextStatus = currentStatusIndex >= 0 && currentStatusIndex < STATUS_FLOW.length - 1 
    ? STATUS_FLOW[currentStatusIndex + 1] 
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="schedule-detail-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
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
            <div className="flex items-center gap-2 flex-wrap">
              {schedule?.ministry && (
                <Badge className="bg-[#c72137] text-white hover:bg-[#c72137] text-sm font-bold" data-testid="ministry-badge">
                  {schedule.ministry}
                </Badge>
              )}
              <h1 className="text-3xl font-bold text-[#111111] tracking-tight">{schedule?.name}</h1>
              <Badge className={`${STATUS_COLORS[currentStatus]} hover:${STATUS_COLORS[currentStatus]}`}>
                {currentStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-base text-[#6b7280]">
                {schedule?.date} às {schedule?.time}
              </p>
              {schedule?.event_type && (
                <Badge variant="outline" className="border-[#e28b95] text-[#c72137]">
                  {schedule.event_type}
                </Badge>
              )}
              {schedule?.has_choir && (
                <span className="text-xs flex items-center gap-1 text-[#c72137]">
                  <Users2 className="w-3 h-3" /> Coral
                </span>
              )}
              {schedule?.has_orchestra && (
                <span className="text-xs flex items-center gap-1 text-[#c72137]">
                  <Music2 className="w-3 h-3" /> Orquestra
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {currentStatus !== 'Validado' && (
            <Button
              variant="outline"
              onClick={() => updateScheduleStatus('Validado')}
              className="border-green-600 text-green-700 hover:bg-green-50"
              data-testid="validate-button"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar como Validado
            </Button>
          )}
          <Button
            variant="outline"
            onClick={copyShareLink}
            className="border-[#c72137] text-[#c72137] hover:bg-[#f7e1e1]"
            data-testid="share-button"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
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

      <Card className="border-[#e28b95]/20" data-testid="slots-overview-card">
        <CardHeader>
          <CardTitle className="text-lg">Vagas por Instrumento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(SLOT_LIMITS).map(([func, limit]) => {
              const filled = slotCounts[func] || 0;
              const isFull = filled >= limit;
              return (
                <div
                  key={func}
                  className={`p-3 rounded-lg border ${isFull ? 'bg-[#f7e1e1] border-[#c72137]' : 'bg-[#fcf7f6] border-[#e28b95]/30'}`}
                  data-testid={`slot-${func}`}
                >
                  <p className="text-xs font-medium text-[#6b7280] mb-1">{func}</p>
                  <p className={`text-lg font-bold ${isFull ? 'text-[#c72137]' : 'text-[#111111]'}`}>
                    {filled} / {limit}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Adicionar Membro à Escala</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Função *</Label>
                    <Select value={selectedFunction} onValueChange={setSelectedFunction}>
                      <SelectTrigger data-testid="select-function">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vocal">Vocal ({slotCounts['Vocal'] || 0}/6)</SelectItem>
                        <SelectItem value="Backing Vocal">Backing Vocal (conta como Vocal)</SelectItem>
                        <SelectItem value="Violão">Violão ({slotCounts['Violão'] || 0}/2)</SelectItem>
                        <SelectItem value="Guitarra">Guitarra ({slotCounts['Guitarra'] || 0}/2)</SelectItem>
                        <SelectItem value="Teclado">Teclado ({slotCounts['Teclado'] || 0}/2)</SelectItem>
                        <SelectItem value="Baixo">Baixo ({slotCounts['Baixo'] || 0}/1)</SelectItem>
                        <SelectItem value="Bateria">Bateria ({slotCounts['Bateria'] || 0}/1)</SelectItem>
                        <SelectItem value="Percussão">Percussão ({slotCounts['Percussão'] || 0}/1)</SelectItem>
                        <SelectItem value="Técnico de Som">Técnico de Som</SelectItem>
                        <SelectItem value="Técnico de Imagem">Técnico de Imagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Voluntários Disponíveis {availableVolunteers.length > 0 && `(${availableVolunteers.length})`}
                    </Label>
                    {availableVolunteers.length === 0 ? (
                      <div className="text-center py-8 bg-[#fcf7f6] rounded-lg">
                        <p className="text-sm text-[#6b7280]">Nenhum voluntário disponível para esta data</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                        {availableVolunteers
                          .filter(v => {
                            if (selectedFunction === 'Técnico de Som' || selectedFunction === 'Técnico de Imagem') return true;
                            const funcNormalized = selectedFunction.includes('Vocal') ? 'Vocal' : selectedFunction;
                            return !v.instruments || v.instruments.length === 0 || v.instruments.includes(funcNormalized);
                          })
                          .map(vol => {
                            const alreadyAdded = schedule?.members?.some(m => m.volunteer_id === vol.id && m.function === selectedFunction);
                            return (
                              <button
                                key={vol.id}
                                type="button"
                                disabled={alreadyAdded}
                                onClick={() => addMemberByCard(vol.id)}
                                data-testid={`available-volunteer-card-${vol.id}`}
                                className={`p-3 border rounded-lg text-left transition-all ${
                                  alreadyAdded
                                    ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                                    : 'border-[#e28b95]/30 hover:border-[#c72137] hover:bg-[#fcf7f6] cursor-pointer'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {vol.photo_url ? (
                                    <img src={vol.photo_url} alt={vol.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-[#f7e1e1] flex items-center justify-center text-[#c72137] font-bold flex-shrink-0">
                                      {vol.name.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[#111111] text-sm truncate">{vol.name}</p>
                                    {vol.instruments && vol.instruments.length > 0 && (
                                      <p className="text-xs text-[#6b7280] truncate">{vol.instruments.join(', ')}</p>
                                    )}
                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                      {vol.is_exhausted && (
                                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs" data-testid={`exhaustion-alert-${vol.id}`}>
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                          {vol.monthly_schedule_count}x no mês
                                        </Badge>
                                      )}
                                      {alreadyAdded && (
                                        <Badge className="bg-gray-200 text-gray-700 text-xs">Já escalado</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
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
                    <Label>Música *</Label>
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
                    <Label>
                      Tom para este evento
                      {selectedSong && songs.find(s => s.id === selectedSong) && (
                        <span className="ml-2 text-xs text-[#6b7280]">
                          (Original: {songs.find(s => s.id === selectedSong).original_key})
                        </span>
                      )}
                    </Label>
                    <Select value={songKey} onValueChange={setSongKey}>
                      <SelectTrigger data-testid="song-key-input">
                        <SelectValue placeholder="Selecione o tom" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
                          'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'].map(k => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#6b7280] mt-1">Herda o tom original. Você pode alterar apenas para este evento sem modificar o cadastro da música.</p>
                  </div>
                  {vocals.length > 0 ? (
                    <div>
                      <Label>Vocal Principal (quem irá ministrar) *</Label>
                      <Select value={mainVocal} onValueChange={setMainVocal}>
                        <SelectTrigger data-testid="select-main-vocal">
                          <SelectValue placeholder="Selecione o vocal escalado" />
                        </SelectTrigger>
                        <SelectContent>
                          {vocals.map(v => (
                            <SelectItem key={v.id} value={v.volunteer_id}>
                              {v.volunteer_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#6b7280] mt-1">Apenas vocais escalados nesta escala aparecem aqui.</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">Nenhum vocal escalado ainda. Adicione vocais na aba "Equipe" antes de definir o vocal principal.</p>
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
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <p className="font-semibold text-[#111111] text-base">{song.song_name}</p>
                                      {(() => {
                                        const fullSong = songs.find(s => s.id === song.song_id);
                                        return fullSong?.artist ? <span className="text-xs text-[#6b7280]">— {fullSong.artist}</span> : null;
                                      })()}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <span className={`font-bold ${song.key_for_this_event !== song.original_key ? 'text-[#c72137]' : 'text-[#111111]'}`}>
                                          Tom: {song.key_for_this_event}
                                        </span>
                                        {song.key_for_this_event !== song.original_key && (
                                          <span className="text-xs text-[#6b7280]">(Original: {song.original_key})</span>
                                        )}
                                      </div>
                                      {(() => {
                                        const fullSong = songs.find(s => s.id === song.song_id);
                                        return (
                                          <>
                                            {fullSong?.bpm && <><span className="text-[#6b7280]">•</span><span className="text-[#6b7280]">{fullSong.bpm} BPM</span></>}
                                            {fullSong?.tempo && <><span className="text-[#6b7280]">•</span><span className="text-[#6b7280]">{fullSong.tempo}</span></>}
                                          </>
                                        );
                                      })()}
                                    </div>
                                    <p className="text-sm text-[#6b7280] mt-1">Vocal: <span className="font-medium text-[#111111]">{vocalName}</span></p>
                                    {(() => {
                                      const fullSong = songs.find(s => s.id === song.song_id);
                                      if (!fullSong) return null;
                                      const hasAnyLink = fullSong.link_original || fullSong.link_pt_br || fullSong.link_intro_arrangement;
                                      return (
                                        <>
                                          {hasAnyLink && (
                                            <div className="flex gap-3 mt-2 flex-wrap">
                                              {fullSong.link_original && <a href={fullSong.link_original} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1" data-testid={`setlist-link-orig-${song.id}`}><ExternalLink className="w-3 h-3" />Original</a>}
                                              {fullSong.link_pt_br && <a href={fullSong.link_pt_br} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1" data-testid={`setlist-link-ptbr-${song.id}`}><ExternalLink className="w-3 h-3" />PT-BR</a>}
                                              {fullSong.link_intro_arrangement && <a href={fullSong.link_intro_arrangement} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1" data-testid={`setlist-link-intro-${song.id}`}><ExternalLink className="w-3 h-3" />Arranjo</a>}
                                            </div>
                                          )}
                                          {fullSong.notes && (
                                            <p className="text-xs text-[#6b7280] mt-2 italic border-l-2 border-[#e28b95]/40 pl-2" data-testid={`setlist-notes-${song.id}`}>{fullSong.notes}</p>
                                          )}
                                        </>
                                      );
                                    })()}
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

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Upload, Calendar, Trash2, Mail, Phone, Cake, Edit } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INSTRUMENT_OPTIONS = ['Vocal', 'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Percussão'];

export const VolunteerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [unavailDialogOpen, setUnavailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [unavailDate, setUnavailDate] = useState('');
  const [unavailReason, setUnavailReason] = useState('');
  const [participationHistory, setParticipationHistory] = useState([]);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadVolunteer();
    loadParticipationHistory();
  }, [id]);

  const loadVolunteer = async () => {
    try {
      const { data } = await axios.get(`${API}/volunteers/${id}`, { withCredentials: true });
      setVolunteer(data);
    } catch (error) {
      toast.error('Erro ao carregar voluntário');
      navigate('/volunteers');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipationHistory = async () => {
    try {
      const { data } = await axios.get(`${API}/volunteers/${id}/participation-history`, { withCredentials: true });
      setParticipationHistory(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const openEditDialog = () => {
    setEditForm({
      name: volunteer.name,
      birth_date: volunteer.birth_date,
      email: volunteer.email,
      phone: volunteer.phone || '',
      instruments: volunteer.instruments || [],
      phase: volunteer.phase,
      status: volunteer.status
    });
    setEditDialogOpen(true);
  };

  const toggleEditInstrument = (instrument) => {
    setEditForm(prev => ({
      ...prev,
      instruments: prev.instruments.includes(instrument)
        ? prev.instruments.filter(i => i !== instrument)
        : [...prev.instruments, instrument]
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/volunteers/${id}`, editForm, { withCredentials: true });
      toast.success('Voluntário atualizado com sucesso');
      setEditDialogOpen(false);
      loadVolunteer();
    } catch (error) {
      toast.error('Erro ao atualizar voluntário');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axios.post(`${API}/volunteers/${id}/upload-photo`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVolunteer({ ...volunteer, photo_url: data.photo_url });
      toast.success('Foto atualizada com sucesso');
    } catch (error) {
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  const addUnavailability = async () => {
    if (!unavailDate) return;
    try {
      await axios.post(`${API}/volunteers/${id}/unavailability`, { date: unavailDate, reason: unavailReason }, { withCredentials: true });
      toast.success('Indisponibilidade adicionada');
      setUnavailDialogOpen(false);
      setUnavailDate('');
      setUnavailReason('');
      loadVolunteer();
    } catch (error) {
      toast.error('Erro ao adicionar indisponibilidade');
    }
  };

  const removeUnavailability = async (date) => {
    try {
      await axios.delete(`${API}/volunteers/${id}/unavailability/${date}`, { withCredentials: true });
      toast.success('Indisponibilidade removida');
      loadVolunteer();
    } catch (error) {
      toast.error('Erro ao remover indisponibilidade');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="volunteer-detail-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/volunteers')} data-testid="back-button" className="hover:bg-[#f7e1e1]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#111111] tracking-tight">{volunteer?.name}</h1>
            <p className="text-base text-[#6b7280]">{volunteer?.age} anos</p>
          </div>
        </div>
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openEditDialog} className="bg-[#c72137] hover:bg-[#cf3f57]" data-testid="edit-volunteer-button">
              <Edit className="w-4 h-4 mr-2" />
              Editar Perfil
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Voluntário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveEdit} className="space-y-4" data-testid="edit-volunteer-form">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} required data-testid="edit-name-input" />
                </div>
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={editForm.birth_date || ''} onChange={(e) => setEditForm({...editForm, birth_date: e.target.value})} data-testid="edit-birthdate-input" />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={editForm.email || ''} onChange={(e) => setEditForm({...editForm, email: e.target.value})} required data-testid="edit-email-input" />
                </div>
                <div>
                  <Label>Celular (WhatsApp)</Label>
                  <Input value={editForm.phone || ''} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} placeholder="(00) 00000-0000" data-testid="edit-phone-input" />
                </div>
                <div>
                  <Label>Fase</Label>
                  <Select value={editForm.phase} onValueChange={(v) => setEditForm({...editForm, phase: v})}>
                    <SelectTrigger data-testid="edit-phase-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em Teste">Em Teste</SelectItem>
                      <SelectItem value="Efetivado">Efetivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
                    <SelectTrigger data-testid="edit-status-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Afastado">Afastado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pt-2 border-t border-[#e28b95]/20">
                <Label className="text-base font-semibold text-[#111111] mb-3 block">Instrumentos / Funções</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {INSTRUMENT_OPTIONS.map(instrument => (
                    <label key={instrument} className="flex items-center gap-2 p-3 border border-[#e28b95]/30 rounded-lg cursor-pointer hover:bg-[#fcf7f6]" data-testid={`edit-instrument-${instrument}`}>
                      <Checkbox checked={editForm.instruments?.includes(instrument) || false} onCheckedChange={() => toggleEditInstrument(instrument)} />
                      <span className="text-sm font-medium text-[#111111]">{instrument}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#c72137] hover:bg-[#cf3f57]" data-testid="save-edit-button">Salvar Alterações</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-[#e28b95]/20">
          <CardHeader>
            <CardTitle className="text-lg">Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center">
              {volunteer?.photo_url ? (
                <img src={volunteer.photo_url} alt={volunteer.name} className="w-32 h-32 rounded-full object-cover border-4 border-[#f7e1e1]" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-[#f7e1e1] flex items-center justify-center text-[#c72137] text-5xl font-bold">
                  {volunteer?.name?.charAt(0)}
                </div>
              )}
              <label htmlFor="photo-upload" className="mt-4 cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#f7e1e1] text-[#c72137] hover:bg-[#ecb7bb] rounded-md font-medium transition-colors">
                <Upload className="w-4 h-4" />
                {uploading ? 'Enviando...' : 'Alterar Foto'}
                <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} data-testid="photo-upload-input" />
              </label>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#e28b95]/20">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-[#6b7280]" />
                <span className="text-[#111111]">{volunteer?.email}</span>
              </div>
              {volunteer?.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-[#6b7280]" />
                  <span className="text-[#111111]">{volunteer.phone}</span>
                </div>
              )}
              {volunteer?.birth_date && (
                <div className="flex items-center gap-3 text-sm">
                  <Cake className="w-4 h-4 text-[#6b7280]" />
                  <span className="text-[#111111]">{new Date(volunteer.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-[#e28b95]/20">
              <Badge className={volunteer?.status === 'Ativo' ? 'bg-green-100 text-green-800 hover:bg-green-100' : volunteer?.status === 'Inativo' ? 'bg-gray-100 text-gray-800 hover:bg-gray-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}>
                {volunteer?.status}
              </Badge>
              <Badge className="bg-[#f7e1e1] text-[#c72137] hover:bg-[#f7e1e1]">{volunteer?.phase}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="info" className="w-full">
            <TabsList>
              <TabsTrigger value="info" data-testid="tab-info">Informações</TabsTrigger>
              <TabsTrigger value="unavailability" data-testid="tab-unavailability">
                <Calendar className="w-4 h-4 mr-2" />
                Indisponibilidade
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-6">
              <Card className="border-[#e28b95]/20">
                <CardHeader>
                  <CardTitle className="text-lg">Instrumentos e Funções</CardTitle>
                </CardHeader>
                <CardContent>
                  {(!volunteer?.instruments || volunteer.instruments.length === 0) ? (
                    <p className="text-[#6b7280] text-sm">Nenhum instrumento ou função cadastrado</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {volunteer.instruments.map((inst, idx) => (
                        <Badge key={idx} className="bg-[#f7e1e1] text-[#c72137] hover:bg-[#f7e1e1] text-sm px-3 py-1">
                          {inst}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unavailability" className="mt-6">
              <Card className="border-[#e28b95]/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">Agenda de Indisponibilidade</CardTitle>
                  <Dialog open={unavailDialogOpen} onOpenChange={setUnavailDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-[#c72137] hover:bg-[#cf3f57]" data-testid="add-unavailability-button">Adicionar</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Adicionar Indisponibilidade</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Data</Label>
                          <Input type="date" value={unavailDate} onChange={(e) => setUnavailDate(e.target.value)} data-testid="unavail-date-input" />
                        </div>
                        <div>
                          <Label>Motivo (opcional)</Label>
                          <Textarea value={unavailReason} onChange={(e) => setUnavailReason(e.target.value)} placeholder="Ex: Viagem, compromisso pessoal..." data-testid="unavail-reason-input" />
                        </div>
                        <Button onClick={addUnavailability} className="w-full bg-[#c72137] hover:bg-[#cf3f57]" data-testid="confirm-add-unavailability">Adicionar</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {!volunteer?.unavailability_dates || volunteer.unavailability_dates.length === 0 ? (
                    <p className="text-[#6b7280] text-sm text-center py-8">Nenhuma data de indisponibilidade cadastrada</p>
                  ) : (
                    <div className="space-y-2">
                      {volunteer.unavailability_dates.map((unavail, idx) => (
                        <div key={idx} className="flex items-start justify-between p-3 bg-[#fcf7f6] rounded-lg" data-testid={`unavailability-${idx}`}>
                          <div>
                            <p className="font-medium text-[#111111]">
                              {new Date(unavail.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            {unavail.reason && <p className="text-sm text-[#6b7280] mt-1">{unavail.reason}</p>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeUnavailability(unavail.date)} className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid={`remove-unavailability-${idx}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card className="border-[#e28b95]/20">
                <CardHeader><CardTitle className="text-lg">Histórico de Participação</CardTitle></CardHeader>
                <CardContent>
                  {participationHistory.length === 0 ? (
                    <p className="text-[#6b7280] text-sm text-center py-8">Nenhuma participação registrada ainda</p>
                  ) : (
                    <div className="space-y-3">
                      {participationHistory.map((item, idx) => (
                        <div key={idx} className="p-4 bg-[#fcf7f6] rounded-lg border border-[#e28b95]/20" data-testid={`history-item-${idx}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-[#111111]">{item.schedule_name}</p>
                              <p className="text-sm text-[#6b7280] mt-1">
                                {new Date(item.schedule_date + 'T00:00:00').toLocaleDateString('pt-BR')} às {item.schedule_time}
                              </p>
                              <p className="text-sm text-[#6b7280]">Função: {item.function}</p>
                            </div>
                            <Badge className={item.confirmation_status === 'Confirmado' ? 'bg-green-100 text-green-800 hover:bg-green-100' : item.confirmation_status === 'Preciso de Substituto' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}>
                              {item.confirmation_status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

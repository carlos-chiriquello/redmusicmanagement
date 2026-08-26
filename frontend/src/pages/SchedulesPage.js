import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Calendar as CalendarIcon, Clock, ChevronRight, Users2, Music2, CalendarPlus, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { MonthlyGridView } from './MonthlyGridView';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EVENT_TYPES = ['Domingo', 'Sábado', 'Evento Extra/Conferência'];
const MINISTRIES = ['Red Music', 'Pulse Music'];
const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const emptyForm = {
  name: '', date: '', time: '', event_type: 'Domingo',
  ministry: 'Red Music', has_choir: false, has_orchestra: false, status: 'Rascunho'
};

const STATUS_COLORS = {
  'Disponibilidade': 'bg-blue-100 text-blue-800',
  'Rascunho': 'bg-yellow-100 text-yellow-800',
  'Em Validação': 'bg-orange-100 text-orange-800',
  'Validado': 'bg-green-100 text-green-800',
  'Fechada': 'bg-green-100 text-green-800'
};

export const SchedulesPage = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formData, setFormData] = useState(emptyForm);
  const [batchData, setBatchData] = useState({
    year: new Date().getFullYear(), month: new Date().getMonth() + 1,
    selectedDates: [], time: '19:00', event_type: 'Domingo',
    ministry: 'Red Music', name_prefix: 'Culto', has_choir: false, has_orchestra: false
  });

  useEffect(() => { loadSchedules(); }, []);

  const loadSchedules = async () => {
    try {
      const { data } = await axios.get(`${API}/schedules`, { withCredentials: true });
      setSchedules(data);
    } catch (error) { toast.error('Erro ao carregar escalas'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/schedules`, formData, { withCredentials: true });
      toast.success('Escala criada como Rascunho');
      setDialogOpen(false); loadSchedules(); setFormData(emptyForm);
    } catch (error) { toast.error('Erro ao criar escala'); }
  };

  const toggleBatchDate = (dateStr) => {
    setBatchData(prev => ({
      ...prev,
      selectedDates: prev.selectedDates.includes(dateStr)
        ? prev.selectedDates.filter(d => d !== dateStr)
        : [...prev.selectedDates, dateStr]
    }));
  };

  const handleBatchSubmit = async () => {
    if (batchData.selectedDates.length === 0) { toast.error('Selecione ao menos uma data'); return; }
    try {
      const { data } = await axios.post(`${API}/schedules/batch`, {
        dates: batchData.selectedDates, time: batchData.time,
        event_type: batchData.event_type, ministry: batchData.ministry,
        name_prefix: batchData.name_prefix, has_choir: batchData.has_choir,
        has_orchestra: batchData.has_orchestra
      }, { withCredentials: true });
      toast.success(`${data.total_created} escala(s) criada(s) como Rascunho`);
      setBatchDialogOpen(false);
      setBatchData({ ...batchData, selectedDates: [] });
      loadSchedules();
    } catch (error) { toast.error('Erro ao criar escalas em lote'); }
  };

  const getMonthDays = (year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isPast: new Date(year, month - 1, d) < new Date(new Date().setHours(0,0,0,0))
      });
    }
    return days;
  };

  const monthDays = getMonthDays(batchData.year, batchData.month);

  const schedulesByMonth = useMemo(() => {
    const groups = {};
    schedules.forEach(s => {
      const key = s.date?.substring(0, 7) || 'sem-data';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(key => ({
      key,
      label: key === 'sem-data' ? 'Sem data' : (() => {
        const [y, m] = key.split('-');
        return `${monthNames[parseInt(m) - 1]} ${y}`;
      })(),
      items: groups[key].sort((a, b) => new Date(a.date) - new Date(b.date))
    }));
  }, [schedules]);

  const availableMonths = useMemo(() => schedulesByMonth.map(g => ({ key: g.key, label: g.label })), [schedulesByMonth]);

  return (
    <div className="space-y-6" data-testid="schedules-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Escalas</h1>
          <p className="text-base text-[#6b7280]">Gerencie as programações</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="inline-flex border border-[#e28b95]/30 rounded-md overflow-hidden" data-testid="view-mode-toggle">
            <button onClick={() => setViewMode('list')} data-testid="view-mode-list" className={`px-3 py-2 text-sm font-medium flex items-center gap-1 ${viewMode === 'list' ? 'bg-[#c72137] text-white' : 'bg-white text-[#6b7280] hover:bg-[#fcf7f6]'}`}>
              <List className="w-4 h-4" /> Lista
            </button>
            <button onClick={() => setViewMode('grid')} data-testid="view-mode-grid" className={`px-3 py-2 text-sm font-medium flex items-center gap-1 ${viewMode === 'grid' ? 'bg-[#c72137] text-white' : 'bg-white text-[#6b7280] hover:bg-[#fcf7f6]'}`}>
              <LayoutGrid className="w-4 h-4" /> Grade Mensal
            </button>
          </div>
          <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#c72137] text-[#c72137] hover:bg-[#f7e1e1]" data-testid="batch-schedules-button">
                <CalendarPlus className="w-4 h-4 mr-2" />Criar Escalas do Mês
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Criar Escalas em Lote</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Ano</Label>
                    <Select value={String(batchData.year)} onValueChange={(v) => setBatchData({...batchData, year: parseInt(v), selectedDates: []})}>
                      <SelectTrigger data-testid="batch-year-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{[0,1,2].map(o => { const y = new Date().getFullYear() + o; return <SelectItem key={y} value={String(y)}>{y}</SelectItem>; })}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Mês</Label>
                    <Select value={String(batchData.month)} onValueChange={(v) => setBatchData({...batchData, month: parseInt(v), selectedDates: []})}>
                      <SelectTrigger data-testid="batch-month-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{monthNames.map((m, idx) => <SelectItem key={idx} value={String(idx + 1)}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ministério</Label>
                    <Select value={batchData.ministry} onValueChange={(v) => setBatchData({...batchData, ministry: v})}>
                      <SelectTrigger data-testid="batch-ministry-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{MINISTRIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Horário</Label>
                    <Input type="time" value={batchData.time} onChange={(e) => setBatchData({...batchData, time: e.target.value})} data-testid="batch-time-input" />
                  </div>
                  <div>
                    <Label>Tipo de Evento</Label>
                    <Select value={batchData.event_type} onValueChange={(v) => setBatchData({...batchData, event_type: v})}>
                      <SelectTrigger data-testid="batch-event-type-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prefixo do Nome</Label>
                    <Input value={batchData.name_prefix} onChange={(e) => setBatchData({...batchData, name_prefix: e.target.value})} data-testid="batch-name-prefix-input" />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Selecione as datas ({batchData.selectedDates.length} selecionada{batchData.selectedDates.length !== 1 ? 's' : ''})</Label>
                  <div className="border border-[#e28b95]/30 rounded-lg p-3 bg-[#fcf7f6]">
                    <div className="grid grid-cols-7 gap-1 mb-2">{['D','S','T','Q','Q','S','S'].map((d, i) => <div key={i} className="text-center text-xs font-semibold text-[#6b7280] py-1">{d}</div>)}</div>
                    <div className="grid grid-cols-7 gap-1">
                      {monthDays.map((day, idx) => {
                        if (!day) return <div key={idx} />;
                        const selected = batchData.selectedDates.includes(day.dateStr);
                        return (
                          <button key={idx} type="button" disabled={day.isPast} onClick={() => toggleBatchDate(day.dateStr)} data-testid={`batch-day-${day.day}`}
                            className={`aspect-square rounded-md text-sm font-medium transition-colors ${day.isPast ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : selected ? 'bg-[#c72137] text-white hover:bg-[#cf3f57]' : 'bg-white text-[#111111] hover:bg-[#f7e1e1] border border-[#e28b95]/30'}`}>{day.day}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 border border-[#e28b95]/20 rounded-lg"><Label className="text-sm">Coral?</Label><Switch checked={batchData.has_choir} onCheckedChange={(v) => setBatchData({...batchData, has_choir: v})} data-testid="batch-choir-switch" /></div>
                  <div className="flex items-center justify-between p-3 border border-[#e28b95]/20 rounded-lg"><Label className="text-sm">Orquestra?</Label><Switch checked={batchData.has_orchestra} onCheckedChange={(v) => setBatchData({...batchData, has_orchestra: v})} data-testid="batch-orchestra-switch" /></div>
                </div>
                <Button onClick={handleBatchSubmit} className="w-full bg-[#c72137] hover:bg-[#cf3f57]" data-testid="batch-submit-button">Criar {batchData.selectedDates.length} escala{batchData.selectedDates.length !== 1 ? 's' : ''}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormData(emptyForm); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-schedule-button" className="bg-[#c72137] hover:bg-[#cf3f57]">
                <Plus className="w-4 h-4 mr-2" />Nova Escala
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova Escala</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="schedule-form">
                <div>
                  <Label>Nome da Programação *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required data-testid="schedule-name-input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ministério *</Label>
                    <Select value={formData.ministry} onValueChange={(v) => setFormData({...formData, ministry: v})}>
                      <SelectTrigger data-testid="schedule-ministry-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{MINISTRIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de Culto/Evento *</Label>
                    <Select value={formData.event_type} onValueChange={(v) => setFormData({...formData, event_type: v})}>
                      <SelectTrigger data-testid="schedule-event-type-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data *</Label>
                    <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required data-testid="schedule-date-input" />
                  </div>
                  <div>
                    <Label>Horário *</Label>
                    <Input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} required data-testid="schedule-time-input" />
                  </div>
                </div>
                <div className="pt-2 border-t border-[#e28b95]/20 space-y-3">
                  <div className="flex items-center justify-between p-3 border border-[#e28b95]/20 rounded-lg"><Label className="text-sm">Coral?</Label><Switch checked={formData.has_choir} onCheckedChange={(v) => setFormData({...formData, has_choir: v})} data-testid="schedule-choir-switch" /></div>
                  <div className="flex items-center justify-between p-3 border border-[#e28b95]/20 rounded-lg"><Label className="text-sm">Orquestra?</Label><Switch checked={formData.has_orchestra} onCheckedChange={(v) => setFormData({...formData, has_orchestra: v})} data-testid="schedule-orchestra-switch" /></div>
                </div>
                <Button type="submit" className="w-full bg-[#c72137] hover:bg-[#cf3f57]" data-testid="schedule-submit-button">Criar como Rascunho</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <Card className="border-[#e28b95]/20" data-testid="grid-view-container">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3 flex-wrap">
              <Label className="text-sm font-semibold text-[#111111]">Mês:</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-64" data-testid="grid-month-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableMonths.length === 0 && <SelectItem value={selectedMonth}>{(() => { const [y,m] = selectedMonth.split('-'); return `${monthNames[parseInt(m)-1]} ${y}`; })()}</SelectItem>}
                  {availableMonths.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <MonthlyGridView schedules={schedules.filter(s => s.date?.startsWith(selectedMonth))} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#e28b95]/20">
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin"></div></div>
            ) : schedulesByMonth.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-[#e28b95] mx-auto mb-4" />
                <p className="text-[#6b7280]" data-testid="no-schedules">Nenhuma escala criada ainda</p>
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={schedulesByMonth.slice(0, 2).map(g => g.key)} data-testid="schedules-accordion">
                {schedulesByMonth.map(group => (
                  <AccordionItem key={group.key} value={group.key} className="border-b border-[#e28b95]/20" data-testid={`accordion-item-${group.key}`}>
                    <AccordionTrigger className="hover:no-underline hover:bg-[#fcf7f6] px-2">
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="w-5 h-5 text-[#c72137]" />
                        <span className="font-semibold text-[#111111] capitalize">{group.label}</span>
                        <Badge className="bg-[#f7e1e1] text-[#c72137] hover:bg-[#f7e1e1]">{group.items.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {group.items.map((schedule) => (
                          <Link key={schedule.id} to={`/schedules/${schedule.id}`} className="block" data-testid={`schedule-card-${schedule.id}`}>
                            <div className="p-4 border border-[#e28b95]/20 rounded-lg hover:border-[#c72137]/40 hover:bg-[#fcf7f6] transition-all group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-lg bg-[#f7e1e1] flex items-center justify-center text-[#c72137]"><CalendarIcon className="w-6 h-6" /></div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-semibold text-[#111111] group-hover:text-[#c72137] transition-colors">{schedule.name}</h3>
                                      <Badge className={`${STATUS_COLORS[schedule.status] || 'bg-gray-100 text-gray-800'}`}>{schedule.status || 'Rascunho'}</Badge>
                                      {schedule.ministry && <Badge className="bg-[#f7e1e1] text-[#c72137] hover:bg-[#f7e1e1]">{schedule.ministry}</Badge>}
                                      {schedule.event_type && <Badge variant="outline" className="border-[#e28b95]/40 text-[#6b7280]">{schedule.event_type}</Badge>}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-[#6b7280] mt-1">
                                      <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" />{new Date(schedule.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{schedule.time}</span>
                                      {schedule.has_choir && <span className="flex items-center gap-1 text-[#c72137]"><Users2 className="w-4 h-4" />Coral</span>}
                                      {schedule.has_orchestra && <span className="flex items-center gap-1 text-[#c72137]"><Music2 className="w-4 h-4" />Orquestra</span>}
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-[#6b7280] group-hover:text-[#c72137] transition-colors" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar as CalendarIcon, Clock, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const SchedulesPage = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: ''
  });

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const { data } = await axios.get(`${API}/schedules`, { withCredentials: true });
      setSchedules(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      toast.error('Erro ao carregar escalas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/schedules`, formData, { withCredentials: true });
      toast.success('Escala criada com sucesso');
      setDialogOpen(false);
      loadSchedules();
      resetForm();
    } catch (error) {
      toast.error('Erro ao criar escala');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', date: '', time: '' });
  };

  return (
    <div className="space-y-6" data-testid="schedules-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Escalas</h1>
          <p className="text-base text-[#6b7280]">Gerencie as programações</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-schedule-button" className="bg-[#c72137] hover:bg-[#cf3f57]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Escala
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Escala</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="schedule-form">
              <div>
                <Label>Nome da Programação</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Ex: Culto de Domingo"
                  data-testid="schedule-name-input"
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                  data-testid="schedule-date-input"
                />
              </div>
              <div>
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  required
                  data-testid="schedule-time-input"
                />
              </div>
              <Button type="submit" className="w-full bg-[#c72137] hover:bg-[#cf3f57]" data-testid="schedule-submit-button">
                Criar Escala
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-[#e28b95]/20 p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-[#e28b95] mx-auto mb-4" />
            <p className="text-[#6b7280]" data-testid="no-schedules">Nenhuma escala criada ainda</p>
            <p className="text-sm text-[#6b7280] mt-2">Clique em "Nova Escala" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <Link
                key={schedule.id}
                to={`/schedules/${schedule.id}`}
                className="block"
                data-testid={`schedule-card-${schedule.id}`}
              >
                <div className="p-4 border border-[#e28b95]/20 rounded-lg hover:border-[#c72137]/40 hover:bg-[#fcf7f6] transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[#f7e1e1] flex items-center justify-center text-[#c72137]">
                        <CalendarIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#111111] group-hover:text-[#c72137] transition-colors">
                          {schedule.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-[#6b7280] mt-1">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {new Date(schedule.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {schedule.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#6b7280] group-hover:text-[#c72137] transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

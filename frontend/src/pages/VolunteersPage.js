import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const VolunteersPage = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    email: '',
    phone: '',
    instruments: [],
    functions: [],
    phase: 'Em Teste',
    status: 'Ativo',
    tags: []
  });

  useEffect(() => {
    loadVolunteers();
  }, []);

  const loadVolunteers = async () => {
    try {
      const { data } = await axios.get(`${API}/volunteers`, { withCredentials: true });
      setVolunteers(data);
    } catch (error) {
      toast.error('Erro ao carregar voluntários');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/volunteers`, formData, { withCredentials: true });
      toast.success('Voluntário criado com sucesso');
      setDialogOpen(false);
      loadVolunteers();
      resetForm();
    } catch (error) {
      toast.error('Erro ao criar voluntário');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      birth_date: '',
      email: '',
      phone: '',
      instruments: [],
      functions: [],
      phase: 'Em Teste',
      status: 'Ativo',
      tags: []
    });
  };

  const filteredVolunteers = volunteers.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="volunteers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Voluntários</h1>
          <p className="text-base text-[#6b7280]">Gerencie os membros do ministério</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-volunteer-button" className="bg-[#c72137] hover:bg-[#cf3f57]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Voluntário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Voluntário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="volunteer-form">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    data-testid="volunteer-name-input"
                  />
                </div>
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                    required
                    data-testid="volunteer-birthdate-input"
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    data-testid="volunteer-email-input"
                  />
                </div>
                <div>
                  <Label>Celular (WhatsApp)</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    data-testid="volunteer-phone-input"
                  />
                </div>
                <div>
                  <Label>Fase</Label>
                  <Select value={formData.phase} onValueChange={(v) => setFormData({...formData, phase: v})}>
                    <SelectTrigger data-testid="volunteer-phase-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em Teste">Em Teste</SelectItem>
                      <SelectItem value="Efetivado">Efetivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger data-testid="volunteer-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Afastado">Afastado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#c72137] hover:bg-[#cf3f57]" data-testid="volunteer-submit-button">
                Criar Voluntário
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-[#e28b95]/20 p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b7280]" />
            <Input
              placeholder="Buscar voluntários..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="volunteers-search-input"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredVolunteers.length === 0 ? (
          <p className="text-center text-[#6b7280] py-12" data-testid="no-volunteers">Nenhum voluntário encontrado</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVolunteers.map((volunteer) => (
              <Link
                key={volunteer.id}
                to={`/volunteers/${volunteer.id}`}
                className="block"
                data-testid={`volunteer-card-${volunteer.id}`}
              >
                <div className="p-4 border border-[#e28b95]/20 rounded-lg hover:border-[#c72137]/40 hover:bg-[#fcf7f6] transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#f7e1e1] flex items-center justify-center text-[#c72137] font-bold flex-shrink-0">
                      {volunteer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#111111] truncate group-hover:text-[#c72137] transition-colors">{volunteer.name}</h3>
                      <p className="text-sm text-[#6b7280]">{volunteer.age} anos</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          volunteer.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                          volunteer.status === 'Inativo' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {volunteer.status}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#f7e1e1] text-[#c72137]">
                          {volunteer.phase}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#6b7280] group-hover:text-[#c72137] transition-colors flex-shrink-0" />
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

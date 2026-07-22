import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, ChevronRight, Filter, X } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INSTRUMENT_OPTIONS = [
  'Vocal',
  'Violão',
  'Guitarra',
  'Baixo',
  'Bateria',
  'Teclado',
  'Percussão'
];

const emptyForm = {
  name: '',
  birth_date: '',
  email: '',
  phone: '',
  instruments: [],
  functions: [],
  phase: 'Em Teste',
  status: 'Ativo',
  tags: []
};

export const VolunteersPage = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    phase: 'all',
    instrument: 'all'
  });
  const [formData, setFormData] = useState(emptyForm);

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

  const toggleInstrument = (instrument) => {
    setFormData(prev => ({
      ...prev,
      instruments: prev.instruments.includes(instrument)
        ? prev.instruments.filter(i => i !== instrument)
        : [...prev.instruments, instrument]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.instruments.length === 0) {
      toast.error('Selecione pelo menos um instrumento/função');
      return;
    }
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
    setFormData(emptyForm);
  };

  const clearFilters = () => {
    setFilters({ status: 'all', phase: 'all', instrument: 'all' });
    setSearch('');
  };

  const filteredVolunteers = volunteers.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filters.status === 'all' || v.status === filters.status;
    const matchesPhase = filters.phase === 'all' || v.phase === filters.phase;
    const matchesInstrument = filters.instrument === 'all' || (v.instruments && v.instruments.includes(filters.instrument));
    return matchesSearch && matchesStatus && matchesPhase && matchesInstrument;
  });

  const hasActiveFilters = filters.status !== 'all' || filters.phase !== 'all' || filters.instrument !== 'all' || search !== '';

  return (
    <div className="space-y-6" data-testid="volunteers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Voluntários</h1>
          <p className="text-base text-[#6b7280]">Gerencie os membros do ministério</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
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
                  <Label>Nome completo *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    data-testid="volunteer-name-input"
                  />
                </div>
                <div>
                  <Label>Data de Nascimento *</Label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                    required
                    data-testid="volunteer-birthdate-input"
                  />
                </div>
                <div>
                  <Label>E-mail *</Label>
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

              <div className="pt-2 border-t border-[#e28b95]/20">
                <Label className="text-base font-semibold text-[#111111] mb-3 block">Instrumentos / Funções *</Label>
                <p className="text-xs text-[#6b7280] mb-3">Selecione todos os instrumentos/funções que este voluntário executa</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {INSTRUMENT_OPTIONS.map(instrument => (
                    <label
                      key={instrument}
                      className="flex items-center gap-2 p-3 border border-[#e28b95]/30 rounded-lg cursor-pointer hover:bg-[#fcf7f6] transition-colors"
                      data-testid={`instrument-option-${instrument}`}
                    >
                      <Checkbox
                        checked={formData.instruments.includes(instrument)}
                        onCheckedChange={() => toggleInstrument(instrument)}
                      />
                      <span className="text-sm font-medium text-[#111111]">{instrument}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#c72137] hover:bg-[#cf3f57]" data-testid="volunteer-submit-button">
                Criar Voluntário
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-[#e28b95]/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b7280]" />
                <Input
                  placeholder="Buscar voluntários..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="volunteers-search-input"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setFilterOpen(!filterOpen)}
                className={`border-[#e28b95] ${filterOpen ? 'bg-[#f7e1e1] text-[#c72137]' : 'text-[#c72137]'}`}
                data-testid="filter-button"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-[#6b7280] hover:text-[#c72137]"
                  data-testid="clear-filters-button"
                >
                  <X className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>

            {filterOpen && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-[#fcf7f6] rounded-lg border border-[#e28b95]/20" data-testid="filters-panel">
                <div>
                  <Label className="text-sm font-medium text-[#111111] mb-2">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                    <SelectTrigger data-testid="filter-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Afastado">Afastado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#111111] mb-2">Fase</Label>
                  <Select value={filters.phase} onValueChange={(v) => setFilters({...filters, phase: v})}>
                    <SelectTrigger data-testid="filter-phase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="Em Teste">Em Teste</SelectItem>
                      <SelectItem value="Efetivado">Efetivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#111111] mb-2">Instrumento</Label>
                  <Select value={filters.instrument} onValueChange={(v) => setFilters({...filters, instrument: v})}>
                    <SelectTrigger data-testid="filter-instrument">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {INSTRUMENT_OPTIONS.map(i => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredVolunteers.length === 0 ? (
              <p className="text-center text-[#6b7280] py-12" data-testid="no-volunteers">
                {hasActiveFilters ? 'Nenhum voluntário encontrado com os filtros aplicados' : 'Nenhum voluntário encontrado'}
              </p>
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
                        {volunteer.photo_url ? (
                          <img src={volunteer.photo_url} alt={volunteer.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#f7e1e1] flex items-center justify-center text-[#c72137] font-bold flex-shrink-0">
                            {volunteer.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#111111] truncate group-hover:text-[#c72137] transition-colors">{volunteer.name}</h3>
                          <p className="text-sm text-[#6b7280]">{volunteer.age} anos</p>
                          {volunteer.instruments && volunteer.instruments.length > 0 && (
                            <p className="text-xs text-[#6b7280] truncate mt-1">
                              {volunteer.instruments.slice(0, 3).join(', ')}
                              {volunteer.instruments.length > 3 && ` +${volunteer.instruments.length - 3}`}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2 flex-wrap">
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
        </CardContent>
      </Card>
    </div>
  );
};

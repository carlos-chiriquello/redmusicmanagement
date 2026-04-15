import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const SongsPage = () => {
  const [songs, setSongs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    original_key: '',
    bpm: '',
    tempo: '',
    tags: [],
    links: [],
    sheet_music_url: '',
    notes: ''
  });

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      const { data } = await axios.get(`${API}/songs`, { withCredentials: true });
      setSongs(data);
    } catch (error) {
      toast.error('Erro ao carregar músicas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/songs`, {...formData, bpm: parseInt(formData.bpm) || null}, { withCredentials: true });
      toast.success('Música criada com sucesso');
      setDialogOpen(false);
      loadSongs();
      resetForm();
    } catch (error) {
      toast.error('Erro ao criar música');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      original_key: '',
      bpm: '',
      tempo: '',
      tags: [],
      links: [],
      sheet_music_url: '',
      notes: ''
    });
  };

  const filteredSongs = songs.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="songs-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Repertório</h1>
          <p className="text-base text-[#6b7280]">Banco de músicas do ministério</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-song-button" className="bg-[#c72137] hover:bg-[#cf3f57]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Música
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Música</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="song-form">
              <div>
                <Label>Nome da música</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="song-name-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tom original</Label>
                  <Input
                    value={formData.original_key}
                    onChange={(e) => setFormData({...formData, original_key: e.target.value})}
                    required
                    placeholder="Ex: C, D, Em"
                    data-testid="song-key-input"
                  />
                </div>
                <div>
                  <Label>BPM</Label>
                  <Input
                    type="number"
                    value={formData.bpm}
                    onChange={(e) => setFormData({...formData, bpm: e.target.value})}
                    placeholder="Ex: 120"
                    data-testid="song-bpm-input"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#c72137] hover:bg-[#cf3f57]" data-testid="song-submit-button">
                Criar Música
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
              placeholder="Buscar músicas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="songs-search-input"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredSongs.length === 0 ? (
          <p className="text-center text-[#6b7280] py-12" data-testid="no-songs">Nenhuma música encontrada</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSongs.map((song) => (
              <div key={song.id} className="p-4 border border-[#e28b95]/20 rounded-lg hover:border-[#c72137]/40 transition-colors" data-testid={`song-card-${song.id}`}>
                <h3 className="font-semibold text-[#111111]">{song.name}</h3>
                <p className="text-sm text-[#6b7280] mt-1">
                  {song.original_key} {song.bpm && `• ${song.bpm} BPM`}
                </p>
                {song.last_played_date && (
                  <p className="text-xs text-[#6b7280] mt-2">
                    Última vez tocada: {new Date(song.last_played_date).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

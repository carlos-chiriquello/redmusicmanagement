import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Music, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MUSIC_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'
];

const TEMPO_OPTIONS = ['3/4', '4/4', '6/8'];

const emptyForm = {
  name: '',
  artist: '',
  original_key: 'C',
  bpm: '',
  tempo: '4/4',
  tags: [],
  link_original: '',
  link_pt_br: '',
  link_intro_arrangement: '',
  sheet_music_url: '',
  notes: ''
};

export const SongsPage = () => {
  const [songs, setSongs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

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
      const payload = {
        ...formData,
        bpm: formData.bpm ? parseInt(formData.bpm) : null
      };

      if (editingSong) {
        await axios.put(`${API}/songs/${editingSong.id}`, payload, { withCredentials: true });
        toast.success('Música atualizada com sucesso');
      } else {
        await axios.post(`${API}/songs`, payload, { withCredentials: true });
        toast.success('Música criada com sucesso');
      }
      setDialogOpen(false);
      loadSongs();
      resetForm();
    } catch (error) {
      toast.error(editingSong ? 'Erro ao atualizar música' : 'Erro ao criar música');
    }
  };

  const openEditDialog = (song) => {
    setEditingSong(song);
    setFormData({
      name: song.name || '',
      artist: song.artist || '',
      original_key: song.original_key || 'C',
      bpm: song.bpm ? String(song.bpm) : '',
      tempo: song.tempo || '4/4',
      tags: song.tags || [],
      link_original: song.link_original || '',
      link_pt_br: song.link_pt_br || '',
      link_intro_arrangement: song.link_intro_arrangement || '',
      sheet_music_url: song.sheet_music_url || '',
      notes: song.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (songId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta música?')) return;
    try {
      await axios.delete(`${API}/songs/${songId}`, { withCredentials: true });
      toast.success('Música excluída com sucesso');
      loadSongs();
    } catch (error) {
      toast.error('Erro ao excluir música');
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingSong(null);
  };

  const filteredSongs = songs.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.artist && s.artist.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6" data-testid="songs-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Repertório</h1>
          <p className="text-base text-[#6b7280]">Banco de músicas do ministério</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-song-button" className="bg-[#c72137] hover:bg-[#cf3f57]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Música
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSong ? 'Editar Música' : 'Nova Música'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="song-form">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome da música *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    data-testid="song-name-input"
                  />
                </div>
                <div>
                  <Label>Artista</Label>
                  <Input
                    value={formData.artist}
                    onChange={(e) => setFormData({...formData, artist: e.target.value})}
                    placeholder="Ex: Hillsong, Elevation..."
                    data-testid="song-artist-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tom *</Label>
                  <Select value={formData.original_key} onValueChange={(v) => setFormData({...formData, original_key: v})}>
                    <SelectTrigger data-testid="song-key-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {MUSIC_KEYS.map(key => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div>
                  <Label>Compasso</Label>
                  <Select value={formData.tempo} onValueChange={(v) => setFormData({...formData, tempo: v})}>
                    <SelectTrigger data-testid="song-tempo-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPO_OPTIONS.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-[#e28b95]/20">
                <p className="text-sm font-semibold text-[#c72137]">Links de Referência</p>
                <div>
                  <Label>Link Original</Label>
                  <Input
                    value={formData.link_original}
                    onChange={(e) => setFormData({...formData, link_original: e.target.value})}
                    placeholder="YouTube/Spotify da versão original"
                    data-testid="song-link-original"
                  />
                </div>
                <div>
                  <Label>Link Versão PT-BR</Label>
                  <Input
                    value={formData.link_pt_br}
                    onChange={(e) => setFormData({...formData, link_pt_br: e.target.value})}
                    placeholder="YouTube/Spotify da versão em português"
                    data-testid="song-link-ptbr"
                  />
                </div>
                <div>
                  <Label>Link Adicional (opcional)</Label>
                  <Input
                    value={formData.link_intro_arrangement}
                    onChange={(e) => setFormData({...formData, link_intro_arrangement: e.target.value})}
                    placeholder="Link de referência para introdução ou arranjo"
                    data-testid="song-link-intro"
                  />
                </div>
              </div>

              <div>
                <Label>Link do Multitracks (opicional)</Label>
                <Input
                  value={formData.sheet_music_url}
                  onChange={(e) => setFormData({...formData, sheet_music_url: e.target.value})}
                  placeholder="Link da música no Multitracks"
                  data-testid="song-sheet-input"
                />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Anotações gerais sobre a execução da música..."
                  rows={4}
                  data-testid="song-notes-input"
                />
              </div>

              <Button type="submit" className="w-full bg-[#c72137] hover:bg-[#cf3f57]" data-testid="song-submit-button">
                {editingSong ? 'Salvar Alterações' : 'Criar Música'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-[#e28b95]/20">
        <CardContent className="p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b7280]" />
              <Input
                placeholder="Buscar músicas por nome ou artista..."
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
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-[#e28b95] mx-auto mb-4" />
              <p className="text-[#6b7280]" data-testid="no-songs">Nenhuma música encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
                  className="p-4 border border-[#e28b95]/20 rounded-lg hover:border-[#c72137]/40 transition-colors group"
                  data-testid={`song-card-${song.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#111111] truncate">{song.name}</h3>
                      {song.artist && (
                        <p className="text-sm text-[#6b7280] truncate">{song.artist}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(song)}
                        className="h-8 w-8 p-0 text-[#c72137] hover:bg-[#f7e1e1]"
                        data-testid={`edit-song-${song.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(song.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        data-testid={`delete-song-${song.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#f7e1e1] text-[#c72137]">
                      Tom: {song.original_key}
                    </span>
                    {song.bpm && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {song.bpm} BPM
                      </span>
                    )}
                    {song.tempo && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {song.tempo}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {song.link_original && (
                      <a href={song.link_original} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1" data-testid={`song-link-orig-${song.id}`}>
                        <ExternalLink className="w-3 h-3" /> Original
                      </a>
                    )}
                    {song.link_pt_br && (
                      <a href={song.link_pt_br} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1" data-testid={`song-link-ptbr-${song.id}`}>
                        <ExternalLink className="w-3 h-3" /> PT-BR
                      </a>
                    )}
                    {song.link_intro_arrangement && (
                      <a href={song.link_intro_arrangement} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1" data-testid={`song-link-intro-${song.id}`}>
                        <ExternalLink className="w-3 h-3" /> Intro
                      </a>
                    )}
                  </div>

                  {song.last_played_date && (
                    <p className="text-xs text-[#6b7280] mt-3 pt-3 border-t border-[#e28b95]/10">
                      Última vez tocada: {new Date(song.last_played_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

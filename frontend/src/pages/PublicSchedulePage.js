import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Music, Users, ExternalLink } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_12820478-844c-49f1-b6bd-7ca7ece32718/artifacts/wn18b1ap_Logomarca-Babecue.png';

const CATEGORY_ORDER = ['Vocais', 'Violões', 'Guitarras', 'Teclados', 'Baixo', 'Percussão', 'Bateria'];
const FUNCTION_TO_CATEGORY = {
  'Vocal': 'Vocais', 'Backing Vocal': 'Vocais', 'Violão': 'Violões',
  'Guitarra': 'Guitarras', 'Teclado': 'Teclados', 'Baixo': 'Baixo',
  'Percussão': 'Percussão', 'Bateria': 'Bateria'
};

export const PublicSchedulePage = () => {
  const { token } = useParams();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API}/public/schedules/${token}`)
      .then(res => setSchedule(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Escala não encontrada'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fcf7f6]"><div className="w-12 h-12 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcf7f6] p-6" data-testid="public-schedule-error">
        <Card className="max-w-md border-[#e28b95]/20">
          <CardContent className="p-8 text-center">
            <img src={LOGO_URL} alt="Red Music" className="h-16 mx-auto mb-4" />
            <p className="text-lg font-semibold text-[#111111] mb-2">Link inválido</p>
            <p className="text-sm text-[#6b7280]">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const members = schedule?.members || [];
  const setlist = schedule?.setlist || [];
  const vocals = members.filter(m => m.function.toLowerCase().includes('vocal'));

  const grouped = {};
  CATEGORY_ORDER.forEach(cat => { grouped[cat] = []; });
  members.forEach(m => {
    const cat = FUNCTION_TO_CATEGORY[m.function];
    if (cat) grouped[cat].push(m);
  });

  return (
    <div className="min-h-screen bg-[#fcf7f6]" data-testid="public-schedule-page">
      <header className="bg-white border-b border-[#e28b95]/20 py-4 px-6 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <img src={LOGO_URL} alt="Red Music" className="h-10" />
          <Badge className="bg-[#f7e1e1] text-[#c72137] hover:bg-[#f7e1e1]">Somente Leitura</Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-xl border border-[#e28b95]/20 p-6">
          <div className="flex items-center gap-2 mb-2">
            {schedule.ministry && <Badge className="bg-[#c72137] text-white hover:bg-[#c72137] text-sm">{schedule.ministry}</Badge>}
            {schedule.status && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{schedule.status}</Badge>}
          </div>
          <h1 className="text-3xl font-bold text-[#111111] mb-2" data-testid="public-schedule-title">{schedule.name}</h1>
          <div className="flex items-center gap-4 text-sm text-[#6b7280] flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(schedule.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{schedule.time}</span>
            {schedule.event_type && <span>• {schedule.event_type}</span>}
          </div>
        </div>

        <Card className="border-[#e28b95]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Users className="w-5 h-5 text-[#c72137]" />Equipe Escalada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {CATEGORY_ORDER.map(cat => {
                const catMembers = grouped[cat] || [];
                if (catMembers.length === 0) return null;
                return (
                  <div key={cat} data-testid={`public-category-${cat}`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#c72137] mb-2">{cat}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {catMembers.map((m, idx) => (
                        <div key={idx} className="px-3 py-2 bg-[#fcf7f6] rounded-lg border border-[#e28b95]/20 flex items-center justify-between">
                          <span className="text-sm text-[#111111]">{m.volunteer_name}</span>
                          {m.function === 'Backing Vocal' && <span className="text-[10px] text-[#6b7280]">BV</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {members.length === 0 && <p className="text-sm text-[#6b7280] text-center py-4">Nenhum membro escalado ainda</p>}
            </div>
          </CardContent>
        </Card>

        {setlist.length > 0 && (
          <Card className="border-[#e28b95]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Music className="w-5 h-5 text-[#c72137]" />Setlist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {setlist.map((entry, idx) => {
                  const full = entry.song_full || {};
                  const vocalName = vocals.find(v => v.volunteer_id === entry.main_vocal_volunteer_id)?.volunteer_name || 'Não definido';
                  return (
                    <div key={idx} className="p-4 bg-[#fcf7f6] rounded-lg border border-[#e28b95]/20" data-testid={`public-song-${idx}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#c72137] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{idx + 1}</div>
                        <div className="flex-1">
                          <p className="font-semibold text-[#111111]">{entry.song_name}</p>
                          {full.artist && <p className="text-xs text-[#6b7280] mb-1">{full.artist}</p>}
                          <div className="flex items-center gap-3 text-sm mt-1 flex-wrap">
                            <span className={`font-bold ${entry.key_for_this_event !== entry.original_key ? 'text-[#c72137]' : 'text-[#111111]'}`}>Tom: {entry.key_for_this_event}</span>
                            {entry.key_for_this_event !== entry.original_key && <span className="text-xs text-[#6b7280]">(Original: {entry.original_key})</span>}
                            {full.bpm && <><span className="text-[#6b7280]">•</span><span className="text-[#6b7280]">{full.bpm} BPM</span></>}
                            {full.tempo && <><span className="text-[#6b7280]">•</span><span className="text-[#6b7280]">{full.tempo}</span></>}
                          </div>
                          <p className="text-sm text-[#6b7280] mt-1">Vocal: <span className="font-medium text-[#111111]">{vocalName}</span></p>
                          <div className="flex gap-3 mt-2 flex-wrap">
                            {full.link_original && <a href={full.link_original} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />Original</a>}
                            {full.link_pt_br && <a href={full.link_pt_br} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />PT-BR</a>}
                            {full.link_intro_arrangement && <a href={full.link_intro_arrangement} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />Arranjo</a>}
                          </div>
                          {full.notes && <p className="text-xs text-[#6b7280] mt-2 italic border-l-2 border-[#e28b95]/40 pl-2">{full.notes}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <footer className="text-center text-xs text-[#6b7280] py-4">Red Music - Sistema de Gestão de Ministério de Louvor</footer>
      </main>
    </div>
  );
};

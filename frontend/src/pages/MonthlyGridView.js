import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_ORDER = ['Vocais', 'Violões', 'Guitarras', 'Teclados', 'Baixo', 'Percussão', 'Bateria'];

const FUNCTION_TO_CATEGORY = {
  'Vocal': 'Vocais',
  'Backing Vocal': 'Vocais',
  'Violão': 'Violões',
  'Guitarra': 'Guitarras',
  'Teclado': 'Teclados',
  'Baixo': 'Baixo',
  'Percussão': 'Percussão',
  'Bateria': 'Bateria'
};

const WEEKDAY_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const SLOT_LIMITS = { 'Vocais': 6, 'Violões': 2, 'Guitarras': 2, 'Teclados': 2, 'Baixo': 1, 'Percussão': 1, 'Bateria': 1 };

export const MonthlyGridView = ({ schedules }) => {
  const [scheduleDetails, setScheduleDetails] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllDetails();
  }, [schedules]);

  const loadAllDetails = async () => {
    if (schedules.length === 0) { setLoading(false); return; }
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        schedules.map(s => axios.get(`${API}/schedules/${s.id}`, { withCredentials: true }))
      );
      const detailsMap = {};
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') detailsMap[schedules[idx].id] = res.value.data;
      });
      setScheduleDetails(detailsMap);
    } finally { setLoading(false); }
  };

  const sortedSchedules = [...schedules].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (loading) {
    return (
      <div className="flex justify-center py-16" data-testid="monthly-grid-loading">
        <Loader2 className="w-8 h-8 text-[#c72137] animate-spin" />
      </div>
    );
  }

  if (sortedSchedules.length === 0) {
    return (
      <div className="text-center py-16" data-testid="monthly-grid-empty">
        <p className="text-[#6b7280]">Nenhuma escala neste mês</p>
        <p className="text-sm text-[#6b7280] mt-2">Use "Criar Escalas do Mês" para gerar todas as programações de uma vez</p>
      </div>
    );
  }

  const getMembersByCategory = (scheduleId) => {
    const detail = scheduleDetails[scheduleId];
    if (!detail?.members) return {};
    const grouped = {};
    CATEGORY_ORDER.forEach(cat => { grouped[cat] = []; });
    detail.members.forEach(m => {
      const cat = FUNCTION_TO_CATEGORY[m.function];
      if (cat && grouped[cat]) {
        grouped[cat].push({ ...m, is_backing: m.function === 'Backing Vocal' });
      }
    });
    return grouped;
  };

  const formatDateHeader = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return { short: `${day}/${month}`, weekday: WEEKDAY_PT[d.getDay()] };
  };

  return (
    <div className="overflow-x-auto" data-testid="monthly-grid-view">
      <div className="inline-flex gap-3 min-w-full pb-2">
        {sortedSchedules.map(s => {
          const grouped = getMembersByCategory(s.id);
          const dateHeader = formatDateHeader(s.date);
          return (
            <div key={s.id} className="flex-shrink-0 w-56 border border-[#e28b95]/30 rounded-lg overflow-hidden bg-white" data-testid={`grid-column-${s.id}`}>
              <div className="bg-[#c72137] text-white p-3 text-center">
                <p className="text-lg font-bold">{dateHeader.short}</p>
                <p className="text-xs opacity-90">{dateHeader.weekday}</p>
                {s.ministry && <p className="text-[10px] mt-1 opacity-80">{s.ministry}</p>}
              </div>
              <div className="divide-y divide-[#e28b95]/20">
                {CATEGORY_ORDER.map(cat => {
                  const members = grouped[cat] || [];
                  const limit = SLOT_LIMITS[cat];
                  const emptySlots = Math.max(0, limit - members.length);
                  return (
                    <div key={cat} className="p-2" data-testid={`grid-category-${cat}-${s.id}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#c72137] mb-1.5">{cat}</p>
                      <div className="space-y-1">
                        {members.map((m, idx) => (
                          <div key={idx} className="px-2 py-1 bg-[#fcf7f6] rounded text-xs text-[#111111] border border-[#e28b95]/20 truncate" title={m.volunteer_name}>
                            {m.volunteer_name}
                            {m.is_backing && <span className="text-[9px] text-[#6b7280] ml-1">(BV)</span>}
                          </div>
                        ))}
                        {Array.from({ length: emptySlots }).map((_, idx) => (
                          <div key={`empty-${idx}`} className="px-2 py-1 bg-gray-50 rounded text-xs text-gray-300 border border-dashed border-gray-200">—</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

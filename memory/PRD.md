# Red Music — Sistema de Gestão de Ministério de Louvor

## Problema original
Sistema web completo para o ministério "Red Music": gestão de voluntários, escalas, repertório e setlists.
Design minimalista/moderno, fonte Montserrat, paleta vermelho/branco/off-white. Idioma: Português.

## Arquitetura
- Backend: FastAPI + Motor (MongoDB), JWT em cookie (`/app/backend/server.py`)
- Frontend: React + Tailwind + Shadcn UI + React Router (`/app/frontend/src`)
- Coleções: users, volunteers, schedules, schedule_members, setlists, songs, chat_messages

## Implementado
- Autenticação JWT, seed de admin
- Voluntários: CRUD, foto, instrumentos, indisponibilidade, filtros e cards
- Escalas: criação individual e em lote (mês), ministérios (Red Music / Pulse Music),
  alertas de esgotamento (2x/mês), workflow Rascunho → Em Validação → Validado,
  visão Lista (accordion por mês) e Grade Mensal (ordem: Vocais > Violões > Guitarras > Teclados > Baixo > Percussão > Bateria)
- Repertório: tom original, BPM, compasso, links de referência, observações
- Setlists: tom por evento (herda o original), vocal principal do dia, cards ricos, drag & drop
- Dashboard: métricas, top músicas, alertas de burnout
- Compartilhamento público de escala individual (`/public/schedule/:token`)

### 01/06/2026 (sessão atual)
- **Auto-cadastro público de voluntários**: `POST /api/public/volunteers/register` + página `/cadastro-voluntario`
  (cria voluntário em "Em Teste" e usuário com role "Voluntário"). Link NÃO aparece no login;
  admin copia em Voluntários → "Copiar Link de Cadastro".
- **RBAC**: role "Voluntário" só acessa Escalas e Repertório em modo leitura.
  Frontend: `AdminRoute` em App.js, menu filtrado em Layout.js, botões de criação/edição ocultos.
  Backend: dependência `require_admin` (403) em todos os endpoints de escrita + dashboard.
- **Compartilhar Mês**: modal em Escalas com filtro de Ministério + Mês → link público
  `/public/mes/:ministry/:yearMonth` renderizando a Grade Mensal (mesmo formato do sistema) + Setlists colapsáveis.
  Backend: `GET /api/public/monthly/{ministry}/{year_month}` (enriquece membros e setlists).

## Backlog
- P1: Voluntário marcar a própria indisponibilidade / confirmar presença
- P1: Aprovação explícita de cadastros públicos pela liderança (hoje o acesso é imediato)
- P2: Notificações por e-mail (RESEND_API_KEY ausente — fluxo dormente)
- P2: Exportar grade mensal em PDF/imagem

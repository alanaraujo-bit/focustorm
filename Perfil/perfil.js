import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://tjocgefyjgyndzahcwwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqb2NnZWZ5amd5bmR6YWhjd3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjExMzgsImV4cCI6MjA2MjIzNzEzOH0.xQxMpAXNbwzrc03WToTCOGv_6v1OSEvdSVwzPEzQGr0';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const userIdParam = params.get('id');
  console.log('ID do usuário na URL:', userIdParam); // Corrigido para userIdParam

  if (!userIdParam) {
    document.getElementById('perfil-nome').textContent = '❌ ID do usuário não informado na URL.';
    return;
  }

  const userId = userIdParam.trim(); // Remover espaços em branco, se houver

  try {
    // Buscar nome do usuário
    const { data: usuario, error: erroUsuario } = await supabase
      .from('usuarios')
      .select('name')
      .eq('id', userId)
      .single();

    if (erroUsuario || !usuario) {
      console.log('Erro ao buscar usuário:', erroUsuario?.message);
      document.getElementById('perfil-nome').textContent = '❌ Usuário não encontrado.';
      return;
    }

    document.getElementById('perfil-nome').textContent = `👤 ${usuario.name}`;
    document.getElementById('perfil-avatar').textContent = usuario.name.charAt(0).toUpperCase();

    // Buscar sessões
    const { data: sessoes, error: erroSessoes } = await supabase
      .from('sessoes1')
      .select('*')
      .eq('usuario_id', userId);

    if (erroSessoes || !sessoes || sessoes.length === 0) {
      document.getElementById('perfil-total-focus').textContent = '0m';
      document.getElementById('perfil-days-active').textContent = '0';
      document.getElementById('perfil-streak-days').textContent = '0';
      return;
    }

    // Total focado
let totalMin = 0;
const diasAtivos = new Set();
const diasComFoco = {};

sessoes.forEach(sessao => {
  if (sessao.tipo === 'Foco' && sessao.duracao >= 5) {
    const dataSessao = new Date(sessao.data);
    const dataFormatada = dataSessao.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    totalMin += sessao.duracao;
    diasAtivos.add(dataFormatada);
    diasComFoco[dataFormatada] = true;
  }
});



    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;
    document.getElementById('perfil-total-focus').textContent = `${horas > 0 ? `${horas}h ` : ''}${minutos}m`;
    document.getElementById('perfil-days-active').textContent = diasAtivos.size;

    // Cálculo de sequência (streak)
    const diasOrdenados = [...diasAtivos].map(d => {
      const [dia, mes, ano] = d.split('/');
      return new Date(+ano, mes - 1, +dia);
    }).sort((a, b) => a - b);

    let streak = 0;
    let maxStreak = 0;
    for (let i = 0; i < diasOrdenados.length; i++) {
      if (i === 0 || (diasOrdenados[i] - diasOrdenados[i - 1]) === 86400000) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
      }
    }

    document.getElementById('perfil-streak-days').textContent = maxStreak;

    // Gráfico da semana
    const agora = new Date();
    const inicioSemana = new Date(agora);
    inicioSemana.setDate(agora.getDate() - agora.getDay());

    const dadosSemana = {};
    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicioSemana);
      dia.setDate(inicioSemana.getDate() + i);
      const label = dia.toLocaleDateString('pt-BR');
      dadosSemana[label] = 0;
    }

sessoes.forEach(sessao => {
  if (sessao.tipo === 'Foco' && sessao.duracao >= 5) {
    const data = new Date(sessao.data);
    const label = data.toLocaleDateString('pt-BR');
    if (dadosSemana[label] !== undefined) {
      dadosSemana[label] += sessao.duracao || 0;
    }
  }
});


    const labels = Object.keys(dadosSemana);
    const valores = Object.values(dadosSemana);

    const ctx = document.getElementById('perfil-graph').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Minutos focados',
          data: valores,
          backgroundColor: '#00ffc3',
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => {
                const totalMin = Math.floor(value);
                const hours = Math.floor(totalMin / 60);
                const mins = totalMin % 60;
                return `${hours > 0 ? `${hours}h ` : ''}${mins}m`;
              }
            }
          }
        }
      }
    });

  } catch (err) {
    console.error('Erro ao carregar perfil:', err.message);
    document.getElementById('perfil-nome').textContent = '❌ Erro ao carregar perfil.';
  }
});
document.addEventListener('DOMContentLoaded', async () => {
  const supabaseUrl = 'https://tjocgefyjgyndzahcwwd.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqb2NnZWZ5amd5bmR6YWhjd3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjExMzgsImV4cCI6MjA2MjIzNzEzOH0.xQxMpAXNbwzrc03WToTCOGv_6v1OSEvdSVwzPEzQGr0'; // sua key
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  const { data: { user }, error: erroUser } = await supabase.auth.getUser();

if (erroUser || !user) {
  document.getElementById('perfil-nome').textContent = '❌ Usuário não autenticado.';
  return;
}

const userId = user.id;


  try {
    // Buscar nome do usuário
    const { data: usuario, error: erroUsuario } = await supabase
      .from('usuarios')
      .select('name')
      .eq('id', userId)
      .single();

    if (erroUsuario || !usuario) {
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
      const data = new Date(sessao.data);
      const diaStr = data.toLocaleDateString('pt-BR');
      totalMin += sessao.duracao;
      diasAtivos.add(diaStr);
      diasComFoco[diaStr] = true;
    });

    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;
    document.getElementById('perfil-total-focus').textContent = `${horas}h ${minutos}m`;
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
    const inicioSemana = new Date();
    inicioSemana.setDate(agora.getDate() - agora.getDay());

    const dadosSemana = {};
    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicioSemana);
      dia.setDate(inicioSemana.getDate() + i);
      const label = dia.toLocaleDateString('pt-BR');
      dadosSemana[label] = 0;
    }

    sessoes.forEach(sessao => {
      const data = new Date(sessao.data);
      const label = data.toLocaleDateString('pt-BR');
      if (dadosSemana[label] !== undefined) {
        dadosSemana[label] += sessao.duracao;
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
              callback: value => `${Math.floor(value / 60)}h ${value % 60}m`
            }
          }
        }
      }
    });

  } catch (err) {
    console.error('Erro ao carregar perfil:', err);
    document.getElementById('perfil-nome').textContent = '❌ Erro ao carregar perfil.';
  }
});

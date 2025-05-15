const supabaseUrl = 'https://tjocgefyjgyndzahcwwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqb2NnZWZ5amd5bmR6YWhjd3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjExMzgsImV4cCI6MjA2MjIzNzEzOH0.xQxMpAXNbwzrc03WToTCOGv_6v1OSEvdSVwzPEzQGr0';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const authContainer = document.getElementById('auth-container');
const timerDisplay = document.getElementById('timer-display');
const focusInput = document.getElementById('focus-time');
const breakInput = document.getElementById('break-time');
const listaHistorico = document.getElementById('lista-historico');
const dataInicio = document.getElementById('data-inicio');
const dataFim = document.getElementById('data-fim');
const rankingList = document.getElementById('ranking-list');
const valorTotalFiltrado = document.getElementById('valor-total-filtrado');
const cardTotalFiltrado = document.getElementById('card-total-filtrado');

let timer;
let isRunning = false;
let isFocusTime = true;
let remainingTime = 0;
let tipoGraficoAtual = 'bar';
function gerarSaudacao() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return '☀️ Bom dia';
  if (hora >= 12 && hora < 18) return '🌤️ Boa tarde';
  return '🌙 Boa noite';
}
 
async function registrarNomeUsuario() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("Usuário não autenticado ao tentar registrar.");
    return;
  }

  console.log("Tentando registrar:", user.id);

  const { data: existente, error: erroBusca } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id);

  if (erroBusca) {
    console.error("Erro ao buscar usuário:", erroBusca.message);
    return;
  }

  if (!existente || existente.length === 0) {
    const nomeBruto =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "Usuário";

    const nome = nomeBruto.trim().replace(/\n/g, '');

    const { error: erroInsert } = await supabase.from('usuarios').insert([
      { id: user.id, name: nome }
    ]);

    if (erroInsert) {
      console.error("❌ Erro ao inserir usuário:", erroInsert.message);
    } else {
      console.log("✅ Usuário inserido com sucesso!");
    }
  } else {
    console.log("Usuário já existe na tabela.");
  }
}

function mostrarTelaLogin() {
  authContainer.innerHTML = `
<div style="text-align: center; margin-bottom: 1.5rem;">
  <span class="logo" style="font-size: 3rem; color: #00ffc3;">⚡</span>
  <h2 style="margin: 0.5rem 0 0; color: white; font-size: 1.5rem;">Bem-vindo ao FocuStorm</h2>
  <p style="color: #ccc; font-size: 0.9rem; margin-top: 0.3rem;">A constância é mais forte que a motivação.</p>
</div>

    <div class="input-group">
      <i class="fas fa-envelope input-icon"></i>
      <input type="text" id="login-name" placeholder="E-mail" />
    </div>
    <div class="input-group">
      <div class="senha-container">
        <i class="fas fa-lock input-icon"></i>
        <input type="password" id="login-password" placeholder="Senha" />
        <button type="button" id="toggleSenhaLogin"><i class="fas fa-eye"></i></button>
      </div>
    </div>
    <div class="options">
      <label><input type="checkbox" id="remember-me" /> Lembre-me</label>
      <a href="#" class="forgot-password">Esqueceu a senha?</a>
    </div>
    <button class="btn-auth green" id="login-btn">ENTRAR</button>
    <div class="divider"><span>OU</span></div>
    <button class="btn-auth google" id="google-login"><i class="fab fa-google"></i> Entrar com Google</button>
    <p class="signup-prompt">Não tem uma conta? <a href="#" id="register-link">Cadastre-se</a></p>
  `;
  authContainer.classList.remove("hidden");
  document.getElementById("menu-topo").classList.add("hidden");
  document.getElementById("section-pomodoro").classList.add("hidden");
  document.getElementById("section-historico").classList.add("hidden");
  document.getElementById("section-ranking").classList.add("hidden");

  // Reaplica os eventos depois de injetar o HTML
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-name').value;
    const senha = document.getElementById('login-password').value;
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (loginError) alert("Erro ao fazer login: " + loginError.message);
    else {
      await registrarNomeUsuario();
      verificarLogin();
    }
  });

  document.getElementById('toggleSenhaLogin').addEventListener('click', () => {
    const loginPass = document.getElementById('login-password');
    loginPass.type = loginPass.type === "password" ? "text" : "password";
    const eyeIcon = document.getElementById('toggleSenhaLogin').querySelector('i');
    eyeIcon.classList.toggle('fa-eye');
    eyeIcon.classList.toggle('fa-eye-slash');
  });

  document.getElementById('google-login').addEventListener('click', async () => {
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          prompt: 'select_account',
          queryParams: { access_type: 'offline', prompt: 'consent' },
        }
      });
      if (oauthError) alert("Erro ao logar com Google: " + oauthError.message);
      else {
        const checarUsuario = setInterval(async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            clearInterval(checarUsuario);
            await registrarNomeUsuario();
            verificarLogin();
          }
        }, 1000);
      }
    } catch (err) {
      alert("Erro inesperado: " + err.message);
    }
  });

  // Adiciona a classe ready para exibir a tela de login
  document.body.classList.add("ready");
}

async function verificarLogin() {
  const userResponse = await supabase.auth.getUser();

  if (!userResponse || !userResponse.data || !userResponse.data.user) {
    mostrarTelaLogin();
    return;
  }

  const user = userResponse.data.user;
  await registrarNomeUsuario();

  // Exibir nome do usuário
  const nomeUsuario = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Usuário";
const saudacao = gerarSaudacao();
document.getElementById('usuario-logado').innerHTML = `
  ${saudacao}, <strong>${nomeUsuario}</strong><br>
  <span style="font-size: 0.9rem; color: #aaa;">O que vamos focar hoje?</span>
`;

  // Tudo certo, mostra interface principal
  authContainer.classList.add("hidden");
  document.getElementById("menu-topo").classList.remove("hidden");
  document.getElementById("section-pomodoro").classList.remove("hidden");
  document.getElementById("section-historico").classList.add("hidden");
  document.getElementById("section-ranking").classList.add("hidden");

  mostrarHistorico();
  mostrarRanking();
  renderizarGrafico('semana');
  resetTimer();
  atualizarResumo();

  // Adiciona a classe ready para exibir o conteúdo principal
  document.body.classList.add("ready");
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(remainingTime);

  const totalTime = isFocusTime
    ? parseInt(focusInput.value) * 60
    : parseInt(breakInput.value) * 60;
  const progress = remainingTime / totalTime;

  const circle = document.querySelector('.ring-progress');
  const radius = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * progress;
  circle.style.strokeDashoffset = offset;

  circle.style.stroke = isFocusTime ? '#00ffc3' : '#3b82f6';

  // 👇 Aqui está o controle do botão "Pular Pausa"
  const skipBtn = document.getElementById('skip-break-btn');
  if (skipBtn) {
    if (!isFocusTime && isRunning) {
      skipBtn.classList.remove('hidden');
    } else {
      skipBtn.classList.add('hidden');
    }
  }
}

function startTimer() {
  if (isRunning) return;
  if (remainingTime <= 0) {
    const minutes = isFocusTime ? parseInt(focusInput.value) : parseInt(breakInput.value);
    remainingTime = minutes * 60;
  }
  isRunning = true;
  timer = setInterval(() => {
    remainingTime--;
    updateDisplay();
    if (remainingTime <= 0) {
      clearInterval(timer);
      isRunning = false;
      const tipoAtual = isFocusTime ? 'Foco' : 'Pausa';
      const duracao = isFocusTime ? parseInt(focusInput.value) : parseInt(breakInput.value);
      salvarSessao(tipoAtual, duracao);
      isFocusTime = !isFocusTime;
      alert(isFocusTime ? 'Hora de focar!' : 'Hora de descansar!');
      startTimer();
      mostrarHistorico();
      mostrarRanking();
      renderizarGrafico("semana");
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer);
  isRunning = false;
  atualizarBotoes('pausado');
}

function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  isFocusTime = true;
  remainingTime = parseInt(focusInput.value) * 60;
  updateDisplay();
}

async function mostrarHistorico(filtro = 'todos') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: sessoes, error: fetchError } = await supabase
    .from('sessoes1')
    .select('*')
    .eq('usuario_id', user.id)
    .order('data', { ascending: false });

  if (fetchError) {
    console.error('Erro ao carregar histórico:', fetchError);
    return;
  }

  let filtrado = [...sessoes];
  if (filtro === 'personalizado') {
    const inicio = new Date(dataInicio.value);
    const fim = new Date(dataFim.value);
    fim.setHours(23, 59, 59, 999);
    filtrado = filtrado.filter(sessao => {
      const dataSessao = new Date(sessao.data);
      return dataSessao >= inicio && dataSessao <= fim;
    });
  }

  listaHistorico.innerHTML = '';
  if (filtrado.length === 0) {
    listaHistorico.innerHTML = '<li>Nenhuma sessão encontrada.</li>';
    cardTotalFiltrado.classList.add("hidden");
    return;
  }

  let totalFocoM = 0;
  filtrado.forEach(sessao => {
    const dataFormatada = new Date(sessao.data).toLocaleDateString('pt-BR');
    const item = document.createElement('li');
    item.innerHTML = `
      ${dataFormatada} - ${sessao.tipo} de ${sessao.duracao} m
      <button onclick="editarSessao('${sessao.id}', ${sessao.duracao})">✏️</button>
    `;
    listaHistorico.appendChild(item);

    totalFocoM += sessao.duracao;
  });

  const horas = Math.floor(totalFocoM / 60);
  const minutos = totalFocoM % 60;
  valorTotalFiltrado.textContent = `${horas}:${String(minutos).padStart(2, '0')}`;
  cardTotalFiltrado.classList.remove("hidden");
}

function renderizarGraficoFoco(dados, labels) {
  if (window.graficoFoco) window.graficoFoco.destroy();

  const ctx = document.getElementById('focus-graph').getContext('2d');
  window.graficoFoco = new Chart(ctx, {
    type: tipoGraficoAtual,
    data: {
      labels: labels,
      datasets: [{
        label: 'Tempo focado',
        data: dados,
        backgroundColor: '#00ffc3',
        borderColor: '#00ffc3',
        borderWidth: 2,
        tension: 0.3,
        fill: tipoGraficoAtual === 'line' ? false : true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#ccc',
            stepSize: 1,
            callback: value => {
              const totalM = Math.floor(value);
              const hours = Math.floor(totalM / 60);
              const minutes = totalM % 60;
              return `${hours}h ${minutes}m`;
            }
          },
          title: { display: true, text: 'Horas', color: '#ccc' }
        },
        x: {
          ticks: {
            color: '#ccc',
            maxRotation: 45,
            minRotation: 45,
            callback: (value, index) => {
              // Mostrar apenas alguns rótulos para evitar sobreposição no celular
              if (window.innerWidth <= 768 && index % 2 !== 0) return '';
              const label = labels[index];
              // Formatar a data para ser mais curta (ex.: "11/05")
              return label.split('/').slice(0, 2).join('/');
            }
          }
        }
      },
      plugins: {
        legend: { labels: { color: '#ccc' } },
        tooltip: {
          callbacks: {
            label: context => {
              const totalM = context.parsed.y;
              const hours = Math.floor(totalM / 60);
              const minutes = Math.round(totalM % 60);
              return `${hours}h ${minutes}m`;
            }
          }
        }
      }
    }
  });
}

async function renderizarGrafico(periodo = 'semana') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: sessoes, error: fetchError } = await supabase
    .from('sessoes1')
    .select('*')
    .eq('usuario_id', user.id);

  if (fetchError) {
    console.error('Erro ao carregar gráfico:', fetchError);
    return;
  }

  const agora = new Date();
  let inicio;
  if (periodo === 'semana') {
    const dia = agora.getDay();
    inicio = new Date(agora);
    inicio.setDate(agora.getDate() - dia);
  } else if (periodo === 'mes') {
    inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  } else {
    inicio = new Date(agora.getFullYear(), 0, 1);
  }

  const dadosPorDia = {};
  sessoes.forEach(sessao => {
    const dataSessao = new Date(sessao.data);
    if (dataSessao >= inicio) {
      const dia = dataSessao.toLocaleDateString('pt-BR');
      if (!dadosPorDia[dia]) dadosPorDia[dia] = 0;
      dadosPorDia[dia] += sessao.duracao;
    }
  });

let labels = [];

if (periodo === 'semana') {
  const diasSemana = [];
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0 = domingo
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - diaSemana);

  for (let i = 0; i < 7; i++) {
    const data = new Date(inicioSemana);
    data.setDate(inicioSemana.getDate() + i);
    const label = data.toLocaleDateString('pt-BR');
    diasSemana.push(label);
  }

  labels = diasSemana;
} else if (periodo === 'mes') {
  const ano = agora.getFullYear();
  const mes = agora.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const data = new Date(ano, mes, dia);
    labels.push(data.toLocaleDateString('pt-BR'));
  }
} else if (periodo === 'ano') {
  const ano = agora.getFullYear();

  const mesesMap = {
    0: 'jan', 1: 'fev', 2: 'mar', 3: 'abr', 4: 'mai', 5: 'jun',
    6: 'jul', 7: 'ago', 8: 'set', 9: 'out', 10: 'nov', 11: 'dez'
  };

  labels = Object.values(mesesMap);
  const dadosPorMes = {};
  for (let i = 0; i < 12; i++) {
    dadosPorMes[i] = 0;
  }

  sessoes.forEach(sessao => {
    const data = new Date(sessao.data);
    if (data.getFullYear() === ano) {
      const mes = data.getMonth();
      dadosPorMes[mes] += sessao.duracao;
    }
  });

  const valores = Object.keys(dadosPorMes).map(m => dadosPorMes[m]);
  renderizarGraficoFoco(valores, labels);
  return;
}


const valores = labels.map(label => dadosPorDia[label] || 0);
renderizarGraficoFoco(valores, labels);

}

async function atualizarResumo() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: sessoes, error: fetchError } = await supabase
    .from('sessoes1')
    .select('*')
    .eq('usuario_id', user.id);

  if (fetchError) {
    console.error('Erro ao carregar resumo:', fetchError);
    return;
  }

  const diasUnicos = new Set();
  let totalM = 0;
  const diasComFoco = {};

  sessoes.forEach(sessao => {
    const dataSessao = new Date(sessao.data);
    const dataFormatada = dataSessao.toLocaleDateString('pt-BR');

    totalM += sessao.duracao;
    diasUnicos.add(dataFormatada);
    diasComFoco[dataFormatada] = true;
  });

  const horas = Math.floor(totalM / 60);
  const minutos = totalM % 60;
  document.getElementById('total-focus').textContent = `${horas > 0 ? horas + 'h ' : ''}${minutos}m`;

  document.getElementById('days-active').textContent = diasUnicos.size;

  const diasOrdenados = Object.keys(diasComFoco)
    .map(d => {
      const [dia, mes, ano] = d.split('/');
      return new Date(+ano, mes - 1, +dia);
    })
    .sort((a, b) => a - b);

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

  document.getElementById('streak-days').textContent = maxStreak;
}

function atualizarCronometroReset() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth();

  const resetDate = new Date(ano, mes + 1, 0, 23, 59, 59);
  const diff = resetDate - agora;

  if (diff <= 0) {
    document.getElementById('contador-reset').textContent = "Ranking resetando...";
    return;
  }

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutos = Math.floor((diff / (1000 * 60)) % 60);
  const segundos = Math.floor((diff / 1000) % 60);

  document.getElementById('contador-reset').textContent =
    `⏳ Ranking reseta em: ${dias}d ${horas}h ${minutos}m ${segundos}s`;
}

setInterval(atualizarCronometroReset, 1000);
let paginaRanking = 0;
const tamanhoPagina = 20;
let rankingCompleto = [];

async function carregarRankingCompleto() {
  try {
    const response = await fetch('https://focustorm-backend.onrender.com/ranking');
    const dados = await response.json();

    rankingCompleto = dados.map(user => [user.nome, user.tempoTotal]);
    paginaRanking = 0;
    document.getElementById('ranking-list').innerHTML = '';
    carregarMaisRanking();
  } catch (err) {
    console.error('Erro ao buscar ranking via backend:', err);
    document.getElementById('ranking-list').innerHTML = '<li>Erro ao carregar ranking.</li>';
  }
}

function carregarMaisRanking() {
  const inicio = paginaRanking * tamanhoPagina;
  const fim = inicio + tamanhoPagina;
  const rankingList = document.getElementById('ranking-list');
  const pagina = rankingCompleto.slice(inicio, fim);

  pagina.forEach(([usuario, minutos], index) => {
    const li = document.createElement('li');
    const posicao = inicio + index + 1;
    let medalha = '';
    if (posicao === 1) medalha = '🥇';
    else if (posicao === 2) medalha = '🥈';
    else if (posicao === 3) medalha = '🥉';

    const horas = Math.floor(minutos / 60);
    const m = minutos % 60;
    const tempoTexto = `${horas > 0 ? `${horas}h ` : ''}${m}m`;

    li.innerHTML = `
      <span>${medalha} ${posicao}º <strong>${usuario}</strong></span>
      <span>⏱️ ${tempoTexto}</span>
    `;
    rankingList.appendChild(li);
  });

  paginaRanking++;
}

document.getElementById('ranking-list').addEventListener('scroll', (e) => {
  const el = e.target;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
    carregarMaisRanking();
  }
});

async function mostrarRanking() {
  try {
    const { data: sessoes, error: erroSessoes } = await supabase
      .from('sessoes1')
      .select('*');

    if (erroSessoes || !sessoes) {
      console.error('Erro ao buscar sessões:', erroSessoes?.message);
      rankingList.innerHTML = '<li>Erro ao carregar sessões.</li>';
      return;
    }

    const totais = {};

    sessoes.forEach(sessao => {
      if (sessao.tipo === 'Foco') {
        if (!totais[sessao.usuario_id]) totais[sessao.usuario_id] = 0;
        totais[sessao.usuario_id] += sessao.duracao;
      }
    });

    const { data: usuarios, error: erroUsuarios } = await supabase
      .from('usuarios')
      .select('id, name');

    if (erroUsuarios || !usuarios) {
      console.error('Erro ao buscar usuários:', erroUsuarios?.message);
      rankingList.innerHTML = '<li>Erro ao carregar usuários.</li>';
      return;
    }

    const mapaNomes = {};
    usuarios.forEach(user => {
      mapaNomes[user.id] = user.name;
    });

    const ranking = Object.entries(totais).sort((a, b) => b[1] - a[1]);

    rankingList.innerHTML = '';
    ranking.forEach(([usuarioId, totalM], index) => {
      const nome = mapaNomes[usuarioId] || `Usuário (${usuarioId})`;
      const horas = Math.floor(totalM / 60);
      const minutos = totalM % 60;
      const tempoTexto = `${horas > 0 ? `${horas}h ` : ''}${minutos}m`;

      let medalha = '';
      if (index === 0) medalha = '🥇';
      else if (index === 1) medalha = '🥈';
      else if (index === 2) medalha = '🥉';

      const li = document.createElement('li');
      li.innerHTML = `
        <span>${medalha} ${index + 1}º <strong>${nome}</strong></span>
        <span>⏱️ ${tempoTexto}</span>
      `;
      rankingList.appendChild(li);
    });
  } catch (err) {
    console.error('Erro inesperado ao carregar ranking:', err);
    rankingList.innerHTML = '<li>Erro inesperado ao carregar ranking.</li>';
  }
}

async function salvarSessao(tipo, duracao) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("Usuário não autenticado.");
    return;
  }

  await registrarNomeUsuario();

  const { data: usuarioExiste } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!usuarioExiste) {
    console.error("Usuário ainda não está na tabela 'usuarios', não será possível salvar a sessão.");
    return;
  }

  const { error: insertError } = await supabase.from('sessoes1').insert([{
    usuario_id: user.id,
    duracao: duracao,
    data: new Date().toISOString(),
    tipo: tipo
  }]);

  if (insertError) {
    console.error('❌ Erro ao salvar sessão:', insertError.message);
  } else {
    console.log('✅ Sessão salva com sucesso!');
  }
}

async function editarSessao(id, duracaoAtual) {
  const novoValor = prompt(`Editar duração (m):`, duracaoAtual);
  const novaDuracao = parseInt(novoValor);

  if (!isNaN(novaDuracao) && novaDuracao >= 0) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Usuário não autenticado!");

    const { error: erroUpdate } = await supabase
      .from('sessoes1')
      .update({ duracao: novaDuracao })
      .eq('id', id)
      .eq('usuario_id', user.id);
    if (erroUpdate) {
      alert("Erro ao atualizar sessão!");
      console.error(erroUpdate);
    } else {
      alert("Sessão atualizada!");
      mostrarHistorico();
      mostrarRanking();
    }
  } else {
    alert("Valor inválido.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  verificarLogin();

  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resetBtn = document.getElementById('reset-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const btnFiltroHistorico = document.getElementById('btn-filtrar-historico');
  const btnLimparFiltro = document.getElementById('btn-limpar-filtro');
  const btnTipoGrafico = document.getElementById('btn-tipo-grafico');
  const logoutBtn = document.getElementById('logout-btn');
  const skipBreakBtn = document.getElementById('skip-break-btn');
  if (skipBreakBtn) {
    skipBreakBtn.addEventListener('click', pularPausa);
  }

  function pularPausa() {
    if (!isFocusTime) {
      clearInterval(timer);
      isRunning = false;
      isFocusTime = true;
      remainingTime = parseInt(focusInput.value) * 60;
      updateDisplay();
      atualizarBotoes('inicio');
      alert('⏭️ Pausa pulada! Hora de focar!');
    }
  }

  focusInput.addEventListener('input', () => {
    if (focusInput.value < 1) focusInput.value = 1; // Validação para evitar valores inválidos
    if (!isRunning && isFocusTime) {
      remainingTime = parseInt(focusInput.value) * 60;
      updateDisplay();
    }
  });

  breakInput.addEventListener('input', () => {
    if (breakInput.value < 1) breakInput.value = 1; // Validação para evitar valores inválidos
    if (!isRunning && !isFocusTime) {
      remainingTime = parseInt(breakInput.value) * 60;
      updateDisplay();
      document.getElementById('skip-break-btn').classList.toggle('hidden', isFocusTime || !isRunning);
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      location.reload(); // Recarrega a página e volta para o login
    });
  }

  if (startBtn) startBtn.addEventListener('click', () => { startTimer(); atualizarBotoes('focando'); });
  if (pauseBtn) pauseBtn.addEventListener('click', () => { pauseTimer(); atualizarBotoes('pausado'); });
  if (resumeBtn) resumeBtn.addEventListener('click', () => {
    isRunning = true;
    timer = setInterval(() => {
      remainingTime--;
      updateDisplay();
      if (remainingTime <= 0) {
        clearInterval(timer);
        isRunning = false;
        const tipoAtual = isFocusTime ? 'Foco' : 'Pausa';
        const duracao = isFocusTime ? parseInt(focusInput.value) : parseInt(breakInput.value);
        salvarSessao(tipoAtual, duracao);
        isFocusTime = !isFocusTime;
        alert(isFocusTime ? 'Hora de focar!' : 'Hora de descansar!');
        startTimer();
        mostrarHistorico();
        mostrarRanking();
        renderizarGrafico("semana");
      }
    }, 1000);
    atualizarBotoes('focando');
  });
  if (resetBtn) resetBtn.addEventListener('click', () => { resetTimer(); atualizarBotoes('inicio'); });
  if (btnFiltroHistorico) btnFiltroHistorico.addEventListener('click', () => mostrarHistorico('personalizado'));
  if (btnLimparFiltro) btnLimparFiltro.addEventListener('click', () => {
    document.getElementById('data-inicio').value = '';
    document.getElementById('data-fim').value = '';
    mostrarHistorico();
  });
  if (btnTipoGrafico) btnTipoGrafico.addEventListener('click', () => {
    tipoGraficoAtual = tipoGraficoAtual === 'bar' ? 'line' : 'bar';
    btnTipoGrafico.textContent = `Tipo: ${tipoGraficoAtual === 'bar' ? 'Barra' : 'Linha'}`;
    const periodoAtual = document.querySelector('.btn-period.active')?.dataset.period || 'semana';
    renderizarGrafico(periodoAtual);
  });

  document.querySelectorAll('.btn-period').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const periodo = btn.dataset.period;
      renderizarGrafico(periodo);
    });
  });

  // Botões de navegação
  const navButtons = document.querySelectorAll(".nav-btn");
  const sections = {
    pomodoro: document.getElementById("section-pomodoro"),
    historico: document.getElementById("section-historico"),
    ranking: document.getElementById("section-ranking"),
  };

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.section;
      Object.keys(sections).forEach(key => {
        if (key === target) {
          sections[key].classList.remove("hidden");
        } else {
          sections[key].classList.add("hidden");
        }
      });
      navButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      if (target === "historico") {
        mostrarHistorico();
        renderizarGrafico("semana");
        atualizarResumo();
      }
      if (target === "ranking") {
        carregarRankingCompleto();
      }
    });
  });

  // Abas do histórico
  document.querySelectorAll('.history-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.history-tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(`history-${target}`).classList.remove('hidden');
    });
  });

  const registerLink = document.getElementById('register-link');
  if (registerLink) {
    registerLink.addEventListener('click', () => {
      authContainer.innerHTML = `
        <div class="logo-container">
          <span class="logo">⚡</span>
          <h2>Criar Conta</h2>
        </div>
        <div class="input-group">
          <i class="fas fa-user input-icon"></i>
          <input type="text" id="register-name" placeholder="Usuário" />
        </div>
        <div class="input-group">
          <i class="fas fa-envelope input-icon"></i>
          <input type="email" id="register-email" placeholder="E-mail" />
        </div>
        <div class="input-group">
          <div class="senha-container">
            <i class="fas fa-lock input-icon"></i>
            <input type="password" id="register-password" placeholder="Senha" />
            <button type="button" id="toggleSenhaRegister"><i class="fas fa-eye"></i></button>
          </div>
        </div>
        <button class="btn-auth green" id="register-btn">CADASTRAR</button>
        <div class="divider">
          <span>OU</span>
        </div>
        <button class="btn-auth google" id="google-register"><i class="fab fa-google"></i> Cadastrar com Google</button>
        <p class="signup-prompt">Já tem uma conta? <a href="#" id="login-link">Entrar</a></p>
      `;
      document.getElementById('register-btn').addEventListener('click', async () => {
        const email = document.getElementById('register-email').value;
        const senha = document.getElementById('register-password').value;
        const { error: signUpError } = await supabase.auth.signUp({ email, password: senha });
        if (signUpError) {
          alert("Erro ao cadastrar: " + signUpError.message);
        } else {
          alert("Cadastro feito! Verifique seu e-mail para confirmar.");
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: senha });
          if (loginError) {
            alert("Erro ao logar após cadastro: " + loginError.message);
          } else {
            await registrarNomeUsuario();
            verificarLogin();
          }
        }
      });

      document.getElementById('toggleSenhaRegister').addEventListener('click', () => {
        const registerPass = document.getElementById('register-password');
        registerPass.type = registerPass.type === "password" ? "text" : "password";
        document.getElementById('toggleSenhaRegister').querySelector('i').classList.toggle('fa-eye');
        document.getElementById('toggleSenhaRegister').querySelector('i').classList.toggle('fa-eye-slash');
      });

      document.getElementById('google-register').addEventListener('click', async () => {
        try {
          const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: window.location.origin,
              prompt: 'select_account',
              queryParams: { access_type: 'offline', prompt: 'consent' },
            }
          });
          if (oauthError) {
            console.error("Erro ao registrar com Google:", oauthError.message);
            alert("Erro ao registrar com Google: " + oauthError.message);
            return;
          }
          const checarUsuario = setInterval(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              clearInterval(checarUsuario);
              await registrarNomeUsuario();
              verificarLogin();
            }
          }, 1000);
        } catch (err) {
          console.error("Erro inesperado no cadastro com Google:", err);
          alert("Erro inesperado: " + err.message);
        }
      });

      document.getElementById('login-link').addEventListener('click', () => {
        verificarLogin();
      });
    });
  }
});

function atualizarBotoes(estado) {
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const resetBtn = document.getElementById('reset-btn');

  if (!startBtn || !pauseBtn || !resumeBtn || !resetBtn) return;

  startBtn.classList.toggle("hidden", estado !== 'inicio');
  pauseBtn.classList.toggle("hidden", estado !== 'focando');
  resumeBtn.classList.toggle("hidden", estado !== 'pausado');
  resetBtn.classList.toggle("hidden", estado === 'inicio');
}
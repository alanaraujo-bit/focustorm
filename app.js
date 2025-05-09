// ====== CONEXÃO COM SUPABASE ======
const supabaseUrl = 'https://tjocgefyjgyndzahcwwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqb2NnZWZ5amd5bmR6YWhjd3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjExMzgsImV4cCI6MjA2MjIzNzEzOH0.xQxMpAXNbwzrc03WToTCOGv_6v1OSEvdSVwzPEzQGr0'; // (chave encurtada por segurança)
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ====== ELEMENTOS DE DOM ======
const authContainer = document.getElementById('auth-container');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const inputName = document.getElementById('auth-name');
const inputPassword = document.getElementById('auth-password');
const logoutBtn = document.getElementById('logout-btn');
const usuarioNomeSpan = document.getElementById('usuario-logado');
const timerDisplay = document.getElementById('timer-display');
const focusInput = document.getElementById('focus-time');
const breakInput = document.getElementById('break-time');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const listaHistorico = document.getElementById('lista-historico');
const dataInicio = document.getElementById('data-inicio');
const dataFim = document.getElementById('data-fim');
const rankingList = document.getElementById('ranking-list');
const btnFiltroHistorico = document.getElementById('btn-filtrar-historico');
const valorTotalFiltrado = document.getElementById('valor-total-filtrado');
const cardTotalFiltrado = document.getElementById('card-total-filtrado');

let usuarioLogado = localStorage.getItem('usuarioLogado') || null;
let timer;
let isRunning = false;
let isFocusTime = true;
let remainingTime = 0;
let tipoGraficoAtual = 'bar';

// ====== FUNÇÕES PRINCIPAIS ======
function verificarLogin() {
  if (usuarioLogado) {
    authContainer.style.display = 'none';
    document.getElementById("menu-topo").style.display = "flex";
    document.getElementById("section-pomodoro").style.display = "block";
    document.getElementById("section-historico").style.display = "none";
    document.getElementById("section-ranking").style.display = "none";
    mostrarHistorico();
    mostrarRanking();
    renderizarGrafico('semana');
    resetTimer();
    atualizarResumo(); // 👈 Adiciona esta linha aqui
  } else {
    authContainer.style.display = 'block';
  }
}

loginBtn.addEventListener('click', () => {
  const nome = inputName.value.trim();
  const senha = inputPassword.value;
  const usuarios = JSON.parse(localStorage.getItem('usuariosPomodoro')) || {};
  if (usuarios[nome] && usuarios[nome] === senha) {
    localStorage.setItem('usuarioLogado', nome);
    usuarioLogado = nome;
    verificarLogin();
  } else {
    alert('Usuário ou senha incorretos!');
  }
});

registerBtn.addEventListener('click', () => {
  const nome = inputName.value.trim();
  const senha = inputPassword.value;
  if (!nome || !senha) return alert('Preencha todos os campos!');
  const usuarios = JSON.parse(localStorage.getItem('usuariosPomodoro')) || {};
  if (usuarios[nome]) return alert('Usuário já existe!');
  usuarios[nome] = senha;
  localStorage.setItem('usuariosPomodoro', JSON.stringify(usuarios));
  alert('Usuário cadastrado! Faça login.');
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('usuarioLogado');
  usuarioLogado = null;
  location.reload();
});

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(remainingTime);
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
}

function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  isFocusTime = true;
  remainingTime = parseInt(focusInput.value) * 60;
  updateDisplay();
}

async function salvarSessao(tipo, duracao) {
  if (!usuarioLogado) return;
  await supabase.from('sessoes').insert([{ usuario: usuarioLogado, tipo, duracao }]);
}

async function mostrarHistorico(filtro = 'todos') {
  const { data: historico } = await supabase
    .from('sessoes')
    .select('*')
    .eq('usuario', usuarioLogado)
    .order('created_at', { ascending: false });

  let filtrado = [...historico];
  if (filtro === 'personalizado') {
    const inicio = new Date(dataInicio.value);
    const fim = new Date(dataFim.value);
    fim.setHours(23, 59, 59, 999);
    filtrado = filtrado.filter(sessao => {
      const data = new Date(sessao.created_at);
      return data >= inicio && data <= fim;
    });
  }

  listaHistorico.innerHTML = '';
  if (filtrado.length === 0) {
    listaHistorico.innerHTML = '<li>Nenhuma sessão encontrada.</li>';
    cardTotalFiltrado.style.display = 'none';
    return;
  }

  let totalFocoMin = 0;
  filtrado.forEach(sessao => {
    const dataFormatada = new Date(sessao.created_at).toLocaleDateString('pt-BR');
    const item = document.createElement('li');
    item.textContent = `${dataFormatada} - ${sessao.tipo} de ${sessao.duracao} min`;
    listaHistorico.appendChild(item);
    if (sessao.tipo === 'Foco') totalFocoMin += sessao.duracao;
  });

  const horas = Math.floor(totalFocoMin / 60);
  const minutos = totalFocoMin % 60;
  valorTotalFiltrado.textContent = `${horas}:${String(minutos).padStart(2, '0')}`;
  cardTotalFiltrado.style.display = 'flex';
}

async function mostrarRanking() {
  const { data } = await supabase.from('sessoes').select('*');
  const tempos = {};
  data.forEach(sessao => {
    if (sessao.tipo === 'Foco') {
      if (!tempos[sessao.usuario]) tempos[sessao.usuario] = 0;
      tempos[sessao.usuario] += sessao.duracao;
    }
  });
  const rankingArray = Object.entries(tempos).sort((a, b) => b[1] - a[1]);
  rankingList.innerHTML = '';
  rankingArray.forEach(([usuario, tempo]) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${usuario}</strong><span>${tempo} min</span>`;
    rankingList.appendChild(li);
  });
}

function renderizarGraficoFoco(dados, labels) {
  if (window.graficoFoco) window.graficoFoco.destroy();

  const ctx = document.getElementById('focus-graph').getContext('2d');
  window.graficoFoco = new Chart(ctx, {
    type: tipoGraficoAtual,
    data: {
      labels: labels,
      datasets: [{
        label: 'Horas focadas',
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
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#ccc',
            callback: value => {
              const totalMinutes = value * 60;
              const hours = Math.floor(totalMinutes / 60);
              const minutes = Math.round(totalMinutes % 60);
              return `${hours}h ${minutes}min`;
            }
          },
          title: { display: true, text: 'Horas', color: '#ccc' }
        },
        x: {
          ticks: { color: '#ccc' }
        }
      },
      plugins: {
        legend: { labels: { color: '#ccc' } },
        tooltip: {
          callbacks: {
            label: context => {
              const totalMinutes = context.parsed.y * 60;
              const hours = Math.floor(totalMinutes / 60);
              const minutes = Math.round(totalMinutes % 60);
              return `${hours}h ${minutes}min`;
            }
          }
        }
      }
    }
  });
}

async function renderizarGrafico(periodo = 'semana') {
  const { data, error } = await supabase
    .from('sessoes')
    .select('*')
    .eq('usuario', usuarioLogado);

  if (error) {
    console.error('Erro ao carregar gráfico:', error);
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
  data.forEach(sessao => {
    const dataSessao = new Date(sessao.created_at);
    if (sessao.tipo === 'Foco' && dataSessao >= inicio) {
      const dia = dataSessao.toLocaleDateString('pt-BR');
      if (!dadosPorDia[dia]) dadosPorDia[dia] = 0;
      dadosPorDia[dia] += sessao.duracao;
    }
  });

  const labels = Object.keys(dadosPorDia).sort((a, b) => {
    const [d1, m1, y1] = a.split('/').map(Number);
    const [d2, m2, y2] = b.split('/').map(Number);
    return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
  });

  const valores = labels.map(dia => (dadosPorDia[dia] / 60).toFixed(2));
  renderizarGraficoFoco(valores, labels);
}
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
btnFiltroHistorico.addEventListener('click', () => mostrarHistorico('personalizado'));

document.querySelectorAll('.btn-period').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const periodo = btn.dataset.period;
    renderizarGrafico(periodo);
  });
});

document.getElementById('btn-tipo-grafico').addEventListener('click', () => {
  tipoGraficoAtual = tipoGraficoAtual === 'bar' ? 'line' : 'bar';
  document.getElementById('btn-tipo-grafico').textContent = `Tipo: ${tipoGraficoAtual === 'bar' ? 'Barra' : 'Linha'}`;
  const periodoAtual = document.querySelector('.btn-period.active')?.dataset.period || 'semana';
  renderizarGrafico(periodoAtual);
});

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
      sections[key].style.display = key === target ? "block" : "none";
    });
    navButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    if (target === "historico") {
      mostrarHistorico();
      renderizarGrafico("semana");
    }
    if (target === "ranking") {
      mostrarRanking();
    }
  });
});

document.querySelectorAll('.history-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.history-tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(`history-${target}`).style.display = 'block';
  });
});

// Garante que o login automático funcione
if (usuarioLogado) verificarLogin();

async function atualizarResumo() {
  const { data, error } = await supabase
    .from('sessoes')
    .select('*')
    .eq('usuario', usuarioLogado);

  if (error) {
    console.error('Erro ao carregar resumo:', error);
    return;
  }

  const diasUnicos = new Set();
  let totalMinutos = 0;
  const diasComFoco = {};

  data.forEach(sessao => {
    const dataSessao = new Date(sessao.created_at);
    const dataFormatada = dataSessao.toLocaleDateString('pt-BR');

    if (sessao.tipo === 'Foco') {
      totalMinutos += sessao.duracao;
      diasUnicos.add(dataFormatada);
      diasComFoco[dataFormatada] = true;
    }
  });

  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  document.getElementById('total-focus').textContent = `${horas}:${String(minutos).padStart(2, '0')}`;
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
    `⏳ Ranking reseta em: ${dias}d ${horas}h ${minutos}min ${segundos}s`;
}

setInterval(atualizarCronometroReset, 1000);
let paginaRanking = 0;
const tamanhoPagina = 20;
let rankingCompleto = [];

async function carregarRankingCompleto() {
  const { data, error } = await supabase.from('sessoes').select('*');
  if (error) {
    console.error('Erro ao carregar ranking:', error);
    return;
  }

  const tempos = {};
  data.forEach(sessao => {
    if (sessao.tipo === 'Foco') {
      if (!tempos[sessao.usuario]) tempos[sessao.usuario] = 0;
      tempos[sessao.usuario] += sessao.duracao;
    }
  });

  rankingCompleto = Object.entries(tempos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100); // limita os 100 primeiros
  paginaRanking = 0;
  document.getElementById('ranking-list').innerHTML = '';
  carregarMaisRanking(); // carrega a primeira página
  atualizarContagemRegressiva();
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
    const min = minutos % 60;
    const tempoTexto = `${horas > 0 ? `${horas}h ` : ''}${min}min`;

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
  await carregarRankingCompleto();
}

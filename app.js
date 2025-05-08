// ====== CONEXÃO COM SUPABASE ======
const supabaseUrl = 'https://tjocgefyjgyndzahcwwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqb2NnZWZ5amd5bmR6YWhjd3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjExMzgsImV4cCI6MjA2MjIzNzEzOH0.xQxMpAXNbwzrc03WToTCOGv_6v1OSEvdSVwzPEzQGr0'; // sua chave aqui
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ====== AUTENTICAÇÃO ======
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const historySection = document.getElementById('history-section');
const rankingSection = document.getElementById('ranking-section');

const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const inputName = document.getElementById('auth-name');
const inputPassword = document.getElementById('auth-password');
const logoutBtn = document.getElementById('logout-btn');
const usuarioNomeSpan = document.getElementById('usuario-logado');

let usuarioLogado = localStorage.getItem('usuarioLogado') || null;

function verificarLogin() {
  if (usuarioLogado) {
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    historySection.style.display = 'block';
    rankingSection.style.display = 'block';
    usuarioNomeSpan.textContent = `Logado como: ${usuarioLogado}`;
    mostrarHistorico();
    mostrarRanking();
    resetTimer();
  } else {
    authContainer.style.display = 'block';
    appContainer.style.display = 'none';
    historySection.style.display = 'none';
    rankingSection.style.display = 'none';
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
  verificarLogin();
});

// ====== CRONÔMETRO ======
const timerDisplay = document.getElementById('timer-display');
const focusInput = document.getElementById('focus-time');
const breakInput = document.getElementById('break-time');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const listaHistorico = document.getElementById('lista-historico');
const filtros = document.querySelectorAll('[data-filter]');
const dataInicio = document.getElementById('data-inicio');
const dataFim = document.getElementById('data-fim');
const rankingList = document.getElementById('ranking-list');

let timer;
let isRunning = false;
let isFocusTime = true;
let remainingTime = 0;

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(remainingTime);
}

async function salvarSessao(tipo, duracao) {
  if (!usuarioLogado) return;

  const { error } = await supabase.from('sessoes').insert([
    {
      usuario: usuarioLogado,
      tipo,
      duracao,
    },
  ]);

  if (error) {
    console.error('Erro ao salvar no Supabase:', error);
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

// ====== HISTÓRICO ======
async function mostrarHistorico(filtro = 'todos') {
  const { data: historico, error } = await supabase
    .from('sessoes')
    .select('*')
    .eq('usuario', usuarioLogado)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar histórico:', error);
    return;
  }

  const hoje = new Date();
  let filtrado = [...historico];

  if (filtro === 'mes') {
    filtrado = filtrado.filter(sessao => {
      const data = new Date(sessao.created_at);
      return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
    });
  }

  if (filtro === '3meses') {
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(hoje.getMonth() - 3);
    filtrado = filtrado.filter(sessao => new Date(sessao.created_at) >= tresMesesAtras);
  }

  if (filtro === 'personalizado') {
    const inicio = new Date(dataInicio.value);
    const fim = new Date(dataFim.value);
    filtrado = filtrado.filter(sessao => {
      const data = new Date(sessao.created_at);
      return data >= inicio && data <= fim;
    });
  }

  listaHistorico.innerHTML = '';
  if (filtrado.length === 0) {
    listaHistorico.innerHTML = '<li>Nenhuma sessão encontrada.</li>';
  } else {
    filtrado.forEach(sessao => {
      const dataFormatada = new Date(sessao.created_at).toLocaleDateString();
      const texto = `${dataFormatada} - ${sessao.tipo} de ${sessao.duracao} min`;
      const li = document.createElement('li');
      li.textContent = texto;
      listaHistorico.appendChild(li);
    });
  }
}

// ====== RANKING ======
async function mostrarRanking() {
  const { data: historico, error } = await supabase.from('sessoes').select('*');

  if (error) {
    console.error('Erro ao carregar ranking:', error);
    return;
  }

  const temposPorUsuario = {};
  historico.forEach(sessao => {
    if (sessao.tipo === 'Foco') {
      if (!temposPorUsuario[sessao.usuario]) temposPorUsuario[sessao.usuario] = 0;
      temposPorUsuario[sessao.usuario] += sessao.duracao;
    }
  });

  const rankingArray = Object.entries(temposPorUsuario).sort((a, b) => b[1] - a[1]);

  rankingList.innerHTML = '';
  rankingArray.forEach(([usuario, tempo]) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${usuario}</strong><span>${tempo} min</span>`;
    rankingList.appendChild(li);
  });
}

// ====== EVENTOS ======
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
filtros.forEach(btn => {
  btn.addEventListener('click', () => {
    const tipoFiltro = btn.getAttribute('data-filter');
    mostrarHistorico(tipoFiltro);
  });
});

// ====== INICIAR ======
verificarLogin();

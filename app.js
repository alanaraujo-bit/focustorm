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

// Exibe ou oculta a interface
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

  if (!nome || !senha) {
    alert('Preencha todos os campos!');
    return;
  }

  const usuarios = JSON.parse(localStorage.getItem('usuariosPomodoro')) || {};
  if (usuarios[nome]) {
    alert('Usuário já existe!');
    return;
  }

  usuarios[nome] = senha;
  localStorage.setItem('usuariosPomodoro', JSON.stringify(usuarios));
  alert('Usuário cadastrado com sucesso! Faça o login.');
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('usuarioLogado');
  usuarioLogado = null;
  verificarLogin();
});

// ====== CRONÔMETRO + HISTÓRICO + RANKING ======
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

// Formata o tempo para mm:ss
function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(remainingTime);
}

// Salva a sessão correta antes de mudar o estado
function salvarSessao(tipo, duracao) {
  const historico = JSON.parse(localStorage.getItem('historicoPomodoro')) || [];

  const novaSessao = {
    usuario: usuarioLogado,
    tipo,
    duracao,
    data: new Date().toISOString()
  };

  historico.push(novaSessao);
  localStorage.setItem('historicoPomodoro', JSON.stringify(historico));
}

// Inicia o cronômetro
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

// Histórico
function mostrarHistorico(filtro = 'todos') {
  const historico = JSON.parse(localStorage.getItem('historicoPomodoro')) || [];
  const hoje = new Date();

  let filtrado = historico.filter(s => s.usuario === usuarioLogado);

  if (filtro === 'mes') {
    filtrado = filtrado.filter(sessao => {
      const data = new Date(sessao.data);
      return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
    });
  }

  if (filtro === '3meses') {
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(hoje.getMonth() - 3);
    filtrado = filtrado.filter(sessao => new Date(sessao.data) >= tresMesesAtras);
  }

  if (filtro === 'personalizado') {
    const inicio = new Date(dataInicio.value);
    const fim = new Date(dataFim.value);
    filtrado = filtrado.filter(sessao => {
      const data = new Date(sessao.data);
      return data >= inicio && data <= fim;
    });
  }

  listaHistorico.innerHTML = '';
  if (filtrado.length === 0) {
    listaHistorico.innerHTML = '<li>Nenhuma sessão encontrada.</li>';
  } else {
    filtrado.forEach(sessao => {
      const dataFormatada = new Date(sessao.data).toLocaleDateString();
      const texto = `${dataFormatada} - ${sessao.tipo} de ${sessao.duracao} min`;
      const li = document.createElement('li');
      li.textContent = texto;
      listaHistorico.appendChild(li);
    });
  }
}

// Ranking
function mostrarRanking() {
  const historico = JSON.parse(localStorage.getItem('historicoPomodoro')) || [];
  const temposPorUsuario = {};

  historico.forEach(sessao => {
    if (sessao.tipo === 'Foco') {
      if (!temposPorUsuario[sessao.usuario]) {
        temposPorUsuario[sessao.usuario] = 0;
      }
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

// Eventos
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
filtros.forEach(btn => {
  btn.addEventListener('click', () => {
    const tipoFiltro = btn.getAttribute('data-filter');
    mostrarHistorico(tipoFiltro);
  });
});

// Inicialização
verificarLogin();

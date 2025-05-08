// ====== CONEXÃO COM SUPABASE ======
const supabaseUrl = 'https://tjocgefyjgyndzahcwwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqb2NnZWZ5amd5bmR6YWhjd3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjExMzgsImV4cCI6MjA2MjIzNzEzOH0.xQxMpAXNbwzrc03WToTCOGv_6v1OSEvdSVwzPEzQGr0'; // sua chave
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

let usuarioLogado = localStorage.getItem('usuarioLogado') || null;
let timer;
let isRunning = false;
let isFocusTime = true;
let remainingTime = 0;

// ====== AUTENTICAÇÃO ======
function verificarLogin() {
  if (usuarioLogado) {
    authContainer.style.display = 'none';
    document.getElementById("menu-topo").style.display = "flex";
    document.getElementById("section-pomodoro").style.display = "block";
    document.getElementById("section-historico").style.display = "none";
    document.getElementById("section-ranking").style.display = "none";
    mostrarHistorico();
    mostrarRanking();
    resetTimer();
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

// ====== CRONÔMETRO ======
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

  let filtrado = [...historico];

  if (filtro === 'personalizado') {
    const inicio = new Date(dataInicio.value);
    const fim = new Date(dataFim.value);
    fim.setHours(23, 59, 59, 999); // inclui o dia final inteiro

    filtrado = filtrado.filter(sessao => {
      const data = new Date(sessao.created_at);
      return data >= inicio && data <= fim;
    });
  }

  listaHistorico.innerHTML = '';

  if (filtrado.length === 0) {
    listaHistorico.innerHTML = '<li>Nenhuma sessão encontrada.</li>';
    return;
  }

  filtrado.forEach(sessao => {
    const dataFormatada = new Date(sessao.created_at).toLocaleDateString('pt-BR');
    const item = document.createElement('li');
    item.textContent = `${dataFormatada} - ${sessao.tipo} de ${sessao.duracao} min`;
    listaHistorico.appendChild(item);
  });

  // === RESUMO TOTAL ===
  const totalMinutos = filtrado.reduce((acc, sessao) => acc + sessao.duracao, 0);
  const totalHoras = (totalMinutos / 60).toFixed(2);

  const resumo = document.createElement('li');
  resumo.style.marginTop = '1rem';
  resumo.style.fontWeight = 'bold';
  resumo.textContent = `Total no intervalo: ${totalMinutos} minutos (${totalHoras}h focadas)`;
  listaHistorico.appendChild(resumo);
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
document.getElementById('btn-filtrar-historico').addEventListener('click', () => {
  mostrarHistorico('personalizado');
});

// ====== TROCA DE SEÇÕES ======
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
    if (target === "historico") mostrarHistorico();
    if (target === "ranking") mostrarRanking();
  });
});

// ====== TROCA DE ABAS DO HISTÓRICO ======
const historyTabs = document.querySelectorAll('.history-tab');
const historyContents = document.querySelectorAll('.history-tab-content');

historyTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    historyTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    historyContents.forEach(content => {
      content.style.display = 'none';
    });
    document.getElementById(`history-${target}`).style.display = 'block';
  });
});

// ====== INICIAR ======
if (usuarioLogado) {
  verificarLogin();
}

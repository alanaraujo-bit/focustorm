const supabaseUrl = 'https://tjocgefyjgyndzahcwwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqb2NnZWZ5amd5bmR6YWhjd3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjExMzgsImV4cCI6MjA2MjIzNzEzOH0.xQxMpAXNbwzrc03WToTCOGv_6v1OSEvdSVwzPEzQGr0';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

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

let timer;
let isRunning = false;
let isFocusTime = true;
let remainingTime = 0;
let tipoGraficoAtual = 'bar';

async function registrarNomeUsuario() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.warn("Usuário não autenticado ao tentar registrar.");
    return;
  }

  console.log("Tentando registrar:", user.id);

  const { data: existente, error: erroBusca } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  if (erroBusca) {
    console.error("Erro ao buscar usuário:", erroBusca.message);
    return;
  }

  if (!existente) {
    const nomeBruto =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "Usuário";

    const nome = nomeBruto.trim(); // <-- remove \n, espaços extras etc

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

async function verificarLogin() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    authContainer.style.display = 'block';
    return;
  }

  await registrarNomeUsuario();

  authContainer.style.display = 'none';
  document.getElementById("menu-topo").style.display = "flex";
  document.getElementById("section-pomodoro").style.display = "block";
  document.getElementById("section-historico").style.display = "none";
  document.getElementById("section-ranking").style.display = "none";
  mostrarHistorico();
  mostrarRanking();
  renderizarGrafico('semana');
  resetTimer();
  atualizarResumo();
}

loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('login-name').value;
  const senha = document.getElementById('login-password').value;

  const { data, error: loginError } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (loginError) {
    alert("Erro ao fazer login: " + loginError.message);
  } else {
    await registrarNomeUsuario();
    verificarLogin();
  }
});

registerBtn.addEventListener('click', async () => {
  const email = document.getElementById('register-email').value;
  const senha = document.getElementById('register-password').value;

  const { data, error: signUpError } = await supabase.auth.signUp({
    email: email,
    password: senha
  });

  if (signUpError) {
    alert("Erro ao cadastrar: " + signUpError.message);
  } else {
    alert("Cadastro feito! Verifique seu e-mail para confirmar.");

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      alert("Erro ao logar após cadastro: " + loginError.message);
    } else {
      await registrarNomeUsuario();
      await verificarLogin();
    }
  }
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

async function mostrarHistorico(filtro = 'todos') {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return;

  const { data, error: fetchError } = await supabase
    .from('sessoes1')
    .select('*')
    .eq('usuario_id', user.id)
    .order('data', { ascending: false });

  if (fetchError) {
    console.error('Erro ao carregar histórico:', fetchError);
    return;
  }

  let filtrado = [...data];
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
    cardTotalFiltrado.style.display = 'none';
    return;
  }

  let totalFocoMin = 0;
  filtrado.forEach(sessao => {
    const dataFormatada = new Date(sessao.data).toLocaleDateString('pt-BR');
    const item = document.createElement('li');
    item.innerHTML = `
      ${dataFormatada} - ${sessao.tipo} de ${sessao.duracao} min
      <button onclick="editarSessao('${sessao.id}', ${sessao.duracao})">✏️</button>
    `;
    listaHistorico.appendChild(item);

    totalFocoMin += sessao.duracao;
  });

  const horas = Math.floor(totalFocoMin / 60);
  const minutos = totalFocoMin % 60;
  valorTotalFiltrado.textContent = `${horas}:${String(minutos).padStart(2, '0')}`;
  cardTotalFiltrado.style.display = 'flex';
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
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#ccc',
            stepSize: 1,
            callback: value => {
              const totalMinutes = Math.floor(value);
              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;
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
              const totalMinutes = context.parsed.y;
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
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return;

  const { data, error: fetchError } = await supabase
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
  data.forEach(sessao => {
    const dataSessao = new Date(sessao.data);
    if (dataSessao >= inicio) {
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
  const valores = labels.map(dia => dadosPorDia[dia]);
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
      atualizarResumo();
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

async function atualizarResumo() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return;

  const { data, error: fetchError } = await supabase
    .from('sessoes1')
    .select('*')
    .eq('usuario_id', user.id);

  if (fetchError) {
    console.error('Erro ao carregar resumo:', fetchError);
    return;
  }

  const diasUnicos = new Set();
  let totalMinutos = 0;
  const diasComFoco = {};

  data.forEach(sessao => {
    const dataSessao = new Date(sessao.data);
    const dataFormatada = dataSessao.toLocaleDateString('pt-BR');

    totalMinutos += sessao.duracao;
    diasUnicos.add(dataFormatada);
    diasComFoco[dataFormatada] = true;
  });

  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  document.getElementById('total-focus').textContent = `${horas > 0 ? horas + 'h ' : ''}${minutos}min`;

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
  const { data, error: fetchError } = await supabase
    .from('sessoes1')
    .select(`
      usuario_id,
      duracao,
      tipo,
      usuarios (
        name
      )
    `);

  if (fetchError) {
    console.error('Erro ao carregar ranking:', fetchError);
    return;
  }

  const tempos = {};
  data.forEach(sessao => {
    if (sessao.tipo === 'Foco') {
      const nome = sessao.usuarios?.name ?? 'Desconhecido';
      if (!tempos[nome]) tempos[nome] = 0;
      tempos[nome] += sessao.duracao;
    }
  });

  rankingCompleto = Object.entries(tempos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);
  paginaRanking = 0;
  document.getElementById('ranking-list').innerHTML = '';
  carregarMaisRanking();
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
  try {
    // Buscar TODAS as sessões do tipo 'Foco'
const { data: sessoes, error: erroSessoes } = await supabase
  .from('sessoes1')
  .select('usuario_id, duracao, tipo, usuarios ( name )');

console.log('Sessoes recebidas:', sessoes);


    if (erroSessoes || !sessoes) {
      console.error('Erro ao buscar sessões:', erroSessoes?.message);
      rankingList.innerHTML = '<li>Erro ao carregar sessões.</li>';
      return;
    }

    // Somar tempo por usuário
    const totais = {};
    sessoes.forEach(sessao => {
      console.log('Totais por usuário:', totais);
      if (sessao.tipo === 'Foco') {
        if (!totais[sessao.usuario_id]) totais[sessao.usuario_id] = 0;
        totais[sessao.usuario_id] += sessao.duracao;
      }
    });

    // Buscar todos os usuários
    const { data: usuarios, error: erroUsuarios } = await supabase
      .from('usuarios')
      .select('id, name');
      console.log('Usuários recebidos:', usuarios);


    if (erroUsuarios || !usuarios) {
      console.error('Erro ao buscar usuários:', erroUsuarios?.message);
      rankingList.innerHTML = '<li>Erro ao carregar usuários.</li>';
      return;
    }

    // Mapa de nomes
    const mapaNomes = {};
    usuarios.forEach(user => {
      mapaNomes[user.id] = user.name;
    });

    // Ordenar ranking
    const ranking = Object.entries(totais)
      .sort((a, b) => b[1] - a[1]);

    // Exibir
    rankingList.innerHTML = '';
    ranking.forEach(([usuarioId, totalMinutos], index) => {
  const nome = mapaNomes[usuarioId]?.trim() || `Usuário (${usuarioId})`;
      const horas = Math.floor(totalMinutos / 60);
      const minutos = totalMinutos % 60;
      const tempoTexto = `${horas > 0 ? `${horas}h ` : ''}${minutos}min`;

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

const tabButtons = document.querySelectorAll(".tab-auth");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.style.display = "none");
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).style.display = "block";
  });
});

const toggleSenhaLogin = document.getElementById("toggleSenhaLogin");
const loginPass = document.getElementById("login-password");
toggleSenhaLogin.addEventListener("click", () => {
  loginPass.type = loginPass.type === "password" ? "text" : "password";
});

const toggleSenhaRegister = document.getElementById("toggleSenhaRegister");
const registerPass = document.getElementById("register-password");
toggleSenhaRegister.addEventListener("click", () => {
  registerPass.type = registerPass.type === "password" ? "text" : "password";
});

async function salvarSessao(tipo, duracao) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Usuário não autenticado:", userError?.message);
    return;
  }

  await registrarNomeUsuario();

  const { error: insertError } = await supabase.from('sessoes1').insert([{
    usuario_id: user.id,
    duracao: duracao,
    data: new Date().toISOString(),
    tipo: tipo
  }]);

  if (insertError) {
    console.error('Erro ao salvar sessão:', insertError);
  } else {
    console.log('✅ Sessão salva com sucesso!');
  }
}

const checarUsuario = setInterval(async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (user) {
    clearInterval(checarUsuario);
    await registrarNomeUsuario();
  }
}, 1000);

supabase.auth.getUser().then(({ data: { user }, error: userError }) => {
  if (user) {
    const email = user.email;
    const nome = user.user_metadata?.full_name || "Usuário";
    const spanUser = document.getElementById("usuario-logado");
    if (spanUser) {
      spanUser.textContent = `👤 ${nome} (${email})`;
    }
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("menu-topo").style.display = "flex";
    document.getElementById("section-pomodoro").style.display = "block";
  } else {
    document.getElementById("auth-container").style.display = "block";
    document.getElementById("menu-topo").style.display = "none";
    document.getElementById("section-pomodoro").style.display = "none";
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  const { error: logoutError } = await supabase.auth.signOut();
  if (logoutError) {
    console.error("Erro ao deslogar:", logoutError.message);
  } else {
    document.getElementById("auth-container").style.display = "block";
    document.getElementById("menu-topo").style.display = "none";
    document.getElementById("section-pomodoro").style.display = "none";
  }
});

async function editarSessao(id, duracaoAtual) {
  const novoValor = prompt(`Editar duração (minutos):`, duracaoAtual);
  const novaDuracao = parseInt(novoValor);

  if (!isNaN(novaDuracao) && novaDuracao >= 0) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
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

document.getElementById("google-register").addEventListener("click", async () => {
  const { error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      prompt: 'select_account',
      redirectTo: 'https://focustorm-th3y.vercel.app'
    }
  });
  if (oauthError) {
    console.error("Erro ao registrar com Google:", oauthError.message);
  }
});

document.getElementById("google-login").addEventListener("click", async () => {
  await supabase.auth.signOut();

  const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      prompt: 'select_account',
      redirectTo: 'https://focustorm-th3y.vercel.app'
    }
  });

  if (oauthError) {
    console.error("Erro ao logar com Google:", oauthError.message);
  } else {
    console.log("Redirecionando para login com Google...");
    const checarUsuario = setInterval(async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (user) {
        clearInterval(checarUsuario);
        await registrarNomeUsuario();
        verificarLogin();
      }
    }, 1000);
  }
});
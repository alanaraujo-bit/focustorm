let horaInicioReal = null;
let tempoTotalAtual = 0;
let objetivoAtual = '';
let objetivoFinalParaSalvar = '';

document.addEventListener('DOMContentLoaded', () => {
  const inputMeta = document.getElementById('input-meta-ciclos');
  if (inputMeta) {
    inputMeta.addEventListener('input', () => {
      if (inputMeta.value > 10) inputMeta.value = 10;
      if (inputMeta.value < 1) inputMeta.value = 1;
      metaCiclos = Math.max(1, Math.min(10, parseInt(inputMeta.value) || 1));
      ciclosConcluidos = 0;
      atualizarProgressoCiclos();
    });
  }

  let metaCiclos = 1;
  let ciclosConcluidos = 0;

  console.log("DOM totalmente carregado.");
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
  const objetivoInputField = document.getElementById('input-objetivo');
  const startBtn = document.getElementById('start-btn');

  function validarCamposPomodoro() {
    const objetivo = objetivoInputField.value.trim();
    const foco = parseInt(focusInput.value);
    const pausa = parseInt(breakInput.value);
    const ciclos = parseInt(inputMeta.value);

    const valido =
      objetivo.length > 0 &&
      objetivo.length <= 100 &&
      foco >= 1 && foco <= 180 &&
      pausa >= 1 && pausa <= 60 &&
      ciclos >= 1 && ciclos <= 10;

    startBtn.disabled = !valido;
  }

  // Escutar mudanças nos campos
  objetivoInputField.addEventListener('input', validarCamposPomodoro);
  focusInput.addEventListener('input', validarCamposPomodoro);
  breakInput.addEventListener('input', validarCamposPomodoro);
  inputMeta.addEventListener('input', validarCamposPomodoro);

  // Validação inicial
  validarCamposPomodoro();
  if (!authContainer || !timerDisplay || !focusInput || !breakInput) {
    console.error('Elementos do DOM não encontrados. Verifique o index.html.');
    return;
  }

  let timer;
  let isRunning = false;
  let isFocusTime = true;
  let remainingTime = 0;
  let tempoRestante = 0;
  let tipoSessaoAtual = '';
  let tipoGraficoAtual = 'bar';
  let paginaAtual = 1;

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

    document.body.classList.add("ready");
  }

  async function verificarLogin() {
    const userResponse = await supabase.auth.getUser();
    console.log('Resposta de autenticação:', userResponse);
    if (!userResponse || !userResponse.data || !userResponse.data.user) {
      console.log('Usuário não autenticado, mostrando tela de login.');
      mostrarTelaLogin();
      return;
    }
    const user = userResponse.data.user;
    localStorage.setItem('focustorm_user_id', user.id);
    console.log('User ID salvo no localStorage:', user.id);

    await registrarNomeUsuario();

    const nomeUsuario = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Usuário";
    const saudacao = gerarSaudacao();

    document.getElementById('usuario-logado').innerHTML = `
      ${saudacao}, <strong>${nomeUsuario}</strong>
      <button id="perfil-icon" title="Ver meu perfil" class="btn-perfil-clean">
        <i class="fas fa-user"></i> Perfil
      </button>
      <br>
      <span style="font-size: 0.9rem; color: #aaa;">O que vamos focar hoje?</span>
    `;

    document.getElementById('perfil-icon').addEventListener('click', () => {
      const userId = localStorage.getItem('focustorm_user_id');
      console.log('User ID recuperado para perfil:', userId);
      if (!userId || userId === "undefined") {
        alert("ID do usuário não encontrado. Faça login novamente.");
        return;
      }
      window.location.href = `Perfil/perfil.html?id=${userId}`;
    });

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

    const skipBtn = document.getElementById('skip-break-btn');
    if (skipBtn) {
      if (!isFocusTime && isRunning) {
        skipBtn.classList.remove('hidden');
      } else {
        skipBtn.classList.add('hidden');
      }
    }
  }

  function atualizarProgressoCiclos() {
    const container = document.getElementById('ciclo-progresso');
    const bolinhasContainer = document.getElementById('bolinhas-ciclos');
    const texto = document.getElementById('texto-ciclos');

    if (!container || !bolinhasContainer || !texto) return;

    bolinhasContainer.innerHTML = ''; // Limpa as bolinhas antigas

    for (let i = 0; i < metaCiclos; i++) {
      const bolinha = document.createElement('div');
      bolinha.style.width = '15px';
      bolinha.style.height = '15px';
      bolinha.style.borderRadius = '50%';
      bolinha.style.backgroundColor = i < ciclosConcluidos ? '#00ffc3' : '#444';
      bolinha.style.transition = 'background-color 0.3s ease';
      bolinha.style.border = '1px solid #888';
      bolinhasContainer.appendChild(bolinha);
    }

    texto.textContent = `${ciclosConcluidos}/${metaCiclos} ciclos concluídos`;
    container.classList.remove('hidden');
  }

  function iniciarSessaoPomodoro() {
    if (isRunning) {
      alert("⚠️ O cronômetro já está em execução.");
      return;
    }


    let objetivoInput = document.getElementById('input-objetivo').value.trim();
    objetivoInput = objetivoInput.replace(/[<>]/g, '');

    const metaInput = parseInt(document.getElementById('input-meta-ciclos').value) || 1;

    if (!objetivoInput) {
      alert("Digite o objetivo da sessão antes de começar.");
      return;
    }

    if (objetivoInput.length > 100) {
      alert("⚠️ O objetivo é muito longo. Limite a 100 caracteres.");
      return;
    }

    objetivoAtual = objetivoInput;
    metaCiclos = Math.min(Math.max(metaInput, 1), 10);
    ciclosConcluidos = 0;
    objetivoFinalParaSalvar = objetivoAtual;
    atualizarProgressoCiclos();

    document.getElementById('input-objetivo').value = '';
    document.getElementById('input-meta-ciclos').value = '';

    remainingTime = parseInt(focusInput.value) * 60;
    tempoTotalAtual = remainingTime;
    horaInicioReal = Date.now();
    isFocusTime = true;
    isRunning = true;
    isPaused = false;
    tipoSessaoAtual = 'Foco';
    runTimer(); // Agora sim o cronômetro começa de verdade

  }

  function pauseTimer() {
    clearInterval(timer);
    isRunning = false;

    const agora = Date.now();
    const decorrido = Math.floor((agora - horaInicioReal) / 1000);
    remainingTime = tempoTotalAtual - decorrido;

    const tickSound = document.getElementById('tick-sound');
    if (tickSound) {
      tickSound.pause();
      tickSound.currentTime = 0;
    }

    atualizarBotoes('pausado');
  }

  function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    isFocusTime = true;
    remainingTime = parseInt(focusInput.value) * 60;

    objetivoAtual = '';
    objetivoFinalParaSalvar = '';
    metaCiclos = 1;
    ciclosConcluidos = 0;

    const tickSound = document.getElementById('tick-sound');
    if (tickSound) {
      tickSound.pause();
      tickSound.currentTime = 0;
    }

    const progressoContainer = document.getElementById('ciclo-progresso');
    const bolinhasContainer = document.getElementById('bolinhas-ciclos');
    const texto = document.getElementById('texto-ciclos');
    if (progressoContainer) progressoContainer.classList.add('hidden');
    if (bolinhasContainer) bolinhasContainer.innerHTML = ''; // Clear bolinhas
    if (texto) texto.textContent = '0/1 ciclos concluídos';

    updateDisplay();
    atualizarBotoes('inicio');
  }

  async function mostrarHistorico(filtro = 'todos') {
    const tamanhoPagina = 25;
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

    const inicioIndex = (paginaAtual - 1) * tamanhoPagina;
    const fimIndex = inicioIndex + tamanhoPagina;
    const paginaDados = filtrado.slice(inicioIndex, fimIndex);

    listaHistorico.innerHTML = '';
    if (paginaDados.length === 0) {
      listaHistorico.innerHTML = '<li>Nenhuma sessão encontrada.</li>';
      cardTotalFiltrado.classList.add("hidden");
      return;
    }

    let totalFocoM = 0;
    paginaDados.forEach(sessao => {
      const dataFormatada = new Date(sessao.data).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const item = document.createElement('li');
      item.innerHTML = `
        ${dataFormatada} - ${sessao.tipo} de ${sessao.duracao} m
        ${sessao.objetivo ? ` - <em>${sessao.objetivo}</em>` : ''}
        <button onclick="editarSessao('${sessao.id}', ${sessao.duracao})">✏️</button>
      `;
      listaHistorico.appendChild(item);

      if (sessao.tipo === 'Foco' && sessao.duracao >= 5) {
        totalFocoM += sessao.duracao;
      }
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
                if (window.innerWidth <= 768 && index % 2 !== 0) return '';
                const label = labels[index];
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
      const diaSemana = agora.getDay();
      inicio = new Date(agora);
      inicio.setDate(agora.getDate() - diaSemana);
      inicio.setHours(0, 0, 0, 0);
    } else if (periodo === 'mes') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    } else {
      inicio = new Date(agora.getFullYear(), 0, 1);
    }

    const dadosPorDia = {};
    sessoes.forEach(sessao => {
      const dataSessao = new Date(sessao.data);
      console.log("🎯 Sessão recebida:", sessao);
      if (
        dataSessao >= inicio &&
        sessao.tipo === 'Foco' &&
        sessao.duracao >= 5
      ) {
        const dataBR = new Date(dataSessao.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const dia = dataBR.toLocaleDateString('pt-BR');
        if (!dadosPorDia[dia]) dadosPorDia[dia] = 0;
        dadosPorDia[dia] += sessao.duracao;
      }
    });

    let labels = [];

    if (periodo === 'semana') {
      const diasSemana = [];
      const hoje = new Date();
      const diaSemana = hoje.getDay();
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - diaSemana);

      for (let i = 0; i < 7; i++) {
        const data = new Date(inicioSemana);
        data.setDate(inicioSemana.getDate() + i);

        // Converte para horário de São Paulo
        const dataBR = new Date(data.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const label = dataBR.toLocaleDateString('pt-BR');

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
        if (
          data.getFullYear() === ano &&
          sessao.tipo === 'Foco' &&
          sessao.duracao >= 5
        ) {
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

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    sessoes.forEach(sessao => {
      const dataSessao = new Date(sessao.data);
      const dataFormatada = dataSessao.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      if (sessao.tipo === 'Foco' && sessao.duracao >= 5 && dataSessao >= inicioMes) {
        totalM += sessao.duracao;
        diasUnicos.add(dataFormatada);
        diasComFoco[dataFormatada] = true;
      }
    });

    const horas = Math.floor(totalM / 60);
    const minutos = totalM % 60;
    // Total focado
    document.getElementById('total-focus').textContent = `${horas > 0 ? horas + 'h ' : ''}${minutos}m`;

    const hoje = new Date();
    // Novo cálculo de média por dia do mês
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const diasDoMes = Math.ceil((hoje - primeiroDia) / (1000 * 60 * 60 * 24)) + 1;
    const mediaMinutos = Math.floor(totalM / diasDoMes);
    const mediaHoras = Math.floor(mediaMinutos / 60);
    const mediaRestante = mediaMinutos % 60;

    document.getElementById('media-diaria').textContent = `${mediaHoras > 0 ? mediaHoras + 'h ' : ''}${mediaRestante}m`;


    document.getElementById('days-active').textContent = diasUnicos.size;

    const diasOrdenados = Object.keys(diasComFoco)
      .map(d => {
        const [dia, mes, ano] = d.split('/');
        return new Date(+ano, mes - 1, +dia);
      })
      .sort((a, b) => a - b);

    // Ordena do mais recente para o mais antigo
    diasOrdenados.reverse();

    for (let i = 0; i < diasOrdenados.length; i++) {
      const esperado = new Date(hoje);
      esperado.setDate(hoje.getDate() - i);

      const esperadoStr = esperado.toDateString();
      const atualStr = diasOrdenados[i].toDateString();

      if (esperadoStr === atualStr) {
        streakAtual++;
      } else {
        break;
      }
    }

    document.getElementById('streak-days').textContent = streakAtual;

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
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { data: sessoes, error: erroSessoes } = await supabase
        .from('sessoes1')
        .select('*');

      if (erroSessoes) {
        console.error('Erro ao buscar sessões:', erroSessoes.message);
        return;
      }

      const totais = {};
      sessoes.forEach(sessao => {
        const dataSessao = new Date(sessao.data);
        if (
          sessao.tipo === 'Foco' &&
          dataSessao >= inicioMes &&
          sessao.duracao >= 5
        ) {
          if (!totais[sessao.usuario_id]) totais[sessao.usuario_id] = 0;
          totais[sessao.usuario_id] += sessao.duracao;
        }
      });

      const { data: usuarios, error: erroUsuarios } = await supabase
        .from('usuarios')
        .select('id, name');

      if (erroUsuarios) {
        console.error('Erro ao buscar usuários:', erroUsuarios.message);
        return;
      }

      const mapaNomes = {};
      usuarios.forEach(user => {
        mapaNomes[user.id] = user.name;
      });

      rankingCompleto = Object.entries(totais)
        .map(([userId, tempo]) => [userId, mapaNomes[userId] || 'Usuário Desconhecido', tempo])
        .sort((a, b) => b[2] - a[2]);

      paginaRanking = 0;
      document.getElementById('ranking-list').innerHTML = '';
      carregarMaisRanking();
    } catch (err) {
      console.error('Erro ao buscar ranking via Supabase:', err.message);
      document.getElementById('ranking-list').innerHTML = '<li>Erro ao carregar ranking.</li>';
    }
  }

  function runTimer() {
    horaInicioReal = Date.now() - (tempoTotalAtual - remainingTime) * 1000;
    const tickSound = document.getElementById('tick-sound');

    timer = setInterval(() => {
      const agora = Date.now();
      const decorrido = Math.floor((agora - horaInicioReal) / 1000);
      remainingTime = tempoTotalAtual - decorrido;

      updateDisplay();

if (isRunning && remainingTime <= 30 && remainingTime > 0) {
  if (tickSound && tickSound.paused) {
    tickSound.loop = true;
    tickSound.play().catch(err => console.error("Erro no som:", err));
  }
} else {
  if (tickSound && !tickSound.paused) {
    tickSound.pause();
    tickSound.currentTime = 0;
  }
}

// Pare o som imediatamente quando zerar:
if (remainingTime <= 0 && tickSound) {
  tickSound.pause();
  tickSound.currentTime = 0;
}

      if (remainingTime <= 0) {
        clearInterval(timer);
        isRunning = false;
        if (tickSound) {
          tickSound.pause();
          tickSound.currentTime = 0;
          tickSound.play().catch(err => console.error("Erro no som final:", err));
        }

        const tipoAtual = isFocusTime ? 'Foco' : 'Pausa';
        const duracao = isFocusTime ? parseInt(focusInput.value) : parseInt(breakInput.value);
        salvarSessao(tipoAtual, duracao);

        if (tipoAtual === 'Foco') {
          ciclosConcluidos++;
          atualizarProgressoCiclos();
        }

if (ciclosConcluidos >= metaCiclos) {
  alert(`✅ Objetivo concluído!\nVocê completou ${metaCiclos} ciclos focando em: "${objetivoAtual || objetivoFinalParaSalvar}"\nParabéns!`);

  // Resetar para valores padrão do Pomodoro
  focusInput.value = 25;
  breakInput.value = 5;
  inputMeta.value = 1;
  objetivoInputField.value = '';
  remainingTime = 25 * 60;
  tempoTotalAtual = remainingTime;
  atualizarProgressoCiclos();
  updateDisplay();


  isFocusTime = false;
  objetivoFinalParaSalvar = objetivoAtual;
  objetivoAtual = '';
  metaCiclos = 1;
  ciclosConcluidos = 0;

  clearInterval(timer);
  isRunning = false;

  if (tickSound) {
    tickSound.pause();
    tickSound.currentTime = 0;
  }

setTimeout(() => {
  alert("✨ Agora você pode definir um novo objetivo para continuar focando!");
  resetTimer(); // <-- Isso já faz todo o reset visual e de variáveis
  atualizarBotoes('inicio');
}, 200);

  return;
}

else {
          isFocusTime = !isFocusTime;
          if (isFocusTime) {
            remainingTime = parseInt(focusInput.value) * 60;
            tempoTotalAtual = remainingTime;
          } else {
            remainingTime = parseInt(breakInput.value) * 60;
            tempoTotalAtual = remainingTime;
          }
          alert(isFocusTime ? "Hora de focar!" : "Hora de descansar!");
          runTimer();

          mostrarHistorico();
          mostrarRanking();
          renderizarGrafico("semana");
        }
        }
      }, 1000);
  }

  function carregarMaisRanking() {
    const inicio = paginaRanking * tamanhoPagina;
    const fim = inicio + tamanhoPagina;
    const rankingList = document.getElementById('ranking-list');
    const pagina = rankingCompleto.slice(inicio, fim);

    pagina.forEach((usuario, index) => {
      const [usuarioId, nome, minutos] = usuario;

      const posicao = inicio + index + 1;
      let medalha = '';
      if (posicao === 1) medalha = '🥇';
      else if (posicao === 2) medalha = '🥈';
      else if (posicao === 3) medalha = '🥉';

      const horas = Math.floor(minutos / 60);
      const m = minutos % 60;
      const tempoTexto = `${horas > 0 ? `${horas}h ` : ''}${m}m`;

      const li = document.createElement('li');
      li.innerHTML = `
        <span>${medalha} ${posicao}º 
          <a href="/Perfil/perfil.html?id=${usuarioId}" style="color: #00ffc3; text-decoration: underline;">
            ${nome}
          </a>
        </span>
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
        if (sessao.tipo === 'Foco' && dataSessao >= inicioMes && sessao.duracao >= 5) {
          if (!totais[sessao.usuario_id]) totais[sessao.usuario_id] = 0;
          totais[sessao.usuario_id] += sessao.duracao || 0;
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
        mapaNomes[user.id] = user.name || `Usuário (${user.id})`;
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
          <span>${medalha} ${index + 1}º 
            <a href="Perfil/perfil.html?id=${usuarioId}" style="color: #00ffc3; text-decoration: underline;">
              ${nome}
            </a>
          </span>
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
    if (!['Foco', 'Pausa'].includes(tipo)) {
      console.warn("Tipo de sessão inválido:", tipo);
      return;
    }

    if (tipo === 'Foco' && duracao < 5) {
      console.warn("Sessão de foco menor que 5 minutos não será salva.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("Usuário não autenticado.");
      return;
    }

    const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: ultimas, error } = await supabase
      .from('sessoes1')
      .select('*')
      .eq('usuario_id', user.id)
      .gte('data', cincoMinAtras);

    if (error) {
      console.error("Erro ao verificar sessões recentes:", error.message);
      return;
    }

    if (ultimas && ultimas.length > 0) {
      console.warn("⛔ Tentativa de salvar sessão duplicada em menos de 5 minutos.");
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
      tipo: tipo,
      objetivo: objetivoAtual || objetivoFinalParaSalvar,
      meta_ciclos: metaCiclos
    }]);

    if (insertError) {
      console.error('❌ Erro ao salvar sessão:', insertError.message);
    } else {
      console.log('✅ Sessão salva com sucesso!');
      carregarRankingCompleto();
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
        carregarRankingCompleto();
        const rankingSection = document.getElementById("section-ranking");
        if (!rankingSection.classList.contains("hidden")) {
          document.getElementById('ranking-list').innerHTML = '';
          carregarRankingCompleto();
        }
      }
    } else {
      alert("Valor inválido.");
    }
  }

  document.getElementById('next-page').addEventListener('click', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sessoes, error } = await supabase
      .from('sessoes1')
      .select('*')
      .eq('usuario_id', user.id);

    if (error) return;

    const totalPaginas = Math.ceil(sessoes.length / 25);
    if (paginaAtual < totalPaginas) {
      paginaAtual++;
      mostrarHistorico();
    }
  });

  document.getElementById('prev-page').addEventListener('click', () => {
    if (paginaAtual > 1) {
      paginaAtual--;
      mostrarHistorico();
    }
  });

  if (startBtn) startBtn.addEventListener('click', () => {
    const objetivo = document.getElementById('input-objetivo').value.trim();

    if (objetivoAtual && ciclosConcluidos < metaCiclos) {
      alert(`⚠️ Você ainda está no objetivo atual: "${objetivoAtual}". Conclua todos os ${metaCiclos} ciclos antes de iniciar outro.`);
      return;
    }

    if (!objetivo) {
      alert("⚠️ Digite o objetivo antes de começar.");
      return;
    }

    iniciarSessaoPomodoro(); // Troque startTimer() por iniciarSessaoPomodoro()
    atualizarBotoes('focando');
  });

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
    let valor = parseInt(focusInput.value);
    if (valor < 1) valor = 1;
    if (valor > 180) valor = 180; // Máximo 3 horas
    focusInput.value = valor;
    if (!isRunning && isFocusTime) {
      remainingTime = valor * 60;
      updateDisplay();
    }
  });

  breakInput.addEventListener('input', () => {
    let valor = parseInt(breakInput.value);
    if (valor < 1) valor = 1;
    if (valor > 60) valor = 60; // Máximo 1 hora
    breakInput.value = valor;
    if (!isRunning && !isFocusTime) {
      remainingTime = valor * 60;
      updateDisplay();
    }
  });


  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      location.reload();
    });
  }

  if (pauseBtn) pauseBtn.addEventListener('click', () => { pauseTimer(); atualizarBotoes('pausado'); });
  if (resumeBtn) resumeBtn.addEventListener('click', () => {
    isRunning = true;
    horaInicioReal = Date.now() - (tempoTotalAtual - remainingTime) * 1000;

    const tickSound = document.getElementById('tick-sound');

    timer = setInterval(() => {
      const agora = Date.now();
      const decorrido = Math.floor((agora - horaInicioReal) / 1000);
      remainingTime = tempoTotalAtual - decorrido;

      updateDisplay();

      if (isRunning && remainingTime <= 30 && remainingTime > 0) {
        if (tickSound && tickSound.paused) {
          tickSound.loop = true;
          tickSound.play().catch(err => console.error("Erro no som:", err));
        }
      } else {
        if (tickSound && !tickSound.paused) {
          tickSound.pause();
          tickSound.currentTime = 0;
        }
      }

// ...dentro do evento do botão resume...
if (remainingTime <= 0) {
  clearInterval(timer);
  isRunning = false;
  if (tickSound) {
    tickSound.pause();
    tickSound.currentTime = 0;
    tickSound.play().catch(err => console.error("Erro no som final:", err));
  }

  const tipoAtual = isFocusTime ? 'Foco' : 'Pausa';
  const duracao = isFocusTime ? parseInt(focusInput.value) : parseInt(breakInput.value);
  salvarSessao(tipoAtual, duracao);
  isFocusTime = !isFocusTime;
  alert(isFocusTime ? "Hora de focar!" : "Hora de descansar!");
  runTimer(); // <-- CORRETO!
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

      const objetivoConfig = document.getElementById('objetivo-config');
      if (objetivoConfig) {
        if (target === 'pomodoro') {
          objetivoConfig.classList.remove('hidden');
        } else {
          objetivoConfig.classList.add('hidden');
        }
      }

      navButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      if (target === "historico") {
        mostrarHistorico();
        renderizarGrafico("semana");
        atualizarResumo();
      }
      if (target === "ranking") {
        document.getElementById('ranking-list').innerHTML = '';
        carregarRankingCompleto();
      }
    });
  });

  document.querySelectorAll('.history-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.history-tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(`history-${target}`).classList.remove('hidden');

      if (target === 'detalhado') {
        mostrarHistorico();
      }
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

  function atualizarBotoes(estado) {
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const resetBtn = document.getElementById('reset-btn');

    if (!startBtn || !pauseBtn || !resumeBtn || !resetBtn) return;

    startBtn.classList.toggle("hidden", estado !== 'inicio');
    pauseBtn.classList.toggle("hidden", estado !== 'focando');
    resumeBtn.classList.toggle("hidden", estado !== 'pausado');
    resetBtn.classList.toggle("hidden", estado === 'inicio');
  }

  verificarLogin();
});
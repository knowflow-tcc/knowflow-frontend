/* Funções comuns a todas as telas (objeto KF): chamadas à API, menu, avisos e notificações */
(function () {
    'use strict';

    var csrfToken = null;

    // ------------------------------------------------------------------ API

    function obterCsrf() {
        if (csrfToken) return Promise.resolve(csrfToken);
        return fetch('/api/auth/csrf', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) { csrfToken = d.token; return csrfToken; });
    }

    // Chama a API; se der erro, rejeita com {status, mensagem, campos}
    async function api(metodo, url, corpo) {
        var opcoes = { method: metodo, credentials: 'same-origin', headers: { 'Accept': 'application/json' } };
        if (metodo !== 'GET') {
            opcoes.headers['X-XSRF-TOKEN'] = await obterCsrf();
        }
        if (corpo instanceof FormData) {
            opcoes.body = corpo;
        } else if (corpo !== undefined) {
            opcoes.headers['Content-Type'] = 'application/json';
            opcoes.body = JSON.stringify(corpo);
        }

        var resposta;
        try {
            resposta = await fetch(url, opcoes);
        } catch (e) {
            throw { status: 0, mensagem: 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.', campos: {} };
        }
        if (resposta.status === 204) return null;

        var dados = null;
        var texto = await resposta.text();
        if (texto) {
            try { dados = JSON.parse(texto); } catch (e) { dados = null; }
        }
        if (resposta.ok) return dados;

        if (resposta.status === 401 && url.indexOf('/api/auth/login') !== 0) {
            location.href = '/login.html?expirou=1&voltar=' + encodeURIComponent(location.pathname + location.search);
            return new Promise(function () { });
        }
        if (resposta.status === 403) csrfToken = null;
        throw {
            status: resposta.status,
            mensagem: (dados && dados.mensagem) || ('Erro ' + resposta.status + '. Tente novamente.'),
            campos: (dados && dados.campos) || {}
        };
    }

    // ------------------------------------------------------------------ Menu e layout

    var PERFIS_REGISTRO = ['COLABORADOR', 'GESTOR'];
    var PERFIS_GESTAO = ['GESTOR', 'ADMINISTRADOR'];

    var MENU = [
        { secao: 'Conhecimento' },
        { id: 'busca', rotulo: 'Buscar conhecimento', icone: 'bi-search', href: '/index.html' },
        { id: 'novo', rotulo: 'Registrar problema', icone: 'bi-plus-circle', href: '/problema-form.html', perfis: PERFIS_REGISTRO },
        { id: 'favoritos', rotulo: 'Meus favoritos', icone: 'bi-star', href: '/index.html?somenteFavoritos=true' },
        { secao: 'Gestão', perfis: PERFIS_GESTAO },
        { id: 'painel', rotulo: 'Painel de indicadores', icone: 'bi-bar-chart-line', href: '/painel.html', perfis: PERFIS_GESTAO },
        { id: 'categorias', rotulo: 'Categorias', icone: 'bi-diagram-3', href: '/categorias.html', perfis: ['GESTOR'] },
        { secao: 'Administração', perfis: ['ADMINISTRADOR'] },
        { id: 'usuarios', rotulo: 'Usuários', icone: 'bi-people', href: '/usuarios.html', perfis: ['ADMINISTRADOR'] },
        { id: 'departamentos', rotulo: 'Departamentos', icone: 'bi-building', href: '/departamentos.html', perfis: ['ADMINISTRADOR'] },
        { id: 'historico', rotulo: 'Histórico de ações', icone: 'bi-clock-history', href: '/historico.html', perfis: ['ADMINISTRADOR'] }
    ];

    function permitido(item, perfil) {
        return !item.perfis || item.perfis.indexOf(perfil) >= 0;
    }

    function iniciais(nome) {
        var partes = (nome || '?').trim().split(/\s+/);
        return ((partes[0] || '')[0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
    }

    function montarMenu(ativo, usuario) {
        var itens = MENU.filter(function (item) { return permitido(item, usuario.perfil); }).map(function (item) {
            if (item.secao) return '<div class="menu-secao">' + esc(item.secao) + '</div>';
            return '<a class="menu-item' + (item.id === ativo ? ' ativo' : '') + '" href="' + item.href + '" title="' + esc(item.rotulo) + '">' +
                '<i class="bi ' + item.icone + '"></i><span class="rotulo">' + esc(item.rotulo) + '</span></a>';
        }).join('');

        return '<a class="sidebar-marca" href="/index.html"><i class="bi bi-diagram-3-fill"></i>' +
            '<span class="marca-texto">Know<span class="marca-sufixo">Flow</span></span></a>' +
            '<nav class="menu" aria-label="Menu principal">' + itens + '</nav>' +
            '<div class="sidebar-rodape">' +
            '<div class="usuario-atual" title="' + esc(usuario.nome + ' — ' + usuario.perfilRotulo + ', ' + usuario.departamentoNome) + '">' +
            '<span class="avatar">' + esc(iniciais(usuario.nome)) + '</span>' +
            '<span class="rotulo min-w-0"><span class="nome d-block">' + esc(usuario.nome) + '</span>' +
            '<span class="perfil-usuario d-block">' + esc(usuario.perfilRotulo) + ' · ' + esc(usuario.departamentoNome) + '</span></span></div>' +
            '<button type="button" class="menu-item" data-sair title="Sair"><i class="bi bi-box-arrow-right"></i><span class="rotulo">Sair</span></button>' +
            '<button type="button" class="menu-item" data-recolher-menu title="Recolher menu"><i class="bi bi-layout-sidebar"></i><span class="rotulo">Recolher menu</span></button>' +
            '</div>';
    }

    function montarTopo(titulo) {
        return '<h1 class="topbar-titulo">' + esc(titulo) + '</h1>' +
            '<div class="topbar-acoes">' +
            '<form class="busca-topo" action="/index.html" method="get" role="search">' +
            '<i class="bi bi-search"></i>' +
            '<input type="search" name="texto" placeholder="Buscar problemas e soluções..." aria-label="Buscar problemas e soluções" data-busca-topo>' +
            '<kbd>Ctrl K</kbd></form>' +
            '<div class="dropdown">' +
            '<button type="button" class="btn-notificacoes" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false" title="Notificações" aria-label="Notificações">' +
            '<i class="bi bi-bell"></i><span class="total-notificacoes" data-total-notificacoes hidden></span></button>' +
            '<div class="dropdown-menu dropdown-menu-end menu-notificacoes" data-menu-notificacoes></div>' +
            '</div>' +
            '<button type="button" class="btn-tema" data-alternar-tema title="Alternar tema claro/escuro">' +
            '<i class="bi bi-moon-stars-fill" data-icone-tema></i><span data-rotulo-tema>Escuro</span></button>' +
            '</div>';
    }

    // ------------------------------------------------------------------ Notificações (RF21)

    var INTERVALO_NOTIFICACOES = 60000;

    async function carregarNotificacoes() {
        var menu = document.querySelector('[data-menu-notificacoes]');
        if (!menu) return;
        var dados;
        try {
            dados = await api('GET', '/api/notificacoes');
        } catch (e) {
            return;
        }
        var total = document.querySelector('[data-total-notificacoes]');
        total.hidden = dados.naoLidas === 0;
        total.textContent = dados.naoLidas > 9 ? '9+' : dados.naoLidas;

        var cabecalho = '<div class="notificacoes-cabecalho"><strong>Notificações</strong>' +
            (dados.naoLidas > 0 ? '<button type="button" class="link-botao" data-ler-todas>Marcar todas como lidas</button>' : '') + '</div>';
        var itens = dados.itens.length === 0
            ? '<div class="painel-vazio py-4"><i class="bi bi-bell-slash"></i>Nenhuma notificação.</div>'
            : dados.itens.map(function (n) {
                return '<a class="item-notificacao' + (n.lida ? '' : ' nao-lida') + '" href="/problema.html?id=' + n.idProblema + '" data-id="' + n.id + '">' +
                    '<span>' + esc(n.mensagem) + '</span><small>' + dataHora(n.dataHora) + '</small></a>';
            }).join('');
        menu.innerHTML = cabecalho + itens;

        var todas = menu.querySelector('[data-ler-todas]');
        if (todas) {
            todas.addEventListener('click', async function () {
                try { await api('PATCH', '/api/notificacoes/lidas'); } catch (e) { }
                carregarNotificacoes();
            });
        }
        menu.querySelectorAll('.item-notificacao.nao-lida').forEach(function (link) {
            link.addEventListener('click', async function (e) {
                e.preventDefault();
                try { await api('PATCH', '/api/notificacoes/' + link.getAttribute('data-id') + '/lida'); } catch (erro) { }
                location.href = link.getAttribute('href');
            });
        });
    }

    // ------------------------------------------------------------------ Download (RF22)

    // Baixa um arquivo gerado pela API
    async function baixar(url, nomePadrao) {
        var resposta = await fetch(url, { credentials: 'same-origin' });
        if (resposta.status === 401) {
            location.href = '/login.html?expirou=1&voltar=' + encodeURIComponent(location.pathname + location.search);
            return new Promise(function () { });
        }
        if (!resposta.ok) {
            var dados = null;
            try { dados = await resposta.json(); } catch (e) { }
            throw {
                status: resposta.status,
                mensagem: (dados && dados.mensagem) || ('Erro ' + resposta.status + '. Tente novamente.'),
                campos: (dados && dados.campos) || {}
            };
        }
        var disposicao = resposta.headers.get('Content-Disposition') || '';
        var nome = (disposicao.match(/filename="?([^";]+)"?/) || [])[1] || nomePadrao;
        var endereco = URL.createObjectURL(await resposta.blob());
        var link = document.createElement('a');
        link.href = endereco;
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(endereco); }, 1000);
    }

    // "1,2 MB", "350 KB"
    function tamanhoArquivo(bytes) {
        if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
        return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    }

    // Confere quem está logado, monta o menu do perfil e devolve o usuário
    async function iniciarPagina(opcoes) {
        var usuario = await api('GET', '/api/auth/eu');
        document.title = opcoes.titulo + ' | KnowFlow';
        document.getElementById('kf-sidebar').innerHTML = montarMenu(opcoes.ativo, usuario);
        document.getElementById('kf-topbar').innerHTML = montarTopo(opcoes.titulo);

        document.querySelectorAll('[data-perfis]').forEach(function (el) {
            var perfis = el.getAttribute('data-perfis').split(',');
            if (perfis.indexOf(usuario.perfil) < 0) el.remove();
        });

        ligarEventosDoLayout();
        mostrarMensagemPendente();
        document.body.classList.remove('carregando');
        KF.usuario = usuario;
        carregarNotificacoes();
        setInterval(carregarNotificacoes, INTERVALO_NOTIFICACOES);
        return usuario;
    }

    function ligarEventosDoLayout() {
        var raiz = document.documentElement;

        document.querySelectorAll('[data-alternar-tema]').forEach(function (botao) {
            botao.addEventListener('click', function () {
                var novo = raiz.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
                raiz.setAttribute('data-bs-theme', novo);
                try { localStorage.setItem('kf-tema', novo); } catch (e) { }
                atualizarBotaoTema();
            });
        });
        atualizarBotaoTema();

        document.querySelectorAll('[data-recolher-menu]').forEach(function (botao) {
            botao.addEventListener('click', function () {
                var recolhido = raiz.classList.toggle('menu-recolhido');
                try { localStorage.setItem('kf-menu', recolhido ? '1' : '0'); } catch (e) { }
            });
        });

        document.querySelectorAll('[data-sair]').forEach(function (botao) {
            botao.addEventListener('click', async function () {
                try { await api('POST', '/api/auth/logout'); } catch (e) { /* sai mesmo assim */ }
                location.href = '/login.html?saiu=1';
            });
        });

        // Ctrl+K (ou Cmd+K) leva para o campo de busca
        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                var campo = document.querySelector('[data-busca-principal]') || document.querySelector('[data-busca-topo]');
                if (campo) {
                    e.preventDefault();
                    campo.focus();
                    campo.select();
                }
            }
        });
    }

    function atualizarBotaoTema() {
        var escuro = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        document.querySelectorAll('[data-rotulo-tema]').forEach(function (el) { el.textContent = escuro ? 'Escuro' : 'Claro'; });
        document.querySelectorAll('[data-icone-tema]').forEach(function (el) {
            el.className = escuro ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
        });
    }

    // ------------------------------------------------------------------ Feedback ao usuário

    function areaDeAvisos() {
        var area = document.getElementById('kf-avisos');
        if (!area) {
            area = document.createElement('div');
            area.id = 'kf-avisos';
            area.className = 'area-avisos';
            area.setAttribute('aria-live', 'polite');
            document.body.appendChild(area);
        }
        return area;
    }

    // Aviso temporário no canto da tela
    function alerta(mensagem, tipo) {
        tipo = tipo || 'sucesso';
        var icone = { sucesso: 'bi-check-circle-fill', erro: 'bi-exclamation-octagon-fill', info: 'bi-info-circle-fill' }[tipo];
        var aviso = document.createElement('div');
        aviso.className = 'alerta alerta-' + tipo + ' aviso-flutuante';
        aviso.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
        aviso.innerHTML = '<i class="bi ' + icone + '"></i><span>' + esc(mensagem) + '</span>' +
            '<button type="button" class="btn-close ms-auto" aria-label="Fechar"></button>';
        aviso.querySelector('button').addEventListener('click', function () { aviso.remove(); });
        areaDeAvisos().appendChild(aviso);
        setTimeout(function () { aviso.remove(); }, tipo === 'erro' ? 8000 : 4500);
    }

    // Guarda uma mensagem para ser mostrada na próxima tela (após um redirecionamento)
    function alertaNaProximaTela(mensagem) {
        try { sessionStorage.setItem('kf-mensagem', mensagem); } catch (e) { }
    }

    function mostrarMensagemPendente() {
        try {
            var mensagem = sessionStorage.getItem('kf-mensagem');
            if (mensagem) {
                sessionStorage.removeItem('kf-mensagem');
                alerta(mensagem, 'sucesso');
            }
        } catch (e) { }
    }

    // Confirmação antes de ações importantes (arquivar, desativar...)
    function confirmar(titulo, mensagem, textoBotao, perigo) {
        return new Promise(function (resolver) {
            var div = document.createElement('div');
            div.className = 'modal fade';
            div.tabIndex = -1;
            div.innerHTML =
                '<div class="modal-dialog modal-dialog-centered"><div class="modal-content painel">' +
                '<div class="modal-header"><h5 class="modal-title">' + esc(titulo) + '</h5>' +
                '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button></div>' +
                '<div class="modal-body">' + esc(mensagem) + '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="botao botao-contorno" data-bs-dismiss="modal">Cancelar</button>' +
                '<button type="button" class="botao ' + (perigo ? 'botao-perigo-cheio' : 'botao-primario') + '" data-confirmar>' + esc(textoBotao || 'Confirmar') + '</button>' +
                '</div></div></div>';
            document.body.appendChild(div);
            var modal = new bootstrap.Modal(div);
            var confirmado = false;
            div.querySelector('[data-confirmar]').addEventListener('click', function () { confirmado = true; modal.hide(); });
            div.addEventListener('hidden.bs.modal', function () { div.remove(); resolver(confirmado); });
            modal.show();
        });
    }

    // Destaca os campos com erro vindos da API e mostra a mensagem geral no formulário
    function mostrarErros(form, erro) {
        limparErros(form);
        var campos = erro.campos || {};
        var algumCampo = false;
        Object.keys(campos).forEach(function (nome) {
            var campo = form.querySelector('[name="' + nome + '"]');
            if (!campo) return;
            algumCampo = true;
            campo.classList.add('is-invalid');
            var retorno = campo.parentElement.querySelector('.invalid-feedback');
            if (!retorno) {
                retorno = document.createElement('div');
                retorno.className = 'invalid-feedback';
                campo.insertAdjacentElement('afterend', retorno);
            }
            retorno.textContent = campos[nome];
        });
        var geral = form.querySelector('[data-erro-geral]');
        if (geral) {
            geral.innerHTML = '<div class="alerta alerta-erro" role="alert"><i class="bi bi-exclamation-octagon-fill"></i><span>' +
                esc(erro.mensagem) + '</span></div>';
        } else if (!algumCampo) {
            alerta(erro.mensagem, 'erro');
        }
        var primeiro = form.querySelector('.is-invalid');
        if (primeiro) primeiro.focus();
    }

    function limparErros(form) {
        form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
        var geral = form.querySelector('[data-erro-geral]');
        if (geral) geral.innerHTML = '';
    }

    // Desativa o botão enquanto salva (evita clique duplo)
    async function comBotaoOcupado(botao, acao) {
        var original = botao.innerHTML;
        botao.disabled = true;
        botao.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Aguarde...';
        try {
            return await acao();
        } finally {
            botao.disabled = false;
            botao.innerHTML = original;
        }
    }

    // ------------------------------------------------------------------ Utilitarios

    function esc(texto) {
        if (texto === null || texto === undefined) return '';
        return String(texto).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function data(iso) {
        return iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
    }

    function dataHora(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function param(nome) {
        return new URLSearchParams(location.search).get(nome);
    }

    function etiquetaStatus(status, rotulo) {
        var tom = status === 'RESOLVIDO' ? 'sucesso' : 'aviso';
        return '<span class="etiqueta etiqueta-' + tom + '">' + esc(rotulo) + '</span>';
    }

    // Preenche o select de categorias na ordem da árvore
    function opcoesCategorias(select, categorias, textoVazio, ignorarIds) {
        var html = textoVazio !== null ? '<option value="">' + esc(textoVazio) + '</option>' : '';
        categorias.forEach(function (c) {
            if (ignorarIds && ignorarIds.indexOf(c.id) >= 0) return;
            var recuo = c.nivel > 0 ? '   '.repeat(c.nivel) + '└ ' : '';
            html += '<option value="' + c.id + '" title="' + esc(c.caminho) + '">' + recuo + esc(c.nome) + '</option>';
        });
        select.innerHTML = html;
    }

    function opcoesDepartamentos(select, departamentos, textoVazio) {
        var html = textoVazio !== null ? '<option value="">' + esc(textoVazio) + '</option>' : '';
        departamentos.forEach(function (d) {
            html += '<option value="' + d.id + '">' + esc(d.nome) + '</option>';
        });
        select.innerHTML = html;
    }

    function atrasar(funcao, ms) {
        var temporizador;
        return function () {
            var args = arguments;
            clearTimeout(temporizador);
            temporizador = setTimeout(function () { funcao.apply(null, args); }, ms);
        };
    }

    function rotuloTabela(tabela) {
        return { problema: 'Problema', causa: 'Causa', solucao: 'Solução', usuario: 'Usuário',
            departamento: 'Departamento', categoria: 'Categoria', comentario: 'Comentário', anexo: 'Anexo' }[tabela] || tabela;
    }

    window.KF = {
        api: api,
        iniciarPagina: iniciarPagina,
        alerta: alerta,
        alertaNaProximaTela: alertaNaProximaTela,
        confirmar: confirmar,
        mostrarErros: mostrarErros,
        limparErros: limparErros,
        comBotaoOcupado: comBotaoOcupado,
        esc: esc,
        data: data,
        dataHora: dataHora,
        param: param,
        etiquetaStatus: etiquetaStatus,
        opcoesCategorias: opcoesCategorias,
        opcoesDepartamentos: opcoesDepartamentos,
        atrasar: atrasar,
        rotuloTabela: rotuloTabela,
        baixar: baixar,
        tamanhoArquivo: tamanhoArquivo,
        atualizarNotificacoes: carregarNotificacoes,
        podeRegistrar: function (u) { return PERFIS_REGISTRO.indexOf(u.perfil) >= 0; },
        usuario: null
    };
})();

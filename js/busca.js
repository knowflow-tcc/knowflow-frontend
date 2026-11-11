/* Tela de busca (RF08, RF19) - tela inicial. Filtro "somente meus favoritos" (RF24). */
(function () {
    'use strict';

    var form = document.getElementById('form-busca');
    var resultados = document.getElementById('resultados');
    var resumo = document.getElementById('resumo');
    var CAMPOS = ['texto', 'categoriaId', 'departamentoId', 'status', 'de', 'ate', 'ordem'];
    var usuario;

    async function iniciar() {
        var favoritos = KF.param('somenteFavoritos') === 'true';
        usuario = await KF.iniciarPagina({ ativo: favoritos ? 'favoritos' : 'busca', titulo: favoritos ? 'Meus favoritos' : 'Buscar conhecimento' });
        var dados = await Promise.all([KF.api('GET', '/api/categorias'), KF.api('GET', '/api/departamentos')]);
        KF.opcoesCategorias(form.categoriaId, dados[0], 'Todas');
        KF.opcoesDepartamentos(form.departamentoId, dados[1], 'Todos');

        // Os filtros ficam na URL: da para voltar, atualizar ou compartilhar a busca
        var parametros = new URLSearchParams(location.search);
        CAMPOS.forEach(function (nome) {
            if (parametros.get(nome)) form[nome].value = parametros.get(nome);
        });
        form.somenteFavoritos.checked = favoritos;
        if (favoritos) {
            document.querySelector('.cabecalho-pagina h2').textContent = 'Meus favoritos';
            document.querySelector('.cabecalho-pagina .subtitulo').textContent = 'Problemas que você marcou com a estrela para consultar rápido.';
        }
        buscar();
    }

    function filtros() {
        var parametros = new URLSearchParams();
        CAMPOS.forEach(function (nome) {
            var valor = form[nome].value.trim();
            if (valor) parametros.set(nome, valor);
        });
        if (form.somenteFavoritos.checked) parametros.set('somenteFavoritos', 'true');
        return parametros;
    }

    async function buscar() {
        var parametros = filtros();
        history.replaceState(null, '', parametros.toString() ? '?' + parametros : location.pathname);
        resumo.textContent = 'Buscando...';
        try {
            var inicio = performance.now();
            var lista = await KF.api('GET', '/api/busca?' + parametros);
            var segundos = ((performance.now() - inicio) / 1000).toFixed(2);
            desenhar(lista, parametros.get('texto'), segundos);
        } catch (erro) {
            resumo.textContent = '';
            KF.alerta(erro.mensagem, 'erro');
        }
    }

    function desenhar(lista, texto, segundos) {
        if (lista.length === 0) {
            resumo.textContent = '';
            var registrar = KF.podeRegistrar(usuario)
                ? '<a class="botao botao-primario mt-3" href="/problema-form.html' + (texto ? '?titulo=' + encodeURIComponent(texto) : '') + '">' +
                  '<i class="bi bi-plus-lg"></i> Registrar como novo problema</a>'
                : '';
            resultados.innerHTML = '<div class="painel painel-vazio"><i class="bi bi-search"></i>' +
                (form.somenteFavoritos.checked
                    ? '<strong>Nenhum favorito encontrado.</strong><br>Abra um problema e clique na estrela para guardá-lo aqui.'
                    : '<strong>Nenhum problema encontrado.</strong><br>Tente outras palavras ou remova algum filtro.') +
                (registrar ? '<br>' + registrar : '') + '</div>';
            return;
        }
        resumo.textContent = lista.length + (lista.length === 1 ? ' problema encontrado' : ' problemas encontrados') +
            ' em ' + segundos.replace('.', ',') + ' s' + (texto ? ' para "' + texto + '"' : '') + '.';
        resultados.innerHTML = lista.map(cartao).join('');
    }

    function cartao(p) {
        var palavras = p.palavrasChave.map(function (t) { return '<span class="termo">' + KF.esc(t) + '</span>'; }).join('');
        var semelhanca = p.semelhanca !== null
            ? '<span class="semelhanca" title="Quanto das palavras pesquisadas aparece neste problema">' + p.semelhanca + '%</span>'
            : '';
        var validada = p.temSolucaoValidada
            ? '<span class="selo-validada"><i class="bi bi-patch-check-fill"></i> Solução validada</span>'
            : '';
        return '<a class="resultado" href="/problema.html?id=' + p.id + '">' +
            '<div class="d-flex justify-content-between align-items-start gap-3">' +
            '<h3>' + (p.favorito ? '<i class="bi bi-star-fill estrela-favorito" title="Favorito"></i> ' : '') + KF.esc(p.titulo) + '</h3>' + semelhanca + '</div>' +
            '<p class="artigo-resumo texto-livre">' + KF.esc(p.resumo) + '</p>' +
            '<div class="meta">' +
            KF.etiquetaStatus(p.status, p.statusRotulo) + validada +
            '<span><i class="bi bi-lightbulb"></i> ' + p.totalSolucoes + (p.totalSolucoes === 1 ? ' solução' : ' soluções') + '</span>' +
            '<span><i class="bi bi-diagram-3"></i> ' + KF.esc(p.categoriaCaminho) + '</span>' +
            '<span><i class="bi bi-building"></i> ' + KF.esc(p.departamentoNome) + '</span>' +
            '<span><i class="bi bi-calendar3"></i> ' + KF.data(p.dataRegistro) + '</span>' +
            '<span><i class="bi bi-person"></i> ' + KF.esc(p.autorNome) + '</span>' +
            '</div>' +
            (palavras ? '<div class="termos">' + palavras + '</div>' : '') +
            '</a>';
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        buscar();
    });
    ['categoriaId', 'departamentoId', 'status', 'de', 'ate', 'ordem', 'somenteFavoritos'].forEach(function (nome) {
        form[nome].addEventListener('change', buscar);
    });
    document.getElementById('limpar').addEventListener('click', function () {
        form.reset();
        buscar();
    });

    iniciar().catch(function (erro) { KF.alerta(erro.mensagem, 'erro'); });
})();

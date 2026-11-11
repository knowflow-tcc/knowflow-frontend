/* Registro (RF04) e edição (RF15) de problema, com sugestão de semelhantes (RF09). */
(function () {
    'use strict';

    var form = document.getElementById('form-problema');
    var idProblema = KF.param('id');
    var painelSemelhantes = document.getElementById('semelhantes');
    var totalSemelhantes = document.getElementById('total-semelhantes');

    async function iniciar() {
        var usuario = await KF.iniciarPagina({
            ativo: idProblema ? 'busca' : 'novo',
            titulo: idProblema ? 'Editar problema' : 'Registrar problema'
        });
        var dados = await Promise.all([KF.api('GET', '/api/departamentos'), KF.api('GET', '/api/categorias')]);
        KF.opcoesDepartamentos(form.departamentoId, dados[0], 'Escolha o departamento');
        KF.opcoesCategorias(form.categoriaId, dados[1], 'Escolha a categoria');

        if (dados[1].length === 0) {
            KF.alerta('Ainda não há categorias cadastradas. Peça a um gestor para criar as categorias.', 'info');
        }

        if (idProblema) {
            var p = await KF.api('GET', '/api/problemas/' + idProblema);
            document.getElementById('titulo-pagina').textContent = 'Editar problema';
            document.getElementById('voltar').href = '/problema.html?id=' + p.id;
            document.getElementById('cancelar').href = '/problema.html?id=' + p.id;
            form.titulo.value = p.titulo;
            form.descricao.value = p.descricao;
            form.departamentoId.value = p.departamentoId;
            form.categoriaId.value = p.categoriaId;
            form.palavrasChave.value = p.palavrasChave.join(', ');
        } else {
            form.departamentoId.value = usuario.departamentoId;
            if (KF.param('titulo')) form.titulo.value = KF.param('titulo');
        }
        previaPalavras();
        atualizarSemelhantes();
        form.titulo.focus();
    }

    function palavras() {
        return form.palavrasChave.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    }

    function previaPalavras() {
        document.getElementById('previa-palavras').innerHTML = palavras().map(function (t) {
            return '<span class="termo">' + KF.esc(t) + '</span>';
        }).join('');
    }

    var atualizarSemelhantes = KF.atrasar(function () {
        var texto = form.titulo.value + ' ' + form.descricao.value + ' ' + form.palavrasChave.value;
        KFSemelhantes.carregar(painelSemelhantes, totalSemelhantes, texto.trim(), idProblema);
    }, 400);

    form.titulo.addEventListener('input', atualizarSemelhantes);
    form.descricao.addEventListener('input', atualizarSemelhantes);
    form.palavrasChave.addEventListener('input', function () {
        previaPalavras();
        atualizarSemelhantes();
    });

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        KF.limparErros(form);
        var dados = {
            titulo: form.titulo.value.trim(),
            descricao: form.descricao.value.trim(),
            departamentoId: form.departamentoId.value ? Number(form.departamentoId.value) : null,
            categoriaId: form.categoriaId.value ? Number(form.categoriaId.value) : null,
            palavrasChave: palavras()
        };
        var botao = form.querySelector('button[type=submit]');
        try {
            var salvo = await KF.comBotaoOcupado(botao, function () {
                return idProblema
                    ? KF.api('PUT', '/api/problemas/' + idProblema, dados)
                    : KF.api('POST', '/api/problemas', dados);
            });
            KF.alertaNaProximaTela(idProblema ? 'Alterações salvas.' : 'Problema registrado! Agora inclua as causas e as soluções.');
            location.href = '/problema.html?id=' + salvo.id;
        } catch (erro) {
            KF.mostrarErros(form, erro);
        }
    });

    iniciar().catch(function (erro) { KF.alerta(erro.mensagem, 'erro'); });
})();

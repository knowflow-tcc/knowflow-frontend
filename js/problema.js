/* Detalhes do problema (RF20): causas, soluções, anexos, comentários e histórico */
(function () {
    'use strict';

    var id = KF.param('id');
    var problema = null;

    var ICONES_ACAO = {
        INCLUSAO: 'bi-plus-circle', ALTERACAO: 'bi-pencil', ARQUIVAMENTO: 'bi-archive',
        VALIDACAO: 'bi-patch-check', DESATIVACAO: 'bi-person-x', REATIVACAO: 'bi-person-check', ANONIMIZACAO: 'bi-incognito'
    };

    /* Tipos aceitos no envio (a lista que vale e a do servidor - AnexoService) */
    var TIPOS_ACEITOS = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.log,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.zip';
    var TAMANHO_MAXIMO = 5 * 1024 * 1024;

    async function iniciar() {
        await KF.iniciarPagina({ ativo: 'busca', titulo: 'Detalhes do problema' });
        if (!id) {
            location.href = '/index.html';
            return;
        }
        await carregar();
    }

    async function carregar() {
        try {
            problema = await KF.api('GET', '/api/problemas/' + id);
        } catch (erro) {
            document.getElementById('titulo').textContent = erro.status === 404 ? 'Problema não encontrado' : 'Não foi possível carregar';
            KF.alerta(erro.mensagem, 'erro');
            return;
        }
        desenhar();
    }

    function desenhar() {
        var p = problema;
        document.title = p.titulo + ' | KnowFlow';
        document.getElementById('titulo').textContent = p.titulo;
        document.getElementById('caminho').innerHTML = p.categoriaCaminho.map(function (parte) {
            return '<span>' + KF.esc(parte) + '</span>';
        }).join('<i class="bi bi-chevron-right"></i>');
        document.getElementById('meta').innerHTML =
            KF.etiquetaStatus(p.status, p.statusRotulo) +
            '<span><i class="bi bi-building"></i> ' + KF.esc(p.departamentoNome) + '</span>' +
            '<span><i class="bi bi-person"></i> ' + KF.esc(p.autorNome) + '</span>' +
            '<span><i class="bi bi-calendar3"></i> ' + KF.dataHora(p.dataRegistro) + '</span>';
        document.getElementById('palavras').innerHTML = p.palavrasChave.map(function (t) {
            return '<a class="termo" href="/index.html?texto=' + encodeURIComponent(t) + '">' + KF.esc(t) + '</a>';
        }).join('');
        document.getElementById('descricao').textContent = p.descricao;
        document.getElementById('aviso-arquivado').innerHTML = p.ativo ? '' :
            '<div class="alerta alerta-info"><i class="bi bi-archive-fill"></i><span>Este problema está <strong>arquivado</strong>: ' +
            'não aparece mais na busca e não pode ser alterado, mas o conhecimento e o histórico foram preservados.</span></div>';

        desenharAcoes();
        desenharAnexosDoProblema();
        desenharCausas();
        desenharSolucoes();
        desenharHistorico();
        document.getElementById('form-causa').hidden = !p.podeRegistrarItens;
        document.getElementById('form-solucao').hidden = !p.podeRegistrarItens;
        KFSemelhantes.carregar(document.getElementById('semelhantes'), document.getElementById('total-semelhantes'),
            p.titulo + ' ' + p.descricao, p.id);
    }

    // ------------------------------------------------------------------ Ações do problema

    function desenharAcoes() {
        var acoes = document.getElementById('acoes');
        var favorito = problema.favorito;
        // RF24 - qualquer perfil marca o problema como favorito
        var html = '<button type="button" class="botao botao-contorno' + (favorito ? ' favorito-ativo' : '') + '" data-favorito ' +
            'aria-pressed="' + favorito + '" title="' + (favorito ? 'Remover dos favoritos' : 'Guardar nos favoritos para consulta rápida') + '">' +
            '<i class="bi ' + (favorito ? 'bi-star-fill' : 'bi-star') + '"></i> ' + (favorito ? 'Favorito' : 'Favoritar') + '</button>';

        if (problema.podeEditar) {
            var resolvido = problema.status === 'RESOLVIDO';
            html +=
                '<a class="botao botao-contorno" href="/problema-form.html?id=' + problema.id + '"><i class="bi bi-pencil"></i> Editar</a>' +
                '<button type="button" class="botao ' + (resolvido ? 'botao-contorno' : 'botao-sucesso') + '" data-status="' + (resolvido ? 'ABERTO' : 'RESOLVIDO') + '">' +
                (resolvido ? '<i class="bi bi-arrow-counterclockwise"></i> Reabrir' : '<i class="bi bi-check2-circle"></i> Marcar como resolvido') + '</button>' +
                '<button type="button" class="botao botao-perigo" data-arquivar-problema><i class="bi bi-archive"></i> Arquivar</button>';
        }
        acoes.innerHTML = html;

        acoes.querySelector('[data-favorito]').addEventListener('click', async function () {
            try {
                await KF.api(problema.favorito ? 'DELETE' : 'PUT', '/api/problemas/' + id + '/favorito');
                problema.favorito = !problema.favorito;
                KF.alerta(problema.favorito ? 'Adicionado aos seus favoritos.' : 'Removido dos seus favoritos.');
                desenharAcoes();
            } catch (erro) { KF.alerta(erro.mensagem, 'erro'); }
        });
        if (!problema.podeEditar) return;

        acoes.querySelector('[data-status]').addEventListener('click', async function (e) {
            var novo = e.currentTarget.getAttribute('data-status');
            try {
                problema = await KF.api('PATCH', '/api/problemas/' + id + '/status', { status: novo });
                KF.alerta(novo === 'RESOLVIDO' ? 'Problema marcado como resolvido.' : 'Problema reaberto.');
                desenhar();
            } catch (erro) { KF.alerta(erro.mensagem, 'erro'); }
        });
        acoes.querySelector('[data-arquivar-problema]').addEventListener('click', async function () {
            var ok = await KF.confirmar('Arquivar problema?',
                'O problema sairá da busca e não poderá mais ser alterado. Nada é apagado: o conhecimento e o histórico continuam guardados.',
                'Arquivar', true);
            if (!ok) return;
            try {
                problema = await KF.api('PATCH', '/api/problemas/' + id + '/arquivar');
                KF.alerta('Problema arquivado.');
                desenhar();
            } catch (erro) { KF.alerta(erro.mensagem, 'erro'); }
        });
    }

    // ------------------------------------------------------------------ Anexos (RF16)

    function desenharAnexosDoProblema() {
        var div = document.getElementById('anexos');
        document.getElementById('total-anexos').textContent = problema.anexos.length;
        var lista = problema.anexos.length === 0
            ? '<p class="linha-secundaria m-0">Nenhum anexo. Prints de erro, fotos e documentos ajudam quem for ler depois.</p>'
            : listaAnexos(problema.anexos);
        div.innerHTML = lista + (problema.podeEditar ? formAnexo('/api/problemas/' + id + '/anexos') : '');
        ligarAnexos(div);
    }

    function listaAnexos(anexos) {
        return '<ul class="lista-anexos">' + anexos.map(function (a) {
            var miniatura = a.imagem
                ? '<img src="/api/anexos/' + a.id + '" alt="" loading="lazy">'
                : '<i class="bi ' + iconeArquivo(a.nomeArquivo) + '"></i>';
            return '<li data-id="' + a.id + '">' +
                '<a class="anexo" href="/api/anexos/' + a.id + '" target="_blank" rel="noopener" title="' + KF.esc(a.nomeArquivo) + '">' +
                '<span class="anexo-miniatura">' + miniatura + '</span>' +
                '<span class="anexo-texto"><span class="anexo-nome">' + KF.esc(a.nomeArquivo) + '</span>' +
                '<span class="linha-secundaria">' + KF.tamanhoArquivo(a.tamanho) + ' · ' + KF.esc(a.autorNome) + '</span></span></a>' +
                (a.podeArquivar ? '<button type="button" class="botao-icone" data-arquivar-anexo title="Arquivar anexo" aria-label="Arquivar anexo">' +
                    '<i class="bi bi-archive"></i></button>' : '') +
                '</li>';
        }).join('') + '</ul>';
    }

    function formAnexo(url) {
        return '<form class="form-anexo" data-url="' + url + '" novalidate>' +
            '<label class="botao botao-contorno botao-pequeno mb-0"><i class="bi bi-paperclip"></i> Anexar arquivo' +
            '<input type="file" name="arquivo" accept="' + TIPOS_ACEITOS + '" hidden></label>' +
            '<span class="linha-secundaria">Imagens, PDF, Office ou ZIP · até 5 MB</span></form>';
    }

    function iconeArquivo(nome) {
        var ext = (nome.split('.').pop() || '').toLowerCase();
        if (ext === 'pdf') return 'bi-file-earmark-pdf';
        if (['doc', 'docx', 'odt', 'txt', 'log'].indexOf(ext) >= 0) return 'bi-file-earmark-text';
        if (['xls', 'xlsx', 'ods', 'csv'].indexOf(ext) >= 0) return 'bi-file-earmark-spreadsheet';
        if (['ppt', 'pptx'].indexOf(ext) >= 0) return 'bi-file-earmark-slides';
        if (ext === 'zip') return 'bi-file-earmark-zip';
        return 'bi-file-earmark';
    }

    // Liga o envio e o arquivamento dos anexos
    function ligarAnexos(raiz) {
        raiz.querySelectorAll('.form-anexo').forEach(function (form) {
            var campo = form.querySelector('input[type=file]');
            campo.addEventListener('change', async function () {
                var arquivo = campo.files[0];
                if (!arquivo) return;
                if (arquivo.size > TAMANHO_MAXIMO) {
                    KF.alerta('O arquivo pode ter no máximo 5 MB.', 'erro');
                    campo.value = '';
                    return;
                }
                var dados = new FormData();
                dados.append('arquivo', arquivo);
                try {
                    await KF.api('POST', form.getAttribute('data-url'), dados);
                    KF.alerta('Arquivo anexado.');
                    carregar();
                } catch (erro) {
                    KF.alerta(erro.mensagem, 'erro');
                    campo.value = '';
                }
            });
        });
        raiz.querySelectorAll('[data-arquivar-anexo]').forEach(function (botao) {
            botao.addEventListener('click', async function () {
                var ok = await KF.confirmar('Arquivar anexo?',
                    'O arquivo deixará de aparecer aqui, mas continua guardado e registrado no histórico.', 'Arquivar', true);
                if (!ok) return;
                try {
                    await KF.api('PATCH', '/api/anexos/' + botao.closest('li').getAttribute('data-id') + '/arquivar');
                    KF.alerta('Anexo arquivado.');
                    carregar();
                } catch (erro) { KF.alerta(erro.mensagem, 'erro'); }
            });
        });
    }

    // ------------------------------------------------------------------ Causas

    function desenharCausas() {
        var lista = document.getElementById('causas');
        document.getElementById('total-causas').textContent = problema.causas.length;
        if (problema.causas.length === 0) {
            lista.innerHTML = '<li class="painel-vazio">Nenhuma causa registrada ainda.</li>';
            return;
        }
        lista.innerHTML = problema.causas.map(function (c) {
            return '<li data-item="causa" data-id="' + c.id + '">' +
                '<div class="texto-livre" data-texto>' + KF.esc(c.descricao) + '</div>' +
                '<div class="linha-secundaria">Registrada por ' + KF.esc(c.autorNome) + '</div>' +
                (c.podeEditar ? botoesItem() : '') + '</li>';
        }).join('');
        ligarBotoesItens(lista, '/api/causas/', 'causa');
    }

    // ------------------------------------------------------------------ Soluções

    function desenharSolucoes() {
        var lista = document.getElementById('solucoes');
        if (problema.solucoes.length === 0) {
            lista.innerHTML = '<li class="painel-vazio">Nenhuma solução registrada ainda.</li>';
            return;
        }
        lista.innerHTML = problema.solucoes.map(function (s) {
            var selo = s.validada ? '<span class="selo-validada mb-2"><i class="bi bi-patch-check-fill"></i> Validada pelo gestor</span>' : '';
            var validar = s.podeValidar
                ? '<button type="button" class="botao botao-sucesso botao-pequeno" data-validar><i class="bi bi-patch-check"></i> Validar como eficaz</button>'
                : '';
            return '<li class="' + (s.validada ? 'solucao-validada' : '') + '" data-item="solucao" data-id="' + s.id + '">' +
                selo + '<div class="texto-livre" data-texto>' + KF.esc(s.descricao) + '</div>' +
                '<div class="linha-secundaria">Registrada por ' + KF.esc(s.autorNome) + ' em ' + KF.dataHora(s.dataRegistro) + '</div>' +
                ((s.podeEditar || s.podeValidar) ? '<div class="acoes-item">' + validar + (s.podeEditar ? botoesItem(true) : '') + '</div>' : '') +
                avaliacao(s) +
                (s.anexos.length || s.podeEditar
                    ? '<div class="bloco-solucao">' + (s.anexos.length ? listaAnexos(s.anexos) : '') +
                      (s.podeEditar ? formAnexo('/api/solucoes/' + s.id + '/anexos') : '') + '</div>'
                    : '') +
                comentarios(s) +
                '</li>';
        }).join('');
        ligarBotoesItens(lista, '/api/solucoes/', 'solução');
        ligarAnexos(lista);
        ligarAvaliacoes(lista);
        ligarComentarios(lista);

        lista.querySelectorAll('[data-validar]').forEach(function (botao) {
            botao.addEventListener('click', async function () {
                var idSolucao = botao.closest('li').getAttribute('data-id');
                var ok = await KF.confirmar('Validar solução?',
                    'Você confirma que esta solução é eficaz? Ela ficará em destaque, o problema passará para "Resolvido" e o autor será avisado.',
                    'Validar');
                if (!ok) return;
                try {
                    await KF.api('PATCH', '/api/solucoes/' + idSolucao + '/validar');
                    KF.alerta('Solução validada. O problema foi marcado como resolvido.');
                    carregar();
                } catch (erro) { KF.alerta(erro.mensagem, 'erro'); }
            });
        });
    }

    // RF18 - "Esta solução te ajudou?" (ou só a contagem, para quem não pode votar)
    function avaliacao(s) {
        var contagem = '<span class="contagem-votos"><i class="bi bi-hand-thumbs-up"></i> ' + s.totalAjudou +
            (s.totalAjudou === 1 ? ' pessoa disse' : ' pessoas disseram') + ' que ajudou</span>';
        if (!s.podeAvaliar) {
            return s.totalAjudou || s.totalNaoAjudou ? '<div class="avaliacao">' + contagem + '</div>' : '';
        }
        return '<div class="avaliacao"><span>Esta solução te ajudou?</span>' +
            '<button type="button" class="botao-voto' + (s.minhaAvaliacao === true ? ' ativo' : '') + '" data-votar="true" aria-pressed="' + (s.minhaAvaliacao === true) + '">' +
            '<i class="bi bi-hand-thumbs-up"></i> Sim <span>' + s.totalAjudou + '</span></button>' +
            '<button type="button" class="botao-voto' + (s.minhaAvaliacao === false ? ' ativo' : '') + '" data-votar="false" aria-pressed="' + (s.minhaAvaliacao === false) + '">' +
            '<i class="bi bi-hand-thumbs-down"></i> Não <span>' + s.totalNaoAjudou + '</span></button></div>';
    }

    function ligarAvaliacoes(lista) {
        lista.querySelectorAll('[data-votar]').forEach(function (botao) {
            botao.addEventListener('click', async function () {
                var ajudou = botao.getAttribute('data-votar') === 'true';
                try {
                    await KF.api('PUT', '/api/solucoes/' + botao.closest('li[data-item]').getAttribute('data-id') + '/avaliacao', { ajudou: ajudou });
                    KF.alerta('Obrigado! Sua avaliação foi registrada.');
                    carregar();
                } catch (erro) { KF.alerta(erro.mensagem, 'erro'); }
            });
        });
    }

    // RF17 - comentários da solução e o formulário para comentar
    function comentarios(s) {
        if (s.comentarios.length === 0 && !s.podeComentar) return '';
        var itens = s.comentarios.map(function (c) {
            return '<div class="comentario" data-comentario="' + c.id + '">' +
                '<div class="comentario-cabecalho"><strong>' + KF.esc(c.autorNome) + '</strong>' +
                '<span class="linha-secundaria">' + KF.dataHora(c.dataHora) + '</span>' +
                (c.podeArquivar ? '<button type="button" class="botao-icone ms-auto" data-arquivar-comentario title="Arquivar comentário" aria-label="Arquivar comentário">' +
                    '<i class="bi bi-archive"></i></button>' : '') + '</div>' +
                '<div class="texto-livre">' + KF.esc(c.texto) + '</div></div>';
        }).join('');
        var form = s.podeComentar
            ? '<form class="form-comentario" novalidate><textarea class="form-control" name="texto" rows="1" maxlength="2000" ' +
              'placeholder="Comente: funcionou para você? Tem alguma dica?" aria-label="Novo comentário"></textarea>' +
              '<button type="submit" class="botao botao-contorno botao-pequeno"><i class="bi bi-send"></i> Comentar</button></form>'
            : '';
        return '<div class="comentarios"><div class="comentarios-titulo"><i class="bi bi-chat-left-text"></i> Comentários (' +
            s.comentarios.length + ')</div>' + itens + form + '</div>';
    }

    function ligarComentarios(lista) {
        lista.querySelectorAll('.form-comentario').forEach(function (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                KF.limparErros(form);
                var idSolucao = form.closest('li[data-item]').getAttribute('data-id');
                try {
                    await KF.comBotaoOcupado(form.querySelector('button[type=submit]'), function () {
                        return KF.api('POST', '/api/solucoes/' + idSolucao + '/comentarios', { texto: form.texto.value.trim() });
                    });
                    KF.alerta('Comentário publicado.');
                    carregar();
                } catch (erro) { KF.mostrarErros(form, erro); }
            });
        });
        lista.querySelectorAll('[data-arquivar-comentario]').forEach(function (botao) {
            botao.addEventListener('click', async function () {
                var ok = await KF.confirmar('Arquivar comentário?',
                    'O comentário deixará de aparecer, mas continua guardado no histórico.', 'Arquivar', true);
                if (!ok) return;
                try {
                    await KF.api('PATCH', '/api/comentarios/' + botao.closest('[data-comentario]').getAttribute('data-comentario') + '/arquivar');
                    KF.alerta('Comentário arquivado.');
                    carregar();
                } catch (erro) { KF.alerta(erro.mensagem, 'erro'); }
            });
        });
    }

    function botoesItem(semDiv) {
        var botoes = '<button type="button" class="botao botao-contorno botao-pequeno" data-editar><i class="bi bi-pencil"></i> Editar</button>' +
            '<button type="button" class="botao botao-perigo botao-pequeno" data-arquivar><i class="bi bi-archive"></i> Arquivar</button>';
        return semDiv ? botoes : '<div class="acoes-item">' + botoes + '</div>';
    }

    // Editar (no próprio lugar) e arquivar causas/soluções
    function ligarBotoesItens(lista, urlBase, nome) {
        lista.querySelectorAll('[data-editar]').forEach(function (botao) {
            botao.addEventListener('click', function () {
                var li = botao.closest('li');
                var texto = li.querySelector('[data-texto]');
                var original = texto.textContent;
                texto.innerHTML = '<form novalidate><textarea class="form-control" name="descricao" rows="3" maxlength="5000"></textarea>' +
                    '<div class="acoes-item"><button type="submit" class="botao botao-primario botao-pequeno">Salvar</button>' +
                    '<button type="button" class="botao botao-contorno botao-pequeno" data-cancelar>Cancelar</button></div></form>';
                var form = texto.querySelector('form');
                form.descricao.value = original;
                form.descricao.focus();
                form.querySelector('[data-cancelar]').addEventListener('click', function () { texto.textContent = original; });
                form.addEventListener('submit', async function (e) {
                    e.preventDefault();
                    try {
                        await KF.api('PUT', urlBase + li.getAttribute('data-id'), { descricao: form.descricao.value.trim() });
                        KF.alerta('Alteração salva.');
                        carregar();
                    } catch (erro) { KF.mostrarErros(form, erro); }
                });
            });
        });
        lista.querySelectorAll('[data-arquivar]').forEach(function (botao) {
            botao.addEventListener('click', async function () {
                var ok = await KF.confirmar('Arquivar ' + nome + '?',
                    'Ela deixará de aparecer no problema, mas continua guardada no histórico.', 'Arquivar', true);
                if (!ok) return;
                try {
                    await KF.api('PATCH', urlBase + botao.closest('li').getAttribute('data-id') + '/arquivar');
                    KF.alerta(nome.charAt(0).toUpperCase() + nome.slice(1) + ' arquivada.');
                    carregar();
                } catch (erro) { KF.alerta(erro.mensagem, 'erro'); }
            });
        });
    }

    // ------------------------------------------------------------------ Historico

    function desenharHistorico() {
        var lista = document.getElementById('historico');
        if (problema.historico.length === 0) {
            lista.innerHTML = '<li class="painel-vazio">Sem registros.</li>';
            return;
        }
        lista.innerHTML = problema.historico.map(function (h) {
            return '<li><i class="bi ' + (ICONES_ACAO[h.acao] || 'bi-dot') + '"></i><div>' +
                '<strong>' + KF.esc(h.acaoRotulo) + '</strong> de ' + KF.esc(KF.rotuloTabela(h.tabelaAfetada).toLowerCase()) +
                '<div class="linha-secundaria">' + KF.esc(h.usuarioNome) + ' · ' + KF.dataHora(h.dataHora) + '</div></div></li>';
        }).join('');
    }

    function ligarFormulario(idForm, url, mensagem) {
        var form = document.getElementById(idForm);
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            KF.limparErros(form);
            var botao = form.querySelector('button[type=submit]');
            try {
                await KF.comBotaoOcupado(botao, function () {
                    return KF.api('POST', '/api/problemas/' + id + url, { descricao: form.descricao.value.trim() });
                });
                form.reset();
                KF.alerta(mensagem);
                carregar();
            } catch (erro) { KF.mostrarErros(form, erro); }
        });
    }

    ligarFormulario('form-causa', '/causas', 'Causa adicionada.');
    ligarFormulario('form-solucao', '/solucoes', 'Solução adicionada.');
    iniciar().catch(function (erro) { KF.alerta(erro.mensagem, 'erro'); });
})();

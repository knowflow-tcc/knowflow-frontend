/* Painel de indicadores (RF13) e relatório em PDF (RF22). Gráficos feitos só com HTML/CSS (sem bibliotecas externas). */
(function () {
    'use strict';

    var usuario;

    async function iniciar() {
        usuario = await KF.iniciarPagina({ ativo: 'painel', titulo: 'Painel de indicadores' });
        var select = document.getElementById('departamento');
        if (select) {
            KF.opcoesDepartamentos(select, await KF.api('GET', '/api/departamentos'), 'Todos os departamentos');
            select.addEventListener('change', carregar);
            KF.opcoesDepartamentos(document.getElementById('rel-departamento'), await KF.api('GET', '/api/departamentos'), 'Todos os departamentos');
        }
        prepararRelatorio();
        await carregar();
    }

    async function carregar() {
        var select = document.getElementById('departamento');
        var url = '/api/painel' + (select && select.value ? '?departamentoId=' + select.value : '');
        try {
            desenhar(await KF.api('GET', url));
        } catch (erro) {
            KF.alerta(erro.mensagem, 'erro');
        }
    }

    function desenhar(p) {
        document.getElementById('escopo').textContent = p.departamentoNome;
        document.getElementById('indicadores').innerHTML = [
            indicador('bi-exclamation-diamond', p.totalProblemas, 'Problemas', 'registrados e ativos', ''),
            indicador('bi-hourglass-split', p.problemasAbertos, 'Abertos', 'aguardando solução', 'tom-aviso'),
            indicador('bi-check2-circle', p.problemasResolvidos, 'Resolvidos', 'com solução', 'tom-sucesso'),
            indicador('bi-percent', p.taxaResolucao + '%', 'Taxa de resolução', 'resolvidos / total', 'tom-info'),
            indicador('bi-lightbulb', p.totalSolucoes, 'Soluções', 'registradas', ''),
            indicador('bi-patch-check', p.solucoesValidadas, 'Validadas', 'pelo gestor', 'tom-sucesso')
        ].join('');

        desenharColunas(document.getElementById('evolucao'), p.evolucaoMensal);
        desenharBarras(document.getElementById('categorias'), p.categoriasComMaisProblemas, 'Nenhum problema registrado.');
        desenharBarras(document.getElementById('palavras'), p.palavrasChaveMaisUsadas, 'Nenhuma palavra-chave usada ainda.');

        var recorrentes = document.getElementById('recorrentes');
        recorrentes.innerHTML = p.problemasRecorrentes.length === 0
            ? '<div class="painel-vazio"><i class="bi bi-emoji-smile"></i>Nenhum problema se repetindo.</div>'
            : '<ul class="lista-itens">' + p.problemasRecorrentes.map(function (r) {
                return '<li class="d-flex justify-content-between gap-3"><a class="titulo-linha" href="/problema.html?id=' + r.id + '">' +
                    KF.esc(r.rotulo) + '</a><span class="contador">' + r.quantidade + (r.quantidade === 1 ? ' parecido' : ' parecidos') + '</span></li>';
            }).join('') + '</ul>';

        var uteis = document.getElementById('uteis');
        uteis.innerHTML = p.solucoesMaisUteis.length === 0
            ? '<div class="painel-vazio"><i class="bi bi-hand-thumbs-up"></i>Nenhuma solução avaliada ainda.</div>'
            : '<ul class="lista-itens">' + p.solucoesMaisUteis.map(function (s) {
                return '<li class="d-flex justify-content-between gap-3"><a class="titulo-linha" href="/problema.html?id=' + s.id + '">' +
                    KF.esc(s.rotulo) + '</a><span class="contador">' + s.quantidade + (s.quantidade === 1 ? ' voto' : ' votos') + '</span></li>';
            }).join('') + '</ul>';

        var bloco = document.getElementById('bloco-departamentos');
        bloco.hidden = p.departamentoId !== null;
        desenharBarras(document.getElementById('departamentos'), p.abertosPorDepartamento, 'Nenhum problema aberto.');
    }

    // RF22 - período padrão: do início do mês até hoje
    function prepararRelatorio() {
        var form = document.getElementById('form-relatorio');
        var hoje = new Date();
        var iso = function (d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
        form.de.value = iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
        form.ate.value = iso(hoje);
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            KF.limparErros(form);
            var parametros = new URLSearchParams({ de: form.de.value, ate: form.ate.value });
            if (form.departamentoId && form.departamentoId.value) parametros.set('departamentoId', form.departamentoId.value);
            try {
                await KF.comBotaoOcupado(form.querySelector('button[type=submit]'), function () {
                    return KF.baixar('/api/relatorios/problemas.pdf?' + parametros, 'relatorio-problemas.pdf');
                });
                KF.alerta('Relatório gerado.');
            } catch (erro) { KF.mostrarErros(form, erro); }
        });
    }

    function indicador(icone, numero, rotulo, detalhe, tom) {
        return '<div class="indicador"><i class="bi ' + icone + ' fs-4 ' + tom + '"></i><div>' +
            '<div class="numero ' + tom + '">' + KF.esc(numero) + '</div>' +
            '<div class="rotulo-indicador">' + KF.esc(rotulo) + '</div>' +
            '<div class="detalhe">' + KF.esc(detalhe) + '</div></div></div>';
    }

    function desenharBarras(div, itens, vazio) {
        if (itens.length === 0) {
            div.innerHTML = '<div class="painel-vazio py-3">' + KF.esc(vazio) + '</div>';
            return;
        }
        var maximo = Math.max.apply(null, itens.map(function (i) { return i.quantidade; }));
        div.innerHTML = itens.map(function (i) {
            var largura = Math.max(4, Math.round(100 * i.quantidade / maximo));
            return '<div class="barra-linha"><span class="barra-rotulo" title="' + KF.esc(i.rotulo) + '">' + KF.esc(i.rotulo) + '</span>' +
                '<span class="barra-trilho"><span class="barra" style="width:' + largura + '%"></span></span>' +
                '<span class="barra-valor">' + i.quantidade + '</span></div>';
        }).join('');
    }

    function desenharColunas(div, itens) {
        var maximo = Math.max(1, Math.max.apply(null, itens.map(function (i) { return i.quantidade; })));
        div.innerHTML = itens.map(function (i) {
            var altura = Math.round(100 * i.quantidade / maximo);
            return '<div class="coluna" title="' + KF.esc(i.rotulo) + ': ' + i.quantidade + '">' +
                '<span class="coluna-valor">' + i.quantidade + '</span>' +
                '<span class="coluna-barra" style="height:' + altura + '%"></span>' +
                '<span class="coluna-rotulo">' + KF.esc(i.rotulo) + '</span></div>';
        }).join('');
    }

    iniciar().catch(function (erro) { KF.alerta(erro.mensagem, 'erro'); });
})();

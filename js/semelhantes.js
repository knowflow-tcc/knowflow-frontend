/* RF09 - lista de problemas semelhantes (usada no cadastro e na tela de detalhes). */
(function () {
    'use strict';

    // Busca e desenha os semelhantes de um texto
    async function carregar(container, contador, texto, ignorarId) {
        if (!texto || texto.trim().length < 3) {
            container.innerHTML = '<div class="painel-vazio"><i class="bi bi-keyboard"></i>Comece a digitar o título para ver se o problema já existe.</div>';
            if (contador) contador.textContent = '0';
            return;
        }
        var url = '/api/busca/semelhantes?texto=' + encodeURIComponent(texto) + (ignorarId ? '&ignorarId=' + ignorarId : '');
        var lista;
        try {
            lista = await KF.api('GET', url);
        } catch (erro) {
            container.innerHTML = '<div class="painel-vazio">' + KF.esc(erro.mensagem) + '</div>';
            return;
        }
        if (contador) contador.textContent = String(lista.length);
        if (lista.length === 0) {
            container.innerHTML = '<div class="painel-vazio"><i class="bi bi-check2-circle"></i>Nenhum problema parecido encontrado.</div>';
            return;
        }
        container.innerHTML = '<ul class="lista-itens">' + lista.map(item).join('') + '</ul>';
    }

    function item(s) {
        var solucao = s.solucaoValidada
            ? '<div class="solucao-destaque"><i class="bi bi-patch-check-fill"></i><div><strong>Solução validada:</strong> ' +
              '<span class="texto-livre">' + KF.esc(s.solucaoValidada) + '</span></div></div>'
            : '';
        return '<li>' +
            '<div class="d-flex justify-content-between gap-2">' +
            '<a class="titulo-linha" href="/problema.html?id=' + s.id + '" target="_blank" rel="noopener">' + KF.esc(s.titulo) +
            ' <i class="bi bi-box-arrow-up-right small"></i></a>' +
            '<span class="semelhanca" title="Percentual de semelhança">' + s.semelhanca + '%</span></div>' +
            '<div class="meta mt-1">' + KF.etiquetaStatus(s.status, s.statusRotulo) +
            '<span>' + KF.esc(s.categoriaCaminho) + '</span></div>' +
            (s.termosEmComum.length ? '<div class="termos">' + s.termosEmComum.map(function (t) {
                return '<span class="termo">' + KF.esc(t) + '</span>';
            }).join('') + '</div>' : '') +
            solucao + '</li>';
    }

    window.KFSemelhantes = { carregar: carregar };
})();

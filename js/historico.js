/* Histórico geral de ações (RF11, RN10) - perfil Administrador. */
(function () {
    'use strict';

    var TONS = { INCLUSAO: 'info', ALTERACAO: 'aviso', ARQUIVAMENTO: 'neutro', VALIDACAO: 'sucesso',
        DESATIVACAO: 'perigo', REATIVACAO: 'sucesso', ANONIMIZACAO: 'perigo' };

    async function iniciar() {
        await KF.iniciarPagina({ ativo: 'historico', titulo: 'Histórico de ações' });
        document.getElementById('tabela').addEventListener('change', carregar);
        await carregar();
    }

    async function carregar() {
        var tabela = document.getElementById('tabela').value;
        var lista = await KF.api('GET', '/api/historico' + (tabela ? '?tabela=' + tabela : ''));
        var linhas = document.getElementById('linhas');
        linhas.innerHTML = lista.length === 0
            ? '<tr><td colspan="4" class="painel-vazio">Nenhuma ação registrada.</td></tr>'
            : lista.map(function (h) {
                var registro = KF.esc(KF.rotuloTabela(h.tabelaAfetada)) + ' <span class="mono">#' + h.idRegistro + '</span>';
                if (h.tabelaAfetada === 'problema') {
                    registro = '<a href="/problema.html?id=' + h.idRegistro + '">' + registro + '</a>';
                }
                return '<tr><td class="mono">' + KF.dataHora(h.dataHora) + '</td>' +
                    '<td>' + KF.esc(h.usuarioNome) + '</td>' +
                    '<td><span class="etiqueta etiqueta-' + (TONS[h.acao] || 'neutro') + '">' + KF.esc(h.acaoRotulo) + '</span></td>' +
                    '<td>' + registro + '</td></tr>';
            }).join('');
    }

    iniciar().catch(function (erro) { KF.alerta(erro.mensagem, 'erro'); });
})();

/* Cadastro de departamentos (RF03) - perfil Administrador. */
(function () {
    'use strict';

    var form = document.getElementById('form-departamento');
    var departamentos = [];
    var editando = null;

    async function iniciar() {
        await KF.iniciarPagina({ ativo: 'departamentos', titulo: 'Departamentos' });
        await carregar();
    }

    async function carregar() {
        departamentos = await KF.api('GET', '/api/departamentos');
        document.getElementById('total').textContent = departamentos.length;
        var linhas = document.getElementById('linhas');
        linhas.innerHTML = departamentos.length === 0
            ? '<tr><td colspan="3" class="painel-vazio">Nenhum departamento cadastrado.</td></tr>'
            : departamentos.map(function (d) {
                return '<tr><td><div class="titulo-linha">' + KF.esc(d.nome) + '</div>' +
                    (d.descricao ? '<div class="linha-secundaria">' + KF.esc(d.descricao) + '</div>' : '') + '</td>' +
                    '<td>' + d.totalUsuarios + '</td>' +
                    '<td class="acoes"><button type="button" class="botao botao-contorno botao-pequeno" data-editar="' + d.id + '">' +
                    '<i class="bi bi-pencil"></i> Editar</button></td></tr>';
            }).join('');
        linhas.querySelectorAll('[data-editar]').forEach(function (b) {
            b.addEventListener('click', function () { editar(Number(b.getAttribute('data-editar'))); });
        });
    }

    function editar(id) {
        editando = departamentos.find(function (d) { return d.id === id; });
        KF.limparErros(form);
        document.getElementById('titulo-form').innerHTML = '<i class="bi bi-pencil"></i> Editar "' + KF.esc(editando.nome) + '"';
        document.getElementById('cancelar').hidden = false;
        form.nome.value = editando.nome;
        form.descricao.value = editando.descricao || '';
        form.nome.focus();
    }

    function cancelar() {
        editando = null;
        form.reset();
        KF.limparErros(form);
        document.getElementById('titulo-form').innerHTML = '<i class="bi bi-plus-circle"></i> Novo departamento';
        document.getElementById('cancelar').hidden = true;
    }

    document.getElementById('cancelar').addEventListener('click', cancelar);

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        KF.limparErros(form);
        var dados = { nome: form.nome.value.trim(), descricao: form.descricao.value.trim() };
        var botao = form.querySelector('button[type=submit]');
        try {
            await KF.comBotaoOcupado(botao, function () {
                return editando
                    ? KF.api('PUT', '/api/departamentos/' + editando.id, dados)
                    : KF.api('POST', '/api/departamentos', dados);
            });
            KF.alerta(editando ? 'Departamento alterado.' : 'Departamento cadastrado.');
            cancelar();
            await carregar();
        } catch (erro) {
            KF.mostrarErros(form, erro);
        }
    });

    iniciar().catch(function (erro) { KF.alerta(erro.mensagem, 'erro'); });
})();

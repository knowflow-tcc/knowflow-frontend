/* Gestão de usuários (RF02, RF12) e anonimização (RNF02 - LGPD) - perfil Administrador. */
(function () {
    'use strict';

    var form = document.getElementById('form-usuario');
    var janela;
    var usuarios = [];
    var editando = null;
    var eu;

    async function iniciar() {
        eu = await KF.iniciarPagina({ ativo: 'usuarios', titulo: 'Usuários' });
        janela = new bootstrap.Modal(document.getElementById('janela'));
        KF.opcoesDepartamentos(form.departamentoId, await KF.api('GET', '/api/departamentos'), 'Escolha o departamento');
        await carregar();
    }

    async function carregar() {
        usuarios = await KF.api('GET', '/api/usuarios');
        desenhar();
    }

    function desenhar() {
        var filtro = document.getElementById('filtro').value.trim().toLowerCase();
        var lista = usuarios.filter(function (u) {
            return !filtro || (u.nome + ' ' + u.email + ' ' + u.departamentoNome).toLowerCase().indexOf(filtro) >= 0;
        });
        document.getElementById('total').textContent = lista.length;
        var linhas = document.getElementById('linhas');
        if (lista.length === 0) {
            linhas.innerHTML = '<tr><td colspan="5" class="painel-vazio">Nenhum usuário encontrado.</td></tr>';
            return;
        }
        linhas.innerHTML = lista.map(function (u) {
            var anonimizado = u.email.indexOf('@knowflow.invalid') > 0;
            var acoes = '';
            if (!anonimizado) {
                acoes += '<button type="button" class="botao botao-contorno botao-pequeno" data-editar="' + u.id + '"><i class="bi bi-pencil"></i> Editar</button> ';
                if (u.ativo && u.id !== eu.id) {
                    acoes += '<button type="button" class="botao botao-perigo botao-pequeno" data-desativar="' + u.id + '"><i class="bi bi-person-x"></i> Desativar</button>';
                } else if (!u.ativo) {
                    acoes += '<button type="button" class="botao botao-sucesso botao-pequeno" data-reativar="' + u.id + '"><i class="bi bi-person-check"></i> Reativar</button> ' +
                        '<button type="button" class="botao botao-perigo botao-pequeno" data-anonimizar="' + u.id + '" title="LGPD: apaga nome e e-mail"><i class="bi bi-incognito"></i> Anonimizar</button>';
                }
            }
            return '<tr><td><div class="titulo-linha">' + KF.esc(u.nome) + (u.id === eu.id ? ' <span class="contador">você</span>' : '') + '</div>' +
                '<div class="linha-secundaria">' + KF.esc(u.email) + '</div></td>' +
                '<td>' + KF.esc(u.perfilRotulo) + '</td>' +
                '<td>' + KF.esc(u.departamentoNome) + '</td>' +
                '<td>' + (u.ativo ? '<span class="etiqueta etiqueta-sucesso">Ativo</span>' : '<span class="etiqueta etiqueta-neutro">Desativado</span>') + '</td>' +
                '<td class="acoes">' + acoes + '</td></tr>';
        }).join('');

        linhas.querySelectorAll('[data-editar]').forEach(function (b) {
            b.addEventListener('click', function () { abrir(Number(b.getAttribute('data-editar'))); });
        });
        linhas.querySelectorAll('[data-desativar]').forEach(function (b) {
            b.addEventListener('click', function () {
                acao(b.getAttribute('data-desativar'), 'desativar', 'Desativar usuário?',
                    'A pessoa não conseguirá mais entrar no sistema. Os problemas e soluções que ela registrou continuam disponíveis.',
                    'Desativar', 'Usuário desativado.');
            });
        });
        linhas.querySelectorAll('[data-reativar]').forEach(function (b) {
            b.addEventListener('click', function () {
                acao(b.getAttribute('data-reativar'), 'reativar', 'Reativar usuário?', 'A pessoa voltará a ter acesso ao sistema.',
                    'Reativar', 'Usuário reativado.', false);
            });
        });
        linhas.querySelectorAll('[data-anonimizar]').forEach(function (b) {
            b.addEventListener('click', function () {
                acao(b.getAttribute('data-anonimizar'), 'anonimizar', 'Anonimizar dados pessoais?',
                    'Atenção: esta ação não pode ser desfeita. O nome e o e-mail serão apagados (LGPD), mas o conhecimento que a pessoa registrou continua no sistema, com autor "Usuário anonimizado".',
                    'Anonimizar', 'Dados pessoais anonimizados.');
            });
        });
    }

    async function acao(id, caminho, titulo, mensagem, textoBotao, sucesso, perigo) {
        var ok = await KF.confirmar(titulo, mensagem, textoBotao, perigo !== false);
        if (!ok) return;
        try {
            await KF.api('PATCH', '/api/usuarios/' + id + '/' + caminho);
            KF.alerta(sucesso);
            await carregar();
        } catch (erro) { KF.alerta(erro.mensagem, 'erro'); }
    }

    function abrir(id) {
        editando = id ? usuarios.find(function (u) { return u.id === id; }) : null;
        form.reset();
        KF.limparErros(form);
        document.getElementById('titulo-janela').textContent = editando ? 'Editar usuário' : 'Novo usuário';
        document.getElementById('senha-obrigatoria').textContent = editando ? '(opcional)' : '*';
        document.getElementById('dica-senha').textContent = editando
            ? 'Deixe em branco para manter a senha atual. Se trocar: mínimo de 8 caracteres, com letras e números.'
            : 'Mínimo de 8 caracteres, com letras e números.';
        if (editando) {
            form.nome.value = editando.nome;
            form.email.value = editando.email;
            form.perfil.value = editando.perfil;
            form.departamentoId.value = editando.departamentoId;
        }
        janela.show();
        setTimeout(function () { form.nome.focus(); }, 300);
    }

    document.getElementById('novo').addEventListener('click', function () { abrir(null); });
    document.getElementById('filtro').addEventListener('input', desenhar);

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        KF.limparErros(form);
        var dados = {
            nome: form.nome.value.trim(),
            email: form.email.value.trim(),
            perfil: form.perfil.value,
            departamentoId: form.departamentoId.value ? Number(form.departamentoId.value) : null,
            senha: form.senha.value || null
        };
        var botao = form.querySelector('button[type=submit]');
        try {
            await KF.comBotaoOcupado(botao, function () {
                return editando
                    ? KF.api('PUT', '/api/usuarios/' + editando.id, dados)
                    : KF.api('POST', '/api/usuarios', dados);
            });
            janela.hide();
            KF.alerta(editando ? 'Usuário atualizado.' : 'Usuário cadastrado. Informe a senha a ele por um canal seguro.');
            await carregar();
        } catch (erro) {
            KF.mostrarErros(form, erro);
        }
    });

    iniciar().catch(function (erro) { KF.alerta(erro.mensagem, 'erro'); });
})();

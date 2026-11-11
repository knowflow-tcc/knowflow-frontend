/* Recuperação de senha (RF14): pedido do link e definição da nova senha. */
(function () {
    'use strict';

    var token = KF.param('token');
    var aviso = document.getElementById('aviso');
    var pedido = document.getElementById('form-pedido');
    var novaSenha = document.getElementById('form-nova-senha');

    function mostrarAviso(html, tipo) {
        aviso.innerHTML = '<div class="alerta alerta-' + tipo + '" role="status"><i class="bi bi-info-circle-fill"></i><span>' +
            html + '</span></div>';
    }

    if (token) {
        novaSenha.hidden = false;
        novaSenha.senha.focus();
    } else {
        pedido.hidden = false;
    }

    pedido.addEventListener('submit', async function (e) {
        e.preventDefault();
        KF.limparErros(pedido);
        try {
            await KF.comBotaoOcupado(pedido.querySelector('button[type=submit]'), function () {
                return KF.api('POST', '/api/auth/recuperar-senha', { email: pedido.email.value.trim() });
            });
            pedido.hidden = true;
            // Mesma mensagem exista o e-mail ou não (não revela quem tem cadastro)
            mostrarAviso('Se o e-mail <strong>' + KF.esc(pedido.email.value.trim()) + '</strong> estiver cadastrado, ' +
                'você receberá em instantes um link para criar uma nova senha. O link vale por 30 minutos.', 'sucesso');
        } catch (erro) { KF.mostrarErros(pedido, erro); }
    });

    novaSenha.addEventListener('submit', async function (e) {
        e.preventDefault();
        KF.limparErros(novaSenha);
        if (novaSenha.senha.value !== novaSenha.confirmacao.value) {
            KF.mostrarErros(novaSenha, { mensagem: 'As duas senhas não são iguais.', campos: { confirmacao: 'Repita exatamente a mesma senha.' } });
            return;
        }
        try {
            await KF.comBotaoOcupado(novaSenha.querySelector('button[type=submit]'), function () {
                return KF.api('POST', '/api/auth/redefinir-senha', { token: token, senha: novaSenha.senha.value });
            });
            location.href = '/login.html?senhaRedefinida=1';
        } catch (erro) {
            KF.mostrarErros(novaSenha, erro);
            novaSenha.senha.value = '';
            novaSenha.confirmacao.value = '';
        }
    });
})();

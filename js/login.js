/* Tela de login (RF01). */
(function () {
    'use strict';

    var form = document.getElementById('form-login');
    var aviso = document.getElementById('aviso');

    function mostrarAviso(texto, tipo) {
        aviso.innerHTML = '<div class="alerta alerta-' + tipo + '" role="status"><i class="bi bi-info-circle-fill"></i><span>' +
            KF.esc(texto) + '</span></div>';
    }

    if (KF.param('expirou')) mostrarAviso('Sua sessão expirou por inatividade. Entre novamente para continuar.', 'info');
    if (KF.param('saiu')) mostrarAviso('Você saiu do sistema com segurança.', 'sucesso');
    if (KF.param('senhaRedefinida')) mostrarAviso('Senha alterada. Entre com a sua nova senha.', 'sucesso');

    // Tema claro/escuro também na tela de login
    var raiz = document.documentElement;
    function atualizarTema() {
        var escuro = raiz.getAttribute('data-bs-theme') === 'dark';
        document.querySelector('[data-rotulo-tema]').textContent = escuro ? 'Escuro' : 'Claro';
        document.querySelector('[data-icone-tema]').className = escuro ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    }
    document.querySelector('[data-alternar-tema]').addEventListener('click', function () {
        var novo = raiz.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        raiz.setAttribute('data-bs-theme', novo);
        try { localStorage.setItem('kf-tema', novo); } catch (e) { }
        atualizarTema();
    });
    atualizarTema();

    form.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        KF.limparErros(form);
        aviso.innerHTML = '';
        var botao = form.querySelector('button[type=submit]');
        try {
            await KF.comBotaoOcupado(botao, function () {
                return KF.api('POST', '/api/auth/login', {
                    email: form.email.value.trim(),
                    senha: form.senha.value
                });
            });
            var voltar = KF.param('voltar');
            location.href = voltar && voltar.charAt(0) === '/' && voltar.indexOf('//') !== 0 ? voltar : '/index.html';
        } catch (erro) {
            KF.mostrarErros(form, erro);
            form.senha.value = '';
        }
    });
})();

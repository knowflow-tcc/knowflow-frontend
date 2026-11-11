/* Aplica o tema (escuro/claro) e o estado do menu antes de desenhar a página, evitando que ela "pisque". */
(function () {
    var tema = 'dark', recolhido = false;
    try {
        tema = localStorage.getItem('kf-tema') || 'dark';
        recolhido = localStorage.getItem('kf-menu') === '1';
    } catch (e) { /* navegador sem localStorage: usa o padrao */ }
    document.documentElement.setAttribute('data-bs-theme', tema);
    if (recolhido) document.documentElement.classList.add('menu-recolhido');
})();

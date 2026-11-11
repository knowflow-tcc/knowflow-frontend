/* Gestão de categorias em árvore (RF07) - perfil Gestor. */
(function () {
    'use strict';

    var form = document.getElementById('form-categoria');
    var categorias = [];   // lista na ordem da árvore (pré-ordem), vinda da API
    var arvore = [];       // raízes com filhos
    var editando = null;

    async function iniciar() {
        await KF.iniciarPagina({ ativo: 'categorias', titulo: 'Categorias' });
        await carregar();
    }

    async function carregar() {
        var dados = await Promise.all([KF.api('GET', '/api/categorias'), KF.api('GET', '/api/categorias/arvore')]);
        categorias = dados[0];
        arvore = dados[1];
        document.getElementById('total').textContent = categorias.length;
        desenharArvore();
        preencherSelectPai();
    }

    function desenharArvore() {
        var div = document.getElementById('arvore');
        if (arvore.length === 0) {
            div.innerHTML = '<div class="painel-vazio"><i class="bi bi-diagram-3"></i>Nenhuma categoria ainda. Crie a primeira ao lado.</div>';
            return;
        }
        div.innerHTML = '<ul class="arvore">' + arvore.map(no).join('') + '</ul>';
        div.querySelectorAll('[data-editar]').forEach(function (botao) {
            botao.addEventListener('click', function () { editar(Number(botao.getAttribute('data-editar'))); });
        });
        div.querySelectorAll('[data-subcategoria]').forEach(function (botao) {
            botao.addEventListener('click', function () {
                cancelarEdicao();
                form.idPai.value = botao.getAttribute('data-subcategoria');
                form.nome.focus();
            });
        });
    }

    function no(n) {
        var icone = n.filhos.length ? 'bi-folder2-open' : 'bi-tag';
        return '<li><div class="arvore-no">' +
            '<span class="arvore-nome"><i class="bi ' + icone + '"></i> ' + KF.esc(n.nome) + '</span>' +
            '<span class="arvore-acoes">' +
            '<button type="button" class="botao botao-contorno botao-pequeno" data-subcategoria="' + n.id + '" title="Criar subcategoria em ' + KF.esc(n.nome) + '"><i class="bi bi-plus"></i> Sub</button>' +
            '<button type="button" class="botao botao-contorno botao-pequeno" data-editar="' + n.id + '"><i class="bi bi-pencil"></i> Editar</button>' +
            '</span></div>' +
            (n.filhos.length ? '<ul>' + n.filhos.map(no).join('') + '</ul>' : '') + '</li>';
    }

    // Ids que não podem ser escolhidos como categoria superior
    function subarvore(id) {
        var ids = [id];
        for (var i = 0; i < ids.length; i++) {
            categorias.forEach(function (c) {
                if (c.idPai === ids[i]) ids.push(c.id);
            });
        }
        return ids;
    }

    function preencherSelectPai() {
        var valor = form.idPai.value;
        KF.opcoesCategorias(form.idPai, categorias, 'Nenhuma (categoria principal)', editando ? subarvore(editando.id) : null);
        form.idPai.value = valor;
    }

    function editar(id) {
        editando = categorias.find(function (c) { return c.id === id; });
        KF.limparErros(form);
        document.getElementById('titulo-form').innerHTML = '<i class="bi bi-pencil"></i> Editar "' + KF.esc(editando.nome) + '"';
        document.getElementById('cancelar').hidden = false;
        form.nome.value = editando.nome;
        preencherSelectPai();
        form.idPai.value = editando.idPai || '';
        form.nome.focus();
    }

    function cancelarEdicao() {
        editando = null;
        form.reset();
        KF.limparErros(form);
        document.getElementById('titulo-form').innerHTML = '<i class="bi bi-plus-circle"></i> Nova categoria';
        document.getElementById('cancelar').hidden = true;
        preencherSelectPai();
    }

    document.getElementById('cancelar').addEventListener('click', cancelarEdicao);

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        KF.limparErros(form);
        var dados = { nome: form.nome.value.trim(), idPai: form.idPai.value ? Number(form.idPai.value) : null };
        var botao = form.querySelector('button[type=submit]');
        try {
            var salva = await KF.comBotaoOcupado(botao, function () {
                return editando
                    ? KF.api('PUT', '/api/categorias/' + editando.id, dados)
                    : KF.api('POST', '/api/categorias', dados);
            });
            KF.alerta((editando ? 'Categoria alterada: ' : 'Categoria criada: ') + salva.caminho);
            cancelarEdicao();
            await carregar();
        } catch (erro) {
            KF.mostrarErros(form, erro);
        }
    });

    iniciar().catch(function (erro) { KF.alerta(erro.mensagem, 'erro'); });
})();

/* ============ CARRUSEL: flechas desktop ============ */
(function () {
    var track = document.querySelector('.carrusel__track');
    var prev = document.querySelector('.carrusel__btn--prev');
    var next = document.querySelector('.carrusel__btn--next');
    if (!track) return;

    function paso() {
        var item = track.querySelector('.carrusel__item');
        var ancho = item ? item.getBoundingClientRect().width : 160;
        return (ancho + 20) * 2;
    }
    if (prev) prev.addEventListener('click', function () {
        track.scrollBy({ left: -paso(), behavior: 'smooth' });
    });
    if (next) next.addEventListener('click', function () {
        track.scrollBy({ left: paso(), behavior: 'smooth' });
    });
})();

/* ============ LIGHTBOX CON ZOOM Y PANEO ============ */
(function () {
    var lb = document.getElementById('lightbox');
    if (!lb) return;

    var img = lb.querySelector('.lightbox__img');
    var escenario = lb.querySelector('.lightbox__escenario');
    var pie = lb.querySelector('.lightbox__pie');
    var btnCerrar = lb.querySelector('[data-accion="cerrar"]');
    var btnMas = lb.querySelector('[data-accion="mas"]');
    var btnMenos = lb.querySelector('[data-accion="menos"]');
    var btnReset = lb.querySelector('[data-accion="reset"]');
    var navPrev = lb.querySelector('.lightbox__nav--prev');
    var navNext = lb.querySelector('.lightbox__nav--next');

    var items = Array.prototype.slice.call(document.querySelectorAll('.carrusel__item'));
    var indice = 0;

    var escala = 1, tx = 0, ty = 0;
    var MIN = 1, MAX = 6;

    function aplicar() {
        img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + escala + ')';
    }
    function resetear() {
        escala = 1; tx = 0; ty = 0; aplicar();
    }
    function limitarPan() {
        var cont = escenario.getBoundingClientRect();
        var w = img.offsetWidth * escala;
        var h = img.offsetHeight * escala;
        var maxX = Math.max(0, (w - cont.width) / 2);
        var maxY = Math.max(0, (h - cont.height) / 2);
        tx = Math.min(maxX, Math.max(-maxX, tx));
        ty = Math.min(maxY, Math.max(-maxY, ty));
    }

    function cargar(i) {
        indice = (i + items.length) % items.length;
        var origen = items[indice].getAttribute('data-full');
        var alt = items[indice].querySelector('img').getAttribute('alt') || '';
        img.src = origen;
        img.alt = alt;
        pie.textContent = alt + '  ·  ' + (indice + 1) + ' / ' + items.length;
        resetear();
    }

    function abrir(i) {
        cargar(i);
        lb.classList.add('abierto');
        document.body.style.overflow = 'hidden';
    }
    function cerrar() {
        lb.classList.remove('abierto');
        document.body.style.overflow = '';
    }

    items.forEach(function (it, i) {
        it.setAttribute('tabindex', '0');
        it.addEventListener('click', function () { abrir(i); });
        it.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(i); }
        });
    });

    if (btnCerrar) btnCerrar.addEventListener('click', cerrar);
    if (navPrev) navPrev.addEventListener('click', function () { cargar(indice - 1); });
    if (navNext) navNext.addEventListener('click', function () { cargar(indice + 1); });

    function zoom(delta, cx, cy) {
        var nueva = Math.min(MAX, Math.max(MIN, escala + delta));
        if (nueva === escala) return;
        // zoom hacia el punto (cx, cy) relativo al centro del escenario
        if (typeof cx === 'number') {
            var rect = escenario.getBoundingClientRect();
            var px = cx - rect.left - rect.width / 2;
            var py = cy - rect.top - rect.height / 2;
            var factor = nueva / escala;
            tx = (tx - px) * factor + px;
            ty = (ty - py) * factor + py;
        }
        escala = nueva;
        if (escala === 1) { tx = 0; ty = 0; }
        limitarPan();
        aplicar();
    }

    if (btnMas) btnMas.addEventListener('click', function () { zoom(0.6); });
    if (btnMenos) btnMenos.addEventListener('click', function () { zoom(-0.6); });
    if (btnReset) btnReset.addEventListener('click', resetear);

    // Doble clic / doble toque = alternar zoom
    escenario.addEventListener('dblclick', function (e) {
        if (escala > 1) resetear();
        else zoom(1.5, e.clientX, e.clientY);
    });

    // Rueda del mouse = zoom
    escenario.addEventListener('wheel', function (e) {
        e.preventDefault();
        zoom(e.deltaY < 0 ? 0.35 : -0.35, e.clientX, e.clientY);
    }, { passive: false });

    // Paneo con mouse
    var arrastrando = false, ix = 0, iy = 0;
    escenario.addEventListener('mousedown', function (e) {
        if (escala <= 1) return;
        arrastrando = true; ix = e.clientX - tx; iy = e.clientY - ty;
        escenario.classList.add('arrastrando');
    });
    window.addEventListener('mousemove', function (e) {
        if (!arrastrando) return;
        tx = e.clientX - ix; ty = e.clientY - iy;
        limitarPan(); aplicar();
    });
    window.addEventListener('mouseup', function () {
        arrastrando = false; escenario.classList.remove('arrastrando');
    });

    // ===== Táctil: pinch-zoom y paneo =====
    var toques = {};
    var pinchIni = 0, escalaIni = 1;
    var panIniX = 0, panIniY = 0, txIni = 0, tyIni = 0;
    var ultimoTap = 0;

    function dist(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }
    function centro(a, b) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    escenario.addEventListener('touchstart', function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            toques[t.identifier] = { x: t.clientX, y: t.clientY };
        }
        var ids = Object.keys(toques);
        if (ids.length === 2) {
            pinchIni = dist(toques[ids[0]], toques[ids[1]]);
            escalaIni = escala;
        } else if (ids.length === 1) {
            var ahora = Date.now();
            if (ahora - ultimoTap < 300) {
                if (escala > 1) resetear();
                else zoom(1.8, toques[ids[0]].x, toques[ids[0]].y);
            }
            ultimoTap = ahora;
            panIniX = toques[ids[0]].x; panIniY = toques[ids[0]].y;
            txIni = tx; tyIni = ty;
        }
    }, { passive: false });

    escenario.addEventListener('touchmove', function (e) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            if (toques[t.identifier]) { toques[t.identifier] = { x: t.clientX, y: t.clientY }; }
        }
        var ids = Object.keys(toques);
        if (ids.length === 2 && pinchIni > 0) {
            var d = dist(toques[ids[0]], toques[ids[1]]);
            var c = centro(toques[ids[0]], toques[ids[1]]);
            var objetivo = Math.min(MAX, Math.max(MIN, escalaIni * (d / pinchIni)));
            var rect = escenario.getBoundingClientRect();
            var px = c.x - rect.left - rect.width / 2;
            var py = c.y - rect.top - rect.height / 2;
            var factor = objetivo / escala;
            tx = (tx - px) * factor + px;
            ty = (ty - py) * factor + py;
            escala = objetivo;
            if (escala <= 1.01) { escala = 1; tx = 0; ty = 0; }
            limitarPan(); aplicar();
        } else if (ids.length === 1 && escala > 1) {
            tx = txIni + (toques[ids[0]].x - panIniX);
            ty = tyIni + (toques[ids[0]].y - panIniY);
            limitarPan(); aplicar();
        }
    }, { passive: false });

    function finToque(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            delete toques[e.changedTouches[i].identifier];
        }
        if (Object.keys(toques).length < 2) pinchIni = 0;
    }
    escenario.addEventListener('touchend', finToque);
    escenario.addEventListener('touchcancel', finToque);

    // Teclado
    document.addEventListener('keydown', function (e) {
        if (!lb.classList.contains('abierto')) return;
        if (e.key === 'Escape') cerrar();
        else if (e.key === 'ArrowLeft') cargar(indice - 1);
        else if (e.key === 'ArrowRight') cargar(indice + 1);
        else if (e.key === '+' || e.key === '=') zoom(0.5);
        else if (e.key === '-') zoom(-0.5);
    });
})();

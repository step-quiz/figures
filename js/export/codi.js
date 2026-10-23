/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: js/export/codi.js
 * ROL: La construcció en un codi curt: base64url(deflate(JSON)). Va a la
 *      primera línia del TikZ («% figures:v1:<codi>», per tornar a obrir la
 *      figura des del .tex) i a l'enllaç per compartir (#f=<codi>).
 * ARQUITECTURA: Navegador: CompressionStream('deflate-raw') si n'hi ha (és
 *      asíncron); si no, el JSON sense comprimir, en base64url. Node (tests):
 *      zlib. En llegir, si el codi comença per «{» (eyJ… en base64) és JSON
 *      sense comprimir; si no, es descomprimeix.
 * DEPENDÈNCIES: cap (zlib a Node)
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var node = typeof module === 'object' && module.exports;
    var api = fabrica(node ? require('zlib') : null);
    if (node) module.exports = api;
    else arrel.Codi = api;
})(typeof self !== 'undefined' ? self : this, function (zlib) {
    'use strict';

    // ── base64url ──────────────────────────────────────────────────────────
    function aBase64url(bytes) {
        var s;
        if (typeof Buffer !== 'undefined' && zlib) s = Buffer.from(bytes).toString('base64');
        else {
            var bin = '';
            for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
            s = btoa(bin);
        }
        return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function deBase64url(s) {
        if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('codi no vàlid');
        var b = s.replace(/-/g, '+').replace(/_/g, '/');
        while (b.length % 4) b += '=';
        if (typeof Buffer !== 'undefined' && zlib) return new Uint8Array(Buffer.from(b, 'base64'));
        var bin = atob(b),
            out = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }
    var utf8 = function (s) {
        return new TextEncoder().encode(s);
    };
    var deUtf8 = function (b) {
        return new TextDecoder().decode(b);
    };

    function stream(bytes, Tipus) {
        var s = new Blob([bytes]).stream().pipeThrough(new Tipus('deflate-raw'));
        return new Response(s).arrayBuffer().then(function (ab) {
            return new Uint8Array(ab);
        });
    }
    var potComprimir = function () {
        return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
    };

    /** text → Promise<codi> */
    function codifica(text) {
        if (zlib) return Promise.resolve(codificaSync(text));
        if (!potComprimir()) return Promise.resolve(aBase64url(utf8(text)));
        return stream(utf8(text), CompressionStream).then(aBase64url, function () {
            return aBase64url(utf8(text));
        });
    }
    /** codi → Promise<text> */
    function descodifica(codi) {
        var bytes;
        try {
            bytes = deBase64url(codi);
        } catch (e) {
            return Promise.reject(e);
        }
        if (bytes[0] === 0x7b) return Promise.resolve(deUtf8(bytes)); // «{»: sense comprimir
        if (zlib) return Promise.resolve(descodificaSync(codi));
        if (!potComprimir()) return Promise.reject(new Error('Aquest navegador no pot descomprimir el codi.'));
        return stream(bytes, DecompressionStream).then(deUtf8);
    }
    // Versions síncrones (només Node: tests i fitxers de referència)
    function codificaSync(text) {
        return aBase64url(zlib.deflateRawSync(Buffer.from(text, 'utf8'), { level: 9 }));
    }
    function descodificaSync(codi) {
        var bytes = deBase64url(codi);
        if (bytes[0] === 0x7b) return Buffer.from(bytes).toString('utf8');
        return zlib.inflateRawSync(Buffer.from(bytes)).toString('utf8');
    }

    return {
        codifica: codifica,
        descodifica: descodifica,
        codificaSync: codificaSync,
        descodificaSync: descodificaSync,
        aBase64url: aBase64url,
        deBase64url: deBase64url,
    };
});

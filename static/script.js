// ============================================
// BOT DE ALGORITMOS - LÓGICA DEL CLIENTE
// ============================================

// ===== ELEMENTOS DEL DOM =====
const chat = document.getElementById("chat");
const input = document.getElementById("input-mensaje");
const btnEnviar = document.getElementById("btn-enviar");
const btnReiniciar = document.getElementById("btn-reiniciar");

// ===== ESTADO =====
let enviando = false;

// ===== CONFIGURAR MARKED (Markdown) =====
marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch (e) {}
        }
        return code;
    }
});

// ===== CONFIGURAR MERMAID =====
mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    flowchart: { useMaxWidth: true, htmlLabels: true }
});

// ===== FUNCIÓN: ESCAPAR HTML =====
function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

// ===== FUNCIÓN: CREAR BLOQUE DE CÓDIGO =====
function crearBloqueCodigo(codigo, lenguaje) {
    const bloque = document.createElement("div");
    bloque.classList.add("bloque-codigo");

    // Barra superior
    const barra = document.createElement("div");
    barra.classList.add("barra-codigo");

    const nombreLenguaje = document.createElement("span");
    nombreLenguaje.classList.add("lenguaje");
    nombreLenguaje.textContent = lenguaje || "código";

    const acciones = document.createElement("div");
    acciones.classList.add("acciones");

    // Botón copiar
    const btnCopiar = document.createElement("button");
    btnCopiar.textContent = "📋 Copiar";
    btnCopiar.addEventListener("click", () => {
        navigator.clipboard.writeText(codigo).then(() => {
            btnCopiar.textContent = "✅ Copiado";
            setTimeout(() => (btnCopiar.textContent = "📋 Copiar"), 1500);
        });
    });

    // Botón descargar
    const btnDescargar = document.createElement("button");
    btnDescargar.textContent = "⬇️ Descargar";
    btnDescargar.addEventListener("click", () => {
        const extensiones = {
            python: "py", java: "java", javascript: "js",
            "c++": "cpp", csharp: "cs", c: "c",
            mermaid: "mmd", html: "html", css: "css"
        };
        const ext = extensiones[lenguaje?.toLowerCase()] || "txt";
        const blob = new Blob([codigo], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `codigo.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    });

    acciones.appendChild(btnCopiar);
    acciones.appendChild(btnDescargar);
    barra.appendChild(nombreLenguaje);
    barra.appendChild(acciones);

    // Bloque de código
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = codigo;
    if (lenguaje && hljs.getLanguage(lenguaje)) {
        try {
            code.innerHTML = hljs.highlight(codigo, { language: lenguaje }).value;
        } catch (e) {
            code.textContent = codigo;
        }
    }
    pre.appendChild(code);

    bloque.appendChild(barra);
    bloque.appendChild(pre);
    return bloque;
}

// ===== FUNCIÓN: PROCESAR TEXTO CON MARKDOWN Y BLOQUES =====
function procesarMensaje(texto) {
    const contenedor = document.createElement("div");

    // Separar por bloques de código ```
    const partes = texto.split(/```/);

    partes.forEach((parte, i) => {
        if (i % 2 === 1) {
            // Es un bloque de código
            const lineas = parte.split("\n");
            const lenguaje = lineas[0].trim().toLowerCase();
            const codigo = lineas.slice(1).join("\n").trim();

            if (lenguaje === "mermaid") {
                // Renderizar como diagrama Mermaid
                const contenedorMermaid = document.createElement("div");
                contenedorMermaid.classList.add("mermaid");
                contenedorMermaid.textContent = codigo;
                contenedor.appendChild(contenedorMermaid);
            } else {
                // Bloque de código normal
                contenedor.appendChild(crearBloqueCodigo(codigo, lenguaje));
            }
        } else {
            // Texto normal: convertir Markdown a HTML
            if (parte.trim()) {
                const html = marked.parse(parte);
                const div = document.createElement("div");
                div.innerHTML = html;
                contenedor.appendChild(div);
            }
        }
    });

    return contenedor;
}

// ===== FUNCIÓN: AGREGAR MENSAJE AL CHAT =====
function agregarMensaje(texto, tipo) {
    const div = document.createElement("div");
    div.classList.add("mensaje", tipo);

    if (tipo === "bot") {
        const contenido = procesarMensaje(texto);
        div.appendChild(contenido);
    } else {
        div.textContent = texto;
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    // Renderizar diagramas Mermaid
    const diagramas = div.querySelectorAll(".mermaid");
    if (diagramas.length > 0) {
        diagramas.forEach((d, idx) => {
            const idUnico = `mermaid-${Date.now()}-${idx}`;
            try {
                mermaid.render(idUnico, d.textContent).then(({ svg }) => {
                    d.innerHTML = svg;
                }).catch((err) => {
                    d.innerHTML = `<div class="error-mermaid">⚠️ No se pudo renderizar el diagrama Mermaid.<br><small>${escaparHTML(err.message || "")}</small></div>`;
                });
            } catch (err) {
                d.innerHTML = `<div class="error-mermaid">⚠️ Error al renderizar el diagrama.</div>`;
            }
        });
    }
}

// ===== FUNCIÓN: MOSTRAR "ESCRIBIENDO..." =====
function mostrarEscribiendo() {
    const div = document.createElement("div");
    div.classList.add("escribiendo");
    div.id = "escribiendo";
    div.innerHTML = "<span></span><span></span><span></span>";
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function quitarEscribiendo() {
    const el = document.getElementById("escribiendo");
    if (el) el.remove();
}

// ===== FUNCIÓN: ENVIAR MENSAJE AL BACKEND =====
async function enviarMensaje(texto) {
    if (!texto.trim() || enviando) return;

    enviando = true;
    btnEnviar.disabled = true;

    agregarMensaje(texto, "usuario");
    input.value = "";
    mostrarEscribiendo();

    try {
        const respuesta = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensaje: texto })
        });

        const data = await respuesta.json();
        quitarEscribiendo();

        if (data.ok) {
            agregarMensaje(data.respuesta, "bot");
        } else {
            agregarMensaje("⚠️ " + (data.error || "Error desconocido"), "error");
        }
    } catch (error) {
        quitarEscribiendo();
        agregarMensaje("⚠️ No se pudo conectar con el servidor.", "error");
        console.error(error);
    } finally {
        enviando = false;
        btnEnviar.disabled = false;
        input.focus();
    }
}

// ===== FUNCIÓN: INICIAR CHAT =====
async function iniciarChat() {
    chat.innerHTML = "";
    mostrarEscribiendo();

    try {
        const respuesta = await fetch("/iniciar", { method: "POST" });
        const data = await respuesta.json();
        quitarEscribiendo();

        if (data.ok) {
            agregarMensaje(data.respuesta, "bot");
        } else {
            agregarMensaje("⚠️ No se pudo iniciar el chat: " + data.error, "error");
        }
    } catch (error) {
        quitarEscribiendo();
        agregarMensaje("⚠️ No se pudo conectar con el servidor.", "error");
        console.error(error);
    }
}

// ===== EVENTOS =====
btnEnviar.addEventListener("click", () => enviarMensaje(input.value));

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarMensaje(input.value);
    }
});

btnReiniciar.addEventListener("click", () => {
    if (confirm("¿Reiniciar el chat? Se perderá el problema actual.")) {
        iniciarChat();
    }
});

// ===== INICIAR AL CARGAR LA PÁGINA =====
window.addEventListener("load", () => {
    iniciarChat();
    input.focus();
});

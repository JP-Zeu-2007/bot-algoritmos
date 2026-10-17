// ============================================
// BOT DE ALGORITMOS - LÓGICA DEL CLIENTE
// ============================================

const chat = document.getElementById("chat");
const input = document.getElementById("input-mensaje");
const btnEnviar = document.getElementById("btn-enviar");
const btnReiniciar = document.getElementById("btn-reiniciar");

let enviando = false;

// Configurar Marked
marked.setOptions({ breaks: true, gfm: true });

// ===== ESCAPAR HTML =====
function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

// ===== LIMPIAR MERMAID =====
function limpiarMermaid(codigo) {
    let limpio = codigo.trim();
    limpio = limpio.replace(/```mermaid/g, "").replace(/```/g, "");
    limpio = limpio.trim();
    const palabrasClave = ["flowchart", "graph", "sequenceDiagram", "classDiagram", "stateDiagram", "erDiagram", "gantt", "pie", "journey"];
    for (const palabra of palabrasClave) {
        const idx = limpio.indexOf(palabra);
        if (idx !== -1) {
            limpio = limpio.substring(idx);
            break;
        }
    }
    return limpio;
}

// ===== DETECTAR Y CREAR BOTONES DE OPCIONES =====
function generarBotonesOpciones(texto) {
    const divBotones = document.createElement("div");
    divBotones.classList.add("opciones-container");

    // 1. Detectar el Menú Principal
    if (texto.includes("[1] TODOS LOS PROCESOS") && texto.includes("[2] SE REALIZA")) {
        const btn1 = document.createElement("button");
        btn1.classList.add("btn-opcion");
        btn1.textContent = "1. Rápido";
        btn1.onclick = () => enviarMensaje("1");

        const btn2 = document.createElement("button");
        btn2.classList.add("btn-opcion");
        btn2.textContent = "2. Paso a Paso";
        btn2.onclick = () => enviarMensaje("2");

        divBotones.appendChild(btn1);
        divBotones.appendChild(btn2);
        return divBotones;
    }

    // 2. Detectar el Menú de Lenguajes
    if (texto.includes("¿En qué lenguaje de programación deseas el código?")) {
        const lenguajes = [
            { id: "1", nombre: "Python" },
            { id: "2", nombre: "Java" },
            { id: "3", nombre: "JavaScript" },
            { id: "4", nombre: "C++" },
            { id: "5", nombre: "C#" },
            { id: "6", nombre: "PSeInt" }
        ];
        
        lenguajes.forEach(lang => {
            const btn = document.createElement("button");
            btn.classList.add("btn-opcion");
            btn.textContent = lang.nombre;
            btn.onclick = () => enviarMensaje(lang.id);
            divBotones.appendChild(btn);
        });

        const btnOtro = document.createElement("button");
        btnOtro.classList.add("btn-opcion");
        btnOtro.textContent = "Otro";
        btnOtro.onclick = () => {
            input.value = "7. ";
            input.focus();
        };
        divBotones.appendChild(btnOtro);
        return divBotones;
    }

    return null;
}

// ===== CREAR BLOQUE DE CÓDIGO =====
function crearBloqueCodigo(codigo, lenguaje) {
    const bloque = document.createElement("div");
    bloque.classList.add("bloque-codigo");

    const barra = document.createElement("div");
    barra.classList.add("barra-codigo");

    const nombreLenguaje = document.createElement("span");
    nombreLenguaje.classList.add("lenguaje");
    nombreLenguaje.textContent = lenguaje || "código";

    const acciones = document.createElement("div");
    acciones.classList.add("acciones");

    const btnCopiar = document.createElement("button");
    btnCopiar.textContent = "📋 Copiar";
    btnCopiar.addEventListener("click", () => {
        navigator.clipboard.writeText(codigo).then(() => {
            btnCopiar.textContent = "✅ Copiado";
            setTimeout(() => (btnCopiar.textContent = "📋 Copiar"), 1500);
        });
    });

    const btnDescargar = document.createElement("button");
    btnDescargar.textContent = "⬇️ Descargar";
    btnDescargar.addEventListener("click", () => {
        const extensiones = { python: "py", java: "java", javascript: "js", "c++": "cpp", csharp: "cs", c: "c", mermaid: "mmd", html: "html", css: "css" };
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

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    if (lenguaje && hljs.getLanguage(lenguaje)) {
        try { code.innerHTML = hljs.highlight(codigo, { language: lenguaje }).value; } catch (e) { code.textContent = codigo; }
    } else { code.textContent = codigo; }
    pre.appendChild(code);
    bloque.appendChild(barra);
    bloque.appendChild(pre);
    return bloque;
}

// ===== PROCESAR MENSAJE =====
function procesarMensaje(texto) {
    const contenedor = document.createElement("div");
    const partes = texto.split(/```/);

    partes.forEach((parte, i) => {
        if (i % 2 === 1) {
            const lineas = parte.split("\n");
            const lenguaje = lineas[0].trim().toLowerCase();
            const codigo = lineas.slice(1).join("\n").trim();

            if (lenguaje === "mermaid") {
                const contenedorMermaid = document.createElement("div");
                contenedorMermaid.classList.add("mermaid");
                contenedorMermaid.textContent = codigo;
                contenedor.appendChild(contenedorMermaid);
            } else {
                contenedor.appendChild(crearBloqueCodigo(codigo, lenguaje));
            }
        } else {
            if (parte.trim()) {
                const html = marked.parse(parte);
                const div = document.createElement("div");
                div.innerHTML = html;
                contenedor.appendChild(div);
            }
        }
    });

    // Al final del mensaje, buscar si hay opciones y agregar botones
    const botones = generarBotonesOpciones(texto);
    if (botones) {
        contenedor.appendChild(botones);
    }

    return contenedor;
}

// ===== AGREGAR MENSAJE =====
function agregarMensaje(texto, tipo) {
    const div = document.createElement("div");
    div.classList.add("mensaje", tipo);

    if (tipo === "bot") {
        div.appendChild(procesarMensaje(texto));
    } else {
        div.textContent = texto;
        // Agregar botón de editar al mensaje del usuario
        const btnEditar = document.createElement("button");
        btnEditar.classList.add("btn-editar");
        btnEditar.textContent = "✏️";
        btnEditar.title = "Editar mensaje";
        btnEditar.onclick = () => editarMensaje(div, texto);
        div.appendChild(btnEditar);
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    // Renderizar Mermaid
    const diagramas = div.querySelectorAll(".mermaid");
    diagramas.forEach((d, idx) => {
        const codigoLimpio = limpiarMermaid(d.textContent);
        const idUnico = `mermaid-${Date.now()}-${idx}`;
        mermaid.render(idUnico, codigoLimpio).then(({ svg }) => {
            d.innerHTML = svg;
        }).catch(() => {
            d.innerHTML = `<div class="error-mermaid">⚠️ No se pudo renderizar el diagrama Mermaid. El código generado tenía errores de sintaxis.</div>`;
        });
    });
}

// ===== LÓGICA DE EDITAR MENSAJE =====
function editarMensaje(divMensaje, textoOriginal) {
    if (enviando) return;
    
    // Poner el texto en el input
    input.value = textoOriginal;
    input.focus();

    // Eliminar los mensajes de la pantalla desde este punto en adelante
    let siguiente = divMensaje.nextElementSibling;
    while (siguiente) {
        let aBorrar = siguiente;
        siguiente = siguiente.nextElementSibling;
        aBorrar.remove();
    }
    divMensaje.remove();

    // Reiniciar el historial del backend para que la IA olvide lo que vino después
    fetch("/reiniciar_historial", { method: "POST" });
}

// ===== ESCRIBIENDO =====
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

// ===== ENVIAR MENSAJE =====
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

// ===== INICIAR CHAT =====
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

window.addEventListener("load", () => {
    iniciarChat();
    input.focus();
});

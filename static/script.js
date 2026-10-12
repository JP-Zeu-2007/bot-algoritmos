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

// ===== INICIALIZAR MERMAID =====
mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose"
});

// ===== FUNCIÓN: AGREGAR MENSAJE AL CHAT =====
function agregarMensaje(texto, tipo) {
    const div = document.createElement("div");
    div.classList.add("mensaje", tipo);

    // Detectar bloques de código (``` ... ```)
    const partes = texto.split(/```/);

    partes.forEach((parte, i) => {
        if (i % 2 === 1) {
            // Es un bloque de código
            const idiomaMatch = parte.match(/^(\w+)\n/);
            let codigo = parte;
            let idioma = "";

            if (idiomaMatch) {
                idioma = idiomaMatch[1];
                codigo = parte.replace(/^\w+\n/, "");
            }

            // Si es Mermaid, renderizar como diagrama
            if (idioma === "mermaid") {
                const contenedorMermaid = document.createElement("div");
                contenedorMermaid.classList.add("mermaid");
                contenedorMermaid.textContent = codigo;
                div.appendChild(contenedorMermaid);
            } else {
                // Código normal
                const pre = document.createElement("pre");
                const code = document.createElement("code");
                code.textContent = codigo;
                pre.appendChild(code);
                div.appendChild(pre);
            }
        } else {
            // Texto normal
            if (parte.trim()) {
                const p = document.createElement("span");
                p.textContent = parte;
                div.appendChild(p);
            }
        }
    });

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    // Renderizar diagramas Mermaid que haya en el mensaje
    const diagramas = div.querySelectorAll(".mermaid");
    if (diagramas.length > 0) {
        mermaid.run({ nodes: diagramas });
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

    // Mostrar mensaje del usuario
    agregarMensaje(texto, "usuario");
    input.value = "";

    // Mostrar indicador de escritura
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
btnEnviar.addEventListener("click", () => {
    enviarMensaje(input.value);
});

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
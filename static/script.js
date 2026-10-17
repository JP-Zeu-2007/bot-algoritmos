// ============================================
// BOT DE ALGORITMOS - LÓGICA DEL CLIENTE
// ============================================

const chat = document.getElementById("chat");
const input = document.getElementById("input-mensaje");
const btnEnviar = document.getElementById("btn-enviar");
const btnReiniciar = document.getElementById("btn-reiniciar");
const menuIa = document.getElementById("menu-ia");
const areaEntrada = document.getElementById("area-entrada");

let enviando = false;
let ultimoMensajeBot = "";
const sintetizador = window.speechSynthesis;

marked.setOptions({ breaks: true, gfm: true });

// ===== SISTEMA DE VOZ Y ANIMACIÓN DE MIKU =====
function hablarTexto(texto) {
    if (!sintetizador) return;
    sintetizador.cancel();

    let textoLimpio = texto.replace(/[`*#_]/g, '').substring(0, 200); 
    
    const bocadillo = document.getElementById("miku-texto");
    const mikuSprite = document.getElementById("miku-sprite");

    if (bocadillo) {
        bocadillo.textContent = "🎤 " + textoLimpio.substring(0, 40) + "...";
        bocadillo.style.display = "block";
    }

    if (mikuSprite) {
        mikuSprite.className = "miku-hablando"; 
    }

    const utterance = new SpeechSynthesisUtterance(textoLimpio);
    utterance.lang = 'es-ES'; 
    utterance.pitch = 1.5; 
    utterance.rate = 1.1;  

    utterance.onend = () => { 
        if (bocadillo) bocadillo.style.display = "none"; 
        if (mikuSprite) mikuSprite.className = "miku-idle"; 
    };
    
    sintetizador.speak(utterance);
}

function hablarUltimoMensaje() {
    if (ultimoMensajeBot) {
        hablarTexto(ultimoMensajeBot);
    } else {
        hablarTexto("Hola, aún no tengo ningún mensaje que leer. ¡Hazme una pregunta!");
    }
}

// ===== LÓGICA PARA ARRASTRAR A MIKU CON EL MOUSE =====
const miku = document.getElementById('miku-contenedor');
const mikuSpriteDrag = document.getElementById('miku-sprite');
let isDragging = false;
let offsetX, offsetY;

miku.addEventListener('mousedown', (e) => {
    isDragging = true;
    miku.style.animation = 'none';
    miku.style.cursor = 'grabbing';
    mikuSpriteDrag.className = "miku-caminando"; 
    
    const rect = miku.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    const maxX = window.innerWidth - miku.offsetWidth;
    const maxY = window.innerHeight - miku.offsetHeight;
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    miku.style.left = `${x}px`;
    miku.style.top = `${y}px`;
    miku.style.bottom = 'auto';
    miku.style.right = 'auto';
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        miku.style.cursor = 'grab';
        miku.style.animation = 'flotar 3s ease-in-out infinite'; 
        mikuSpriteDrag.className = "miku-idle"; 
    }
});

// ===== MERMAID =====
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

// ===== OPCIONES =====
function generarBotonesOpciones(texto) {
    const divBotones = document.createElement("div");
    divBotones.classList.add("opciones-container");
    divBotones.style.display = "flex";
    divBotones.style.gap = "10px";
    divBotones.style.marginTop = "15px";

    if (texto.includes("[1] TODOS LOS PROCESOS") && texto.includes("[2] SE REALIZA")) {
        const btn1 = document.createElement("button");
        btn1.className = "btn btn-outline-info btn-sm";
        btn1.textContent = "1. Rápido";
        btn1.onclick = () => enviarMensaje("1");

        const btn2 = document.createElement("button");
        btn2.className = "btn btn-outline-info btn-sm";
        btn2.textContent = "2. Paso a Paso";
        btn2.onclick = () => enviarMensaje("2");

        divBotones.appendChild(btn1);
        divBotones.appendChild(btn2);
        return divBotones;
    }

    if (texto.includes("¿En qué lenguaje de programación deseas el código?")) {
        const lenguajes = ["Python", "Java", "JavaScript", "C++", "C#", "PSeInt"];
        lenguajes.forEach((lang, index) => {
            const btn = document.createElement("button");
            btn.className = "btn btn-outline-info btn-sm";
            btn.textContent = lang;
            btn.onclick = () => enviarMensaje((index + 1).toString());
            divBotones.appendChild(btn);
        });

        const btnOtro = document.createElement("button");
        btnOtro.className = "btn btn-outline-light btn-sm";
        btnOtro.textContent = "Otro";
        btnOtro.onclick = () => { input.value = "7. "; input.focus(); };
        divBotones.appendChild(btnOtro);
        return divBotones;
    }
    return null;
}

// ===== BLOQUE DE CÓDIGO =====
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

    acciones.appendChild(btnCopiar);
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
function procesarMensaje(textoOriginal) {
    const contenedor = document.createElement("div");
    let texto = textoOriginal;
    const preguntaLenguaje = "¿En qué lenguaje de programación deseas el código?";
    const regexDuplicado = new RegExp(`(${preguntaLenguaje}[\\s\\S]*?)${preguntaLenguaje}`, 'g');
    texto = texto.replace(regexDuplicado, preguntaLenguaje);

    const regexMermaid = /```mermaid([\s\S]*?)```/g;
    let textoLimpio = texto.replace(regexMermaid, "%%MERMAID_BLOCK%%$1%%END_MERMAID%%");

    const partes = textoLimpio.split(/```/);

    partes.forEach((parte, i) => {
        if (parte.includes("%%MERMAID_BLOCK%%")) {
            const codigoMermaid = parte.split("%%MERMAID_BLOCK%%")[1].split("%%END_MERMAID%%")[0].trim();
            const contenedorMermaid = document.createElement("div");
            contenedorMermaid.classList.add("mermaid");
            contenedorMermaid.style.background = "#0f172a";
            contenedorMermaid.style.padding = "15px";
            contenedorMermaid.style.borderRadius = "10px";
            contenedorMermaid.style.marginTop = "10px";
            contenedorMermaid.textContent = codigoMermaid;
            contenedor.appendChild(contenedorMermaid);
        } 
        else if (i % 2 === 1) {
            const lineas = parte.split("\n");
            const lenguaje = lineas[0].trim().toLowerCase();
            const codigo = lineas.slice(1).join("\n").trim();
            contenedor.appendChild(crearBloqueCodigo(codigo, lenguaje));
        } 
        else {
            if (parte.trim()) {
                const html = marked.parse(parte);
                const div = document.createElement("div");
                div.innerHTML = html;
                contenedor.appendChild(div);
            }
        }
    });

    const botones = generarBotonesOpciones(textoOriginal);
    if (botones) contenedor.appendChild(botones);

    return contenedor;
}

// ===== AGREGAR MENSAJE =====
function agregarMensaje(texto, tipo) {
    const div = document.createElement("div");
    div.classList.add("mensaje", tipo);

    if (tipo === "bot") {
        div.appendChild(procesarMensaje(texto));
        ultimoMensajeBot = texto; 
    } else {
        div.textContent = texto;
        const btnEditar = document.createElement("button");
        btnEditar.className = "btn btn-sm btn-link text-white float-end p-0 ms-2";
        btnEditar.innerHTML = "✏️";
        btnEditar.title = "Editar mensaje";
        btnEditar.onclick = () => editarMensaje(div, texto);
        div.appendChild(btnEditar);
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    const diagramas = div.querySelectorAll(".mermaid");
    diagramas.forEach((d, idx) => {
        const codigoLimpio = limpiarMermaid(d.textContent);
        const idUnico = `mermaid-${Date.now()}-${idx}`;
        if (!codigoLimpio) {
            d.innerHTML = `<div class="alert alert-warning mt-2">⚠️ Diagrama vacío.</div>`;
            return;
        }
        mermaid.render(idUnico, codigoLimpio).then(({ svg }) => {
            d.innerHTML = svg;
        }).catch(() => {
            d.innerHTML = `<div class="alert alert-warning mt-2">⚠️ Error al dibujar el diagrama.</div>`;
        });
    });
}

// ===== EDITAR MENSAJE =====
function editarMensaje(divMensaje, textoOriginal) {
    if (enviando) return;
    input.value = textoOriginal;
    input.focus();

    let siguiente = divMensaje.nextElementSibling;
    while (siguiente) {
        let aBorrar = siguiente;
        siguiente = siguiente.nextElementSibling;
        aBorrar.remove();
    }
    divMensaje.remove();
    fetch("/reiniciar_historial", { method: "POST" });
}

// ===== ESCRIBIENDO =====
function mostrarEscribiendo() {
    const div = document.createElement("div");
    div.classList.add("mensaje", "bot");
    div.id = "escribiendo";
    div.innerHTML = "<span class='spinner-grow spinner-grow-sm text-info' role='status'></span> Pensando...";
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
            hablarTexto(data.respuesta); 
        } else {
            agregarMensaje("⚠️ " + (data.error || "Error desconocido"), "error");
        }
    } catch (error) {
        quitarEscribiendo();
        agregarMensaje("⚠️ No se pudo conectar con el servidor.", "error");
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
    }
}

// ===== SELECCIÓN DE IA =====
async function iniciarIA(iaSeleccionada) {
    menuIa.style.display = "none";
    chat.style.display = "flex";
    areaEntrada.style.display = "block";
    
    await fetch("/seleccionar_ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ia: iaSeleccionada })
    });

    iniciarChat();
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
        chat.innerHTML = "";
        chat.style.display = "none";
        areaEntrada.style.display = "none";
        menuIa.style.display = "flex";
    }
});

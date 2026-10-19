// ============================================
// BOT DE ALGORITMOS - LÓGICA DEL CLIENTE
// ============================================

const chat = document.getElementById("chat");
const input = document.getElementById("input-mensaje");
const btnEnviar = document.getElementById("btn-enviar");
const btnReiniciar = document.getElementById("btn-reiniciar");
const mikuContenedor = document.getElementById("miku-contenedor");
const mikuSprite = document.getElementById("miku-sprite");

let enviando = false;
let ultimoMensajeBot = "";

// ===== LÓGICA PARA VOLTEAR A MIKU SEGÚN SU POSICIÓN =====
// Esta función revisa constantemente dónde está Miku en la pantalla
let ultimaPosicionX = 0;
function revisarDireccionMiku() {
    const rect = mikuContenedor.getBoundingClientRect();
    const xActual = rect.left;

    // Si se está moviendo hacia la izquierda (xActual es menor a la anterior)
    if (xActual < ultimaPosicionX) {
        mikuSprite.classList.remove("mirando-derecha");
        mikuSprite.classList.add("mirando-izquierda");
    } 
    // Si se está moviendo hacia la derecha (xActual es mayor)
    else if (xActual > ultimaPosicionX) {
        mikuSprite.classList.remove("mirando-izquierda");
        mikuSprite.classList.add("mirando-derecha");
    }
    
    ultimaPosicionX = xActual;
    requestAnimationFrame(revisarDireccionMiku); // Bucle infinito para revisar
}

// Iniciamos la revisión cuando carga la página
window.addEventListener('load', () => {
    revisarDireccionMiku();
    iniciarChat(); // <-- El inicio del chat se queda aquí
});


// ===== SISTEMA DE VOZ NATIVA =====
function hablarTexto(texto) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    let textoLimpio = texto.replace(/[`*#_]/g, '').substring(0, 250); 
    const bocadillo = document.getElementById("miku-texto");

    if (bocadillo) {
        bocadillo.textContent = "🎤 " + textoLimpio.substring(0, 35) + "...";
        bocadillo.style.display = "block";
    }
    
    // Quitamos el "caminando" para que no interfiera con el habla
    mikuSprite.classList.remove("miku-caminando");
    mikuSprite.classList.add("miku-hablando");

    const utterance = new SpeechSynthesisUtterance(textoLimpio);
    utterance.lang = 'es-ES'; 
    utterance.pitch = 1.8; 
    utterance.rate = 1.2;  

    utterance.onend = () => { 
        if (bocadillo) bocadillo.style.display = "none"; 
        mikuSprite.classList.remove("miku-hablando");
        mikuSprite.classList.add("miku-caminando"); 
    };
    
    window.speechSynthesis.speak(utterance);
}

function hablarUltimoMensaje() {
    if (ultimoMensajeBot) {
        hablarTexto(ultimoMensajeBot);
    } else {
        hablarTexto("Hola, soy Miku. ¡Hazme una pregunta!");
    }
}

// ===== LIMPIAR MERMAID =====
function limpiarMermaid(codigo) {
    let limpio = codigo.replace(/```mermaid/g, "").replace(/```/g, "").trim();
    const palabrasClave = ["flowchart", "graph", "sequenceDiagram", "classDiagram"];
    for (let palabra of palabrasClave) {
        let idx = limpio.indexOf(palabra);
        if (idx !== -1) return limpio.substring(idx);
    }
    return limpio;
}

// ===== BOTONES DE OPCIONES =====
function generarBotonesOpciones(texto) {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.gap = "10px";
    div.style.marginTop = "15px";

    if (texto.includes("[1] TODOS LOS PROCESOS") && texto.includes("[2] SE REALIZA")) {
        let b1 = document.createElement("button");
        b1.className = "btn btn-outline-info btn-sm";
        b1.textContent = "1. Rápido";
        b1.onclick = () => enviarMensaje("1");

        let b2 = document.createElement("button");
        b2.className = "btn btn-outline-info btn-sm";
        b2.textContent = "2. Paso a Paso";
        b2.onclick = () => enviarMensaje("2");

        div.appendChild(b1); div.appendChild(b2);
        return div;
    }

    if (texto.includes("¿En qué lenguaje de programación deseas el código?")) {
        const lenguajes = ["Python", "Java", "JavaScript", "C++", "C#", "PSeInt"];
        lenguajes.forEach((lang, i) => {
            let b = document.createElement("button");
            b.className = "btn btn-outline-info btn-sm";
            b.textContent = lang;
            b.onclick = () => enviarMensaje((i + 1).toString());
            div.appendChild(b);
        });
        let btnOtro = document.createElement("button");
        btnOtro.className = "btn btn-outline-light btn-sm";
        btnOtro.textContent = "Otro";
        btnOtro.onclick = () => { input.value = "7. "; input.focus(); };
        div.appendChild(btnOtro);
        return div;
    }
    return null;
}

// ===== CREAR BLOQUE DE CÓDIGO =====
function crearBloqueCodigo(codigo, lenguaje) {
    const bloque = document.createElement("div");
    bloque.classList.add("bloque-codigo");
    bloque.innerHTML = `
        <div class="barra-codigo">
            <span>${lenguaje || 'código'}</span>
            <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText)">📋 Copiar</button>
        </div>
        <pre><code>${codigo.replace(/</g, "&lt;")}</code></pre>
    `;
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
            let codigoMermaid = parte.split("%%MERMAID_BLOCK%%")[1].split("%%END_MERMAID%%")[0].trim();
            let contenedorMermaid = document.createElement("div");
            contenedorMermaid.classList.add("mermaid");
            contenedorMermaid.textContent = codigoMermaid;
            contenedor.appendChild(contenedorMermaid);
        } 
        else if (i % 2 === 1) {
            let lineas = parte.split("\n");
            let lenguaje = lineas[0].trim().toLowerCase();
            let codigo = lineas.slice(1).join("\n").trim();
            contenedor.appendChild(crearBloqueCodigo(codigo, lenguaje));
        } 
        else {
            if (parte.trim()) {
                let div = document.createElement("div");
                div.innerHTML = marked.parse(parte);
                contenedor.appendChild(div);
            }
        }
    });

    let botones = generarBotonesOpciones(textoOriginal);
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
        div.innerHTML = `<span>${texto}</span> <button class="btn btn-sm btn-link text-white p-0 ms-2" onclick="editarMensaje(this.parentElement, '${texto.replace(/'/g, "\\'")}')">✏️</button>`;
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    const diagramas = div.querySelectorAll(".mermaid");
    diagramas.forEach((d, idx) => {
        let codigoLimpio = limpiarMermaid(d.textContent);
        if (!codigoLimpio) return;
        mermaid.render(`m-${Date.now()}-${idx}`, codigoLimpio)
            .then(res => d.innerHTML = res.svg)
            .catch(() => d.innerHTML = "<div class='alert alert-warning mt-2'>⚠️ Error al dibujar diagrama.</div>");
    });
}

// ===== LÓGICA DE EDITAR =====
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
    document.getElementById("escribiendo")?.remove();
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
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensaje: texto })
        });
        const data = await res.json();
        quitarEscribiendo();

        if (data.ok) {
            agregarMensaje(data.respuesta, "bot");
            hablarTexto(data.respuesta);
        } else {
            agregarMensaje("⚠️ " + data.error, "error");
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
        const res = await fetch("/iniciar", { method: "POST" });
        const data = await res.json();
        quitarEscribiendo();

        if (data.ok) {
            agregarMensaje(data.respuesta, "bot");
        } else {
            agregarMensaje("⚠️ " + data.error, "error");
        }
    } catch (error) {
        quitarEscribiendo();
        agregarMensaje("⚠️ No se pudo conectar con el servidor.", "error");
    }
}

// ===== SELECCIÓN DE IA =====
async function iniciarIA(iaSeleccionada) {
    document.querySelectorAll("#btn-groq, #btn-gemini").forEach(b => b.classList.remove("active"));
    document.getElementById(`btn-${iaSeleccionada}`).classList.add("active");
    
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
        iniciarChat();
    }
});

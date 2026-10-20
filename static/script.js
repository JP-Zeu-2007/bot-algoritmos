const chat = document.getElementById("chat");
const input = document.getElementById("input-mensaje");
const btnEnviar = document.getElementById("btn-enviar");
const btnReiniciar = document.getElementById("btn-reiniciar");
const mikuContenedor = document.getElementById("miku-contenedor");
const mikuSprite = document.getElementById("miku-sprite");

let enviando = false;
let ultimoMensajeBot = "";

marked.setOptions({ breaks: true, gfm: true });

// ===== LÓGICA PARA DETECTAR LA DIRECCIÓN =====
let ultimaPosicionX = 0;
function revisarDireccionMiku() {
    if (!mikuContenedor || isDragging) return;
    const rect = mikuContenedor.getBoundingClientRect();
    const xActual = rect.left;

    if (xActual < ultimaPosicionX) {
        mikuSprite.classList.remove("mirando-derecha");
        mikuSprite.classList.add("mirando-izquierda");
    } 
    else if (xActual > ultimaPosicionX) {
        mikuSprite.classList.remove("mirando-izquierda");
        mikuSprite.classList.add("mirando-derecha");
    }
    ultimaPosicionX = xActual;
    requestAnimationFrame(revisarDireccionMiku);
}

// ===== LÓGICA DE ARRASTRE =====
let isDragging = false;
let offsetX, offsetY;
let tiempoPresionado;

mikuContenedor.addEventListener('mousedown', (e) => {
    isDragging = true;
    mikuContenedor.style.animation = 'none'; // Detiene el caminar automático
    mikuSprite.classList.remove("miku-caminando");
    mikuSprite.classList.add("miku-hablando"); // Usa la pose de frente mientras la arrastras
    
    const rect = mikuContenedor.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    // Efecto de brillo mientras se arrastra
    mikuSprite.style.filter = "drop-shadow(0px 0px 25px #00ffff) brightness(1.3)";
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    const maxX = window.innerWidth - mikuContenedor.offsetWidth;
    const maxY = window.innerHeight - mikuContenedor.offsetHeight;
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    mikuContenedor.style.left = `${x}px`;
    mikuContenedor.style.top = `${y}px`;
    mikuContenedor.style.bottom = 'auto';
    mikuContenedor.style.right = 'auto';
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        // Reanudar caminata
        mikuContenedor.style.animation = 'patrullar 20s linear infinite alternate';
        mikuSprite.classList.remove("miku-hablando");
        mikuSprite.classList.add("miku-caminando");
        mikuSprite.style.filter = "drop-shadow(0px 0px 10px #00b4d8)";
        
        // Posicionar el "left" actual para que no salte al reanudar
        const rect = mikuContenedor.getBoundingClientRect();
        mikuContenedor.style.left = rect.left + 'px';
        mikuContenedor.style.top = 'auto';
        mikuContenedor.style.bottom = '0';
    }
});

// ===== INTERACCIÓN AL HACER CLIC =====
function interactuarMiku() {
    // Miku se detiene y muestra su bocadillo por 3 segundos
    mikuContenedor.style.animationPlayState = 'paused';
    mikuSprite.classList.remove("miku-caminando");
    mikuSprite.classList.add("miku-hablando");
    
    const bocadillo = document.getElementById("miku-texto");
    if (bocadillo) {
        bocadillo.textContent = "¡Hola! 🎤";
        bocadillo.style.display = "block";
    }

    // Efecto de brillo
    mikuSprite.style.filter = "drop-shadow(0px 0px 25px #00ffff) brightness(1.3)";

    setTimeout(() => {
        if (bocadillo) bocadillo.style.display = "none";
        mikuSprite.classList.remove("miku-hablando");
        mikuSprite.classList.add("miku-caminando");
        mikuSprite.style.filter = "drop-shadow(0px 0px 10px #00b4d8)";
        mikuContenedor.style.animationPlayState = 'running';
    }, 3000);
}

// ===== LIMPIAR MERMAID =====
function limpiarMermaid(codigo) {
    let limpio = codigo.replace(/```mermaid/gi, "").replace(/```/g, "");
    limpio = limpio.replace(/`/g, "").trim();
    const palabrasClave = ["flowchart", "graph", "sequenceDiagram", "classDiagram", "stateDiagram", "erDiagram", "gantt", "pie", "journey"];
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
        
        // Miku se detiene cuando el bot responde (para "leer" visualmente)
        mikuContenedor.style.animationPlayState = 'paused';
        mikuSprite.classList.remove("miku-caminando");
        mikuSprite.classList.add("miku-hablando");

        // Vuelve a caminar después de 4 segundos
        setTimeout(() => {
            mikuSprite.classList.remove("miku-hablando");
            mikuSprite.classList.add("miku-caminando");
            mikuContenedor.style.animationPlayState = 'running';
        }, 4000);

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
            .catch((error) => {
                d.innerHTML = `<div class="alert alert-warning mt-2" style="font-size: 0.85rem;"><strong>⚠️ Error al dibujar diagrama.</strong></div>`;
            });
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

// ===== INICIALIZACIÓN =====
window.addEventListener('load', () => {
    revisarDireccionMiku();
    iniciarChat();
});

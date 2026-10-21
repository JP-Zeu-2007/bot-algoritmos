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
let audioActual = null;

marked.setOptions({ breaks: true, gfm: true });

// ===== LÓGICA PARA VOLTEAR A MIKU =====
let ultimaPosicionX = 0;
function revisarDireccionMiku() {
    if (!mikuContenedor) return;
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

// ===== SISTEMA DE VOZ (FISH AUDIO) =====
async function hablarTexto(texto) {
    const bocadillo = document.getElementById("miku-texto");
    let textoLimpio = texto.replace(/[`*#_]/g, '').substring(0, 50); 
    
    if (bocadillo) {
        bocadillo.textContent = "🎤 " + textoLimpio + "...";
        bocadillo.style.display = "block";
    }
    
    mikuSprite.classList.remove("miku-caminando");
    mikuSprite.classList.add("miku-hablando");

    try {
        const res = await fetch("/hablar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texto: texto })
        });
        const data = await res.json();

        if (data.ok) {
            if (audioActual) {
                audioActual.pause();
                audioActual.currentTime = 0;
            }
            audioActual = new Audio("data:audio/mp3;base64," + data.audio);
            audioActual.onended = () => {
                if (bocadillo) bocadillo.style.display = "none";
                mikuSprite.classList.remove("miku-hablando");
                mikuSprite.classList.add("miku-caminando");
            };
            audioActual.play().catch(err => {
                console.error("Audio bloqueado por el navegador.", err);
                if (bocadillo) bocadillo.textContent = "🔇 Haz clic en la página para activar mi voz.";
            });
        } else {
            mikuSprite.classList.remove("miku-hablando");
            mikuSprite.classList.add("miku-caminando");
        }
    } catch (error) {
        mikuSprite.classList.remove("miku-hablando");
        mikuSprite.classList.add("miku-caminando");
    }
}

function hablarUltimoMensaje() {
    hablarTexto(ultimoMensajeBot || "Hola, soy Miku. ¡Hazme una pregunta!");
}

// ===== LIMPIAR MERMAID =====
function limpiarMermaid(codigo) {
    let limpio = codigo;
    limpio = limpio.replace(/```mermaid/gi, "").replace(/```/g, "");
    limpio = limpio.replace(/`/g, "").trim();
    const palabrasClave = ["flowchart", "graph", "sequenceDiagram", "classDiagram", "stateDiagram", "erDiagram", "gantt", "pie", "journey"];
    let inicioEncontrado = false;
    for (let palabra of palabrasClave) {
        let idx = limpio.indexOf(palabra);
        if (idx !== -1) {
            limpio = limpio.substring(idx);
            inicioEncontrado = true;
            break;
        }
    }
    if (!inicioEncontrado) return "";
    limpio = limpio.replace(/-->/g, "-->").replace(/-->/g, "-->");
    limpio = limpio.replace(/\{([^}]+)\}/g, function(match, p1) {
        return `{"${p1.replace(/"/g, "")}"}`;
    });
    limpio = limpio.replace(/\[([^\]]+)\]/g, function(match, p1) {
        if (p1.includes('"')) return match;
        return `["${p1}"]`;
    });
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

// ===== LÓGICA DE SIMULACIÓN =====
function simularCodigo(codigoOriginal, bloqueOriginal) {
    if (bloqueOriginal.querySelector(".consola-simulacion")) return;

    const lineas = codigoOriginal.split("\n").filter(l => l.trim() !== "");
    let pasoActual = 0;

    const consola = document.createElement("div");
    consola.classList.add("consola-simulacion");
    
    const controles = document.createElement("div");
    controles.style.display = "flex";
    controles.style.justifyContent = "space-between";
    controles.style.marginBottom = "10px";
    
    const btnAtras = document.createElement("button");
    btnAtras.className = "btn btn-sm btn-outline-warning";
    btnAtras.textContent = "⬅️ Atrás";
    
    const btnAdelante = document.createElement("button");
    btnAdelante.className = "btn btn-sm btn-outline-success";
    btnAdelante.textContent = "Adelante ➡️";
    
    controles.appendChild(btnAtras);
    controles.appendChild(btnAdelante);

    const displayLinea = document.createElement("div");
    displayLinea.style.minHeight = "80px";
    
    consola.appendChild(controles);
    consola.appendChild(displayLinea);
    bloqueOriginal.appendChild(consola);

    const actualizarPantalla = () => {
        const lineaActual = lineas[pasoActual];
        const partes = lineaActual.split("//");
        const codigoPuro = partes[0] || "";
        const comentario = partes[1] ? partes[1].trim() : "";

        let html = `<div style="color: #00ff00;">> ${codigoPuro}</div>`;
        if (comentario) {
            html += `<div class="comentario" style="margin-top: 5px;">← ${comentario}</div>`;
        }
        
        displayLinea.innerHTML = html;
        
        btnAtras.disabled = pasoActual === 0;
        btnAdelante.disabled = pasoActual === lineas.length - 1;
    };

    btnAdelante.onclick = () => {
        if (pasoActual < lineas.length - 1) {
            pasoActual++;
            actualizarPantalla();
        }
    };

    btnAtras.onclick = () => {
        if (pasoActual > 0) {
            pasoActual--;
            actualizarPantalla();
        }
    };

    actualizarPantalla();
}

// ===== CREAR BLOQUE DE CÓDIGO (CON BOTÓN COPIAR ARREGLADO) =====
function crearBloqueCodigo(codigo, lenguaje) {
    const bloque = document.createElement("div");
    bloque.classList.add("bloque-codigo");
    
    const barra = document.createElement("div");
    barra.classList.add("barra-codigo");
    
    // Botones
    let botonesHtml = '';
    if (lenguaje === 'text' || lenguaje === 'pseudocodigo') {
        botonesHtml += `<button class="btn-simular" style="margin-right: 5px; background: #00b4d8; color: white; border: none; border-radius: 5px; padding: 2px 8px; cursor: pointer; font-size: 0.75rem;">▶️ Simular</button>`;
    }
    // Usamos un identificador único para el botón de copiar
    const idBoton = `btn-copiar-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    botonesHtml += `<button id="${idBoton}" style="background: transparent; border: 1px solid #475569; color: #cbd5e1; border-radius: 5px; padding: 2px 8px; cursor: pointer; font-size: 0.75rem;">📋 Copiar</button>`;

    barra.innerHTML = `
        <span>${lenguaje || 'código'}</span>
        <div>${botonesHtml}</div>
    `;

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    // Escapamos el código para evitar inyecciones HTML
    code.innerHTML = codigo.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    pre.appendChild(code);

    bloque.appendChild(barra);
    bloque.appendChild(pre);

    // Asignar evento copiar
    const btnCopiar = barra.querySelector(`#${idBoton}`);
    if (btnCopiar) {
        btnCopiar.onclick = () => {
            navigator.clipboard.writeText(codigo).then(() => {
                btnCopiar.textContent = "✅ Copiado";
                setTimeout(() => btnCopiar.textContent = "📋 Copiar", 2000);
            });
        };
    }

    // Asignar evento simular
    const btnSimular = barra.querySelector(".btn-simular");
    if (btnSimular) {
        btnSimular.onclick = () => simularCodigo(codigo, bloque);
    }

    return bloque;
}

// ===== PROCESAR MENSAJE =====
function procesarMensaje(textoOriginal) {
    const contenedor = document.createElement("div");
    let texto = textoOriginal;
    
    const menuTexto = "[1] TODOS LOS PROCESOS Y PASOS JUNTOS";
    if (texto.split(menuTexto).length > 2) {
        const primerMenu = texto.indexOf(menuTexto);
        texto = texto.substring(0, primerMenu + 150) + "\n\n(Selecciona una opción)";
    }

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
            .catch((error) => {
                console.error("Error de Mermaid:", error);
                d.innerHTML = `<div class="alert alert-warning mt-2" style="font-size: 0.85rem;"><strong>⚠️ Diagrama con errores de sintaxis.</strong><pre>${codigoLimpio}</pre></div>`;
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

// ===== INICIALIZACIÓN =====
window.addEventListener('load', () => {
    revisarDireccionMiku();
    iniciarChat();
});

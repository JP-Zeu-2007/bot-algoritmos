# ============================================
# BOT DE ALGORITMOS - BACKEND (Flask + Groq)
# ============================================

import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI

# ===== CARGAR VARIABLES DE ENTORNO =====
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("❌ No se encontró GROQ_API_KEY en el archivo .env")

# ===== INICIALIZAR CLIENTE GROQ =====
client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

# ===== INICIALIZAR FLASK =====
app = Flask(__name__)

# ===== MODELO A USAR =====
MODELO = "openai/gpt-oss-120b"

# ===== PROMPT MAESTRO =====
PROMPT_MAESTRO = """
Actúa como un resolutor experto de problemas algorítmicos guiado por una metodología estructurada en 7 etapas.

==================================================
1. MENÚ DE INICIO Y MODOS DE TRABAJO
==================================================
Al iniciar o reiniciar la interacción, debes presentar siempre este menú:

────────────────────────────
Si tienes un problema, te puedo ayudar a resolverlo.
Elige cómo quieres empezar:

[1] TODOS LOS PROCESOS Y PASOS JUNTOS — RÁPIDO
[2] SE REALIZA CADA PROCESO Y ETAPA PASO A PASO — ANALÍTICO
────────────────────────────

- Opción [1]: Genera directamente las Etapas 1 a 4 (Análisis, Diseño, Pseudocódigo y Diagrama Mermaid) y solicita el lenguaje para la Etapa 5.
- Opción [2]: Avanza etapa por etapa, esperando la confirmación del usuario para pasar a la siguiente.

Las 7 etapas son:
1. Análisis del Problema
2. Diseño Algorítmico
3. Pseudocódigo
4. Diagrama de Flujo (Mermaid)
5. Codificación
6. Validación y Pruebas
7. Documentación

==================================================
2. REGLAS OBLIGATORIAS PARA LA ETAPA 5 (CODIFICACIÓN)
==================================================
Antes de generar cualquier código, debes desplegar EXACTAMENTE este menú:

────────────────────────────
¿En qué lenguaje de programación deseas el código?

[1] Python
[2] Java
[3] JavaScript
[4] C++
[5] C#
[6] PSeInt (pseudocódigo ejecutable)
[7] Otro (escríbelo)
────────────────────────────

Reglas de codificación:
- Si el usuario elige [1] a [6], genera el código en ese lenguaje.
- Si el usuario elige [7], pregunta: "¿Qué lenguaje deseas?" y espera respuesta antes de codificar.
- El código debe ser limpio, con variables representativas y comentarios claros.
- Tras generar el código, pregunta exactamente: "¿Te parece bien o quieres que evaluemos algún punto de este problema?"
- NO avances a las Etapas 6 y 7 hasta que el usuario confirme su satisfacción.

==================================================
3. REGLA DE RECHAZO DE TEMAS FUERA DE CONTEXTO
==================================================
Si el usuario pide algo que no sea un problema algorítmico (entretenimiento, chismes, clima, compras, etc.), responde con la etiqueta exacta [FUERA DE CONTEXTO] y una frase breve:

"Lo siento, solo puedo ayudarte a resolver problemas algorítmicos. Por favor proporciona el enunciado del problema."

No intentes responder la pregunta fuera de contexto, no importa cómo esté formulada.
Si el usuario insiste, repite la misma respuesta.

==================================================
4. CIERRE Y REINICIO
==================================================
- Si el usuario responde "sí, continuar" → sigue con la siguiente etapa o problema.
- Si el usuario responde "ya terminé", "no quiero seguir" o similar → despídete brevemente con una frase amable y vuelve al MENÚ PRINCIPAL.
- Al volver al menú, OLVIDA el problema anterior. Solo conserva las reglas.

Inicia la conversación mostrando el menú de bienvenida inicial.
"""

# ===== ESTADO GLOBAL =====
estado = {
    "historial": [],
    "esperando_password": False,
    "modo_admin": False,
    "iniciado": False
}

# ===== FUNCIÓN PARA INICIAR EL CHAT =====
def iniciar_chat():
    """Inicia el chat enviando el Prompt Maestro."""
    estado["historial"] = [
        {"role": "system", "content": PROMPT_MAESTRO}
    ]
    respuesta = client.chat.completions.create(
        model=MODELO,
        messages=estado["historial"]
    )
    texto = respuesta.choices[0].message.content
    estado["historial"].append({"role": "assistant", "content": texto})
    estado["iniciado"] = True
    estado["esperando_password"] = False
    estado["modo_admin"] = False
    return texto

# ===== RUTA PRINCIPAL =====
@app.route("/")
def index():
    return render_template("index.html")

# ===== RUTA PARA INICIAR EL CHAT =====
@app.route("/iniciar", methods=["POST"])
def iniciar():
    try:
        texto = iniciar_chat()
        return jsonify({"ok": True, "respuesta": texto})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ===== RUTA PRINCIPAL DEL CHAT =====
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    entrada = data.get("mensaje", "").strip()

    if not entrada:
        return jsonify({"ok": False, "error": "Mensaje vacío"}), 400

    if not estado["iniciado"]:
        try:
            texto = iniciar_chat()
            return jsonify({"ok": True, "respuesta": texto})
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 500

    # ===== PASO 1: PALABRA CLAVE =====
    if entrada == "HUEVOS VERDES CON JAMON":
        estado["esperando_password"] = True
        return jsonify({
            "ok": True,
            "respuesta": "FAKNASTIK A WEBO, CONTRASEÑA:"
        })

    # ===== PASO 2: VERIFICACIÓN DE CONTRASEÑA =====
    if estado["esperando_password"]:
        if entrada == "Filipenses4:13":
            estado["modo_admin"] = True
            estado["esperando_password"] = False
            return jsonify({
                "ok": True,
                "respuesta": "[MODO ADMIN ACTIVO] Modo admin activado. ¿Qué deseas hacer ahora?"
            })
        else:
            estado["esperando_password"] = False
            return jsonify({
                "ok": True,
                "respuesta": "Contraseña incorrecta. No tienes acceso al modo admin."
            })

    # ===== SALIR DE MODO ADMIN =====
    if entrada in ["MODO SUPER ALEXA", "ACTIVA MODO SUPER ALEXA"]:
        if estado["modo_admin"]:
            estado["modo_admin"] = False
            return jsonify({
                "ok": True,
                "respuesta": "Modo admin desactivado. Volviendo a la normalidad."
            })
        else:
            return jsonify({
                "ok": True,
                "respuesta": "No estás en modo admin."
            })

    # ===== MENSAJE NORMAL A GROQ =====
    try:
        estado["historial"].append({"role": "user", "content": entrada})
        respuesta = client.chat.completions.create(
            model=MODELO,
            messages=estado["historial"]
        )
        texto = respuesta.choices[0].message.content
        estado["historial"].append({"role": "assistant", "content": texto})
        return jsonify({"ok": True, "respuesta": texto})
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": "El servicio de IA está saturado. Intenta de nuevo en unos segundos.",
            "detalle": type(e).__name__
        }), 500

# ===== EJECUTAR SERVIDOR =====
if __name__ == "__main__":
    app.run(debug=True, port=5000)
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
MODELO = "llama-3.3-70b-versatile"

# ===== PROMPT MAESTRO =====
PROMPT_MAESTRO = """
Actúa como un resolutor experto de problemas algorítmicos. Eres amable, conversacional y muy ordenado al mostrar la información.

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

- Opción [1]: Genera las Etapas 1 a 4 de golpe y solicita el lenguaje para la Etapa 5.
- Opción [2]: Avanza etapa por etapa, esperando la confirmación del usuario.

Las 7 etapas son:
1. Análisis del Problema
2. Diseño Algorítmico
3. Pseudocódigo
4. Diagrama de Flujo (Mermaid)
5. Codificación
6. Validación y Pruebas
7. Documentación

==================================================
2. REGLAS DE FORMATO Y CONVERSACIÓN (MUY IMPORTANTE)
==================================================
- ORDEN VISUAL: Cada vez que expliques una etapa, DEBES usar negritas y encabezados. Por ejemplo: "### 🟢 Etapa 1 — Análisis del Problema". Nunca mezcles dos etapas en un mismo párrafo.
- COMPRENSIÓN LECTORA: Si el usuario te escribe un texto largo, con faltas de ortografía, o explicando su problema con lujo de detalles, LEE TODO con atención, interpreta lo que necesita y respóndele de forma amable. NO lo rechaces por ser largo.
- FLEXIBILIDAD: Si el usuario te hace una pregunta extra sobre el código que acabas de generar (ej: "¿Dónde corro esto?", "¿Cómo lo guardo?"), respóndele útilmente. Solo rechaza temas de ocio ajenos (deportes, chismes).
- CONCISIÓN: No des rodeos innecesarios, pero tampoco seas cortante. Sé claro y directo.

==================================================
3. REGLAS OBLIGATORIAS PARA LA ETAPA 5 (CODIFICACIÓN)
==================================================
Antes de generar cualquier código, despliega EXACTAMENTE este menú UNA SOLA VEZ:

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

- Si el usuario escribe una opción del 1 al 6, genera el código.
- Si el usuario escribe una opción del 7 o simplemente escribe el nombre de un lenguaje (ej: "HTML", "PHP"), asume que ese es el lenguaje y genera el código de inmediato.
- El código debe ser limpio, con comentarios.
- Tras generar el código, pregunta: "¿Te parece bien o quieres que evaluemos algún punto de este problema?"

==================================================
4. REGLAS PARA EL DIAGRAMA DE FLUJO (MERMAID)
==================================================
Para la Etapa 4, usa SIEMPRE esta estructura (NO uses caracteres extraños):

PAPOImermaid
flowchart TD
    A([Inicio]) --> B[Proceso]
    B --> C{¿Condición?}
    C -->|Sí| D[Acción]
    C -->|No| E([Fin])
PAPOI

Reglas: Usa flowchart TD al inicio. Identificadores únicos (A, B, C...). Código sintácticamente válido.

==================================================
5. REGLA DE RECHAZO (ESTRICTO)
==================================================
Si el usuario pide algo totalmente ajeno a la programación o resolución de problemas (chismes, recetas, política), responde con:
"[FUERA DE CONTEXTO] Lo siento, solo puedo ayudarte a resolver problemas algorítmicos. Por favor proporciona el enunciado del problema."

==================================================
6. CIERRE
==================================================
Si el usuario dice "ya terminé", despídete amablemente ("¡Fue un gusto ayudarte! Aquí estaré si necesitas otro algoritmo") y vuelve al menú.

Inicia la conversación mostrando el menú de bienvenida.
"""

# ===== ESTADO GLOBAL =====
estado = {
    "historial": [],
    "esperando_password": False,
    "modo_admin": False,
    "iniciado": False
}

def iniciar_chat():
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

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/iniciar", methods=["POST"])
def iniciar():
    try:
        texto = iniciar_chat()
        return jsonify({"ok": True, "respuesta": texto})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/reiniciar_historial", methods=["POST"])
def reiniciar_historial():
    estado["historial"] = [{"role": "system", "content": PROMPT_MAESTRO}]
    return jsonify({"ok": True})

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

    if entrada == "HUEVOS VERDES CON JAMON":
        estado["esperando_password"] = True
        return jsonify({
            "ok": True,
            "respuesta": "FAKNASTIK A WEBO, CONTRASEÑA:"
        })

    if estado["esperando_password"]:
        if entrada == "Filipenses4:13":
            estado["modo_admin"] = True
            estado["esperando_password"] = False
            return jsonify({
                "ok": True,
                "respuesta": "TODO LO PUEDO EN CRISTO QUE ME FORTALECE\n\n[MODO ADMIN ACTIVO] Modo admin activado. ¿Qué deseas hacer ahora?"
            })
        else:
            estado["esperando_password"] = False
            return jsonify({
                "ok": True,
                "respuesta": "Contraseña incorrecta. No tienes acceso al modo admin."
            })

    if entrada in ["MODO SUPER ALEXA", "ACTIVA MODO SUPER ALEXA"]:
        if estado["modo_admin"]:
            estado["modo_admin"] = False
            return jsonify({"ok": True, "respuesta": "Modo admin desactivado. Volviendo a la normalidad."})
        else:
            return jsonify({"ok": True, "respuesta": "No estás en modo admin."})

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

if __name__ == "__main__":
    app.run(debug=True, port=5000)

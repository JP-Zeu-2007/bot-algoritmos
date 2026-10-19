# ============================================
# BOT DE ALGORITMOS - BACKEND (Groq + Gemini + Google TTS)
# ============================================

import os
import base64
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI
from google import genai

load_dotenv()

# ===== API KEYS =====
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = Flask(__name__)

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

- Opción [1]: Genera las Etapas 1 a 4 de golpe, LUEGO la Evaluación de Alternativas, y finalmente solicita el lenguaje para la Etapa 5.
- Opción [2]: Avanza etapa por etapa, esperando la confirmación del usuario.

Las 7 etapas oficiales son:
1. Análisis del Problema
2. Diseño Algorítmico
3. Pseudocódigo
4. Diagrama de Flujo (Mermaid)
5. Codificación
6. Validación y Pruebas
7. Documentación

==================================================
2. REGLA ESPECIAL: EVALUACIÓN DE ALTERNATIVAS (TABLA)
==================================================
Justo antes de generar el código (Etapa 5), DEBES presentar una "Matriz de Evaluación de Soluciones". 
Propón 3 soluciones alternativas (Solución A, Solución B, Solución C) y evalúalas del 1 al 10 en estos 4 criterios:
1. Velocidad / Rendimiento
2. Complejidad (donde 10 es lo más fácil de entender)
3. Eficiencia de recursos
4. Reutilización

Presenta la información ESTRICTAMENTE en una tabla Markdown. Al final de la tabla, añade una fila con el **Promedio** de cada solución. Luego, escribe un párrafo breve indicando cuál es la **"Mejor Alternativa"** basándote en el promedio y explica por qué. Finalmente, pregunta al usuario si está de acuerdo con esa elección para proceder a codificar.

Ejemplo del formato exacto que debes usar:

### 📊 Evaluación de Alternativas para la Solución

| Criterio | Solución A | Solución B | Solución C |
| :--- | :---: | :---: | :---: |
| Velocidad | 5/10 | 8/10 | 9/10 |
| Complejidad | 9/10 | 6/10 | 4/10 |
| Eficiencia | 4/10 | 8/10 | 10/10 |
| Reutilización | 6/10 | 7/10 | 9/10 |
| **Promedio** | **6.0** | **7.25** | **8.0** |

**🏆 Mejor Alternativa:** La Solución C, ya que ofrece el mejor rendimiento y eficiencia.

==================================================
3. REGLAS DE FORMATO Y CONVERSACIÓN
==================================================
- ORDEN VISUAL: Cada vez que expliques una etapa, DEBES usar encabezados. Por ejemplo: "### 🟢 Etapa 1 — Análisis del Problema". Nunca mezcles dos etapas en un mismo párrafo.
- COMPRENSIÓN LECTORA: Si el usuario te escribe un texto largo, con detalles, LEE TODO con atención e interpreta lo que necesita. NO lo rechaces por ser largo.
- Si el usuario solo te dice "hola", responde amablemente pero recuérdale que debe darte un problema.

==================================================
4. REGLAS OBLIGATORIAS PARA LA ETAPA 5 (CODIFICACIÓN)
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

- Si el usuario escribe el nombre de un lenguaje (ej: "HTML", "PHP"), asume que ese es el lenguaje y genera el código.
- Tras generar el código, pregunta: "¿Te parece bien o quieres que evaluemos algún punto de este problema?"

==================================================
5. REGLAS PARA EL DIAGRAMA DE FLUJO (MERMAID)
==================================================
Para la Etapa 4, usa SIEMPRE esta estructura:

```mermaid
flowchart TD
    A([Inicio]) --> B[Proceso]
    B --> C{¿Condición?}
    C -->|Sí| D[Acción]
    C -->|No| E([Fin])
```

Reglas: Usa flowchart TD al inicio. Identificadores únicos (A, B, C...). Código sintácticamente válido.

==================================================
6. REGLA DE RECHAZO (ESTRICTO)
==================================================
Si el usuario pide algo totalmente ajeno a la programación (chismes, recetas, política), responde con:
"[FUERA DE CONTEXTO] Lo siento, solo puedo ayudarte a resolver problemas algorítmicos."

Inicia la conversación mostrando el menú de bienvenida.
"""

# ===== ESTADO GLOBAL =====
estado = {
    "historial": [],
    "esperando_password": False,
    "modo_admin": False,
    "iniciado": False,
    "paso_actual": "inicio",
    "ia_actual": "groq"
}

# ===== FUNCIONES DE CONEXIÓN =====
def generar_respuesta_groq(historial):
    client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    respuesta = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=historial
    )
    return respuesta.choices[0].message.content

def generar_respuesta_gemini(historial):
    client = genai.Client(api_key=GEMINI_API_KEY)
    contents = []
    for msg in historial:
        if msg["role"] == "system":
            contents.append({"role": "user", "parts": [{"text": f"INSTRUCCIONES: {msg['content']}"}]})
        elif msg["role"] == "user":
            contents.append({"role": "user", "parts": [{"text": msg["content"]}]})
        elif msg["role"] == "assistant":
            contents.append({"role": "model", "parts": [{"text": msg["content"]}]})
    
    respuesta = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents=contents
    )
    return respuesta.text

# ===== RUTAS =====
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/seleccionar_ia", methods=["POST"])
def seleccionar_ia():
    data = request.get_json()
    estado["ia_actual"] = data.get("ia", "groq")
    estado["iniciado"] = False
    estado["historial"] = []
    return jsonify({"ok": True})

@app.route("/iniciar", methods=["POST"])
def iniciar():
    try:
        estado["historial"] = [{"role": "system", "content": PROMPT_MAESTRO}]
        texto = ""
        
        # Sistema de respaldo
        if estado["ia_actual"] == "gemini":
            try:
                texto = generar_respuesta_gemini(estado["historial"])
            except Exception as e:
                texto = generar_respuesta_groq(estado["historial"])
                estado["ia_actual"] = "groq"
        else:
            try:
                texto = generar_respuesta_groq(estado["historial"])
            except Exception as e:
                texto = generar_respuesta_gemini(estado["historial"])
                estado["ia_actual"] = "gemini"

        estado["historial"].append({"role": "assistant", "content": texto})
        estado["iniciado"] = True
        estado["paso_actual"] = "inicio"
        estado["esperando_password"] = False
        estado["modo_admin"] = False
        return jsonify({"ok": True, "respuesta": texto})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/reiniciar_historial", methods=["POST"])
def reiniciar_historial():
    estado["historial"] = [{"role": "system", "content": PROMPT_MAESTRO}]
    estado["paso_actual"] = "inicio"
    return jsonify({"ok": True})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    entrada = data.get("mensaje", "").strip()

    if not entrada:
        return jsonify({"ok": False, "error": "Mensaje vacío"}), 400

    if not estado["iniciado"]:
        return jsonify({"ok": False, "error": "El chat no ha iniciado. Selecciona una IA."}), 400

    # ===== LÓGICA DE ADMIN =====
    if entrada == "HUEVOS VERDES CON JAMON":
        estado["esperando_password"] = True
        return jsonify({"ok": True, "respuesta": "FAKNASTIK A WEBO, CONTRASEÑA:"})

    if estado["esperando_password"]:
        if entrada == "Filipenses4:13":
            estado["modo_admin"] = True
            estado["esperando_password"] = False
            return jsonify({"ok": True, "respuesta": "TODO LO PUEDO EN CRISTO QUE ME FORTALECE\n\n[MODO ADMIN ACTIVO] Modo admin activado. ¿Qué deseas hacer ahora?"})
        else:
            estado["esperando_password"] = False
            return jsonify({"ok": True, "respuesta": "Contraseña incorrecta. No tienes acceso al modo admin."})

    if entrada in ["MODO SUPER ALEXA", "ACTIVA MODO SUPER ALEXA"]:
        if estado["modo_admin"]:
            estado["modo_admin"] = False
            return jsonify({"ok": True, "respuesta": "Modo admin desactivado. Volviendo a la normalidad."})
        else:
            return jsonify({"ok": True, "respuesta": "No estás en modo admin."})

    # ===== CONTROL DE FLUJO =====
    if estado["paso_actual"] == "inicio":
        if entrada in ["1", "2"]:
            estado["paso_actual"] = "esperando_problema"
            modo = "RÁPIDO" if entrada == "1" else "PASO A PASO"
            respuesta_forzada = f"¡Excelente! Has elegido el modo **{modo}**. Ahora, por favor escribe el enunciado del problema algorítmico que deseas resolver."
            estado["historial"].append({"role": "user", "content": entrada})
            estado["historial"].append({"role": "assistant", "content": respuesta_forzada})
            return jsonify({"ok": True, "respuesta": respuesta_forzada})

    if estado["paso_actual"] == "esperando_problema":
        if len(entrada) > 5: 
            estado["paso_actual"] = "en_proceso"
        else:
            return jsonify({"ok": True, "respuesta": "Por favor, escribe un problema un poco más detallado para poder ayudarte."})

    # ===== ENVIAR A LA IA =====
    try:
        estado["historial"].append({"role": "user", "content": entrada})
        texto = ""
        
        if estado["ia_actual"] == "gemini":
            try:
                texto = generar_respuesta_gemini(estado["historial"])
            except Exception as e:
                texto = generar_respuesta_groq(estado["historial"])
                estado["ia_actual"] = "groq"
        else:
            try:
                texto = generar_respuesta_groq(estado["historial"])
            except Exception as e:
                texto = generar_respuesta_gemini(estado["historial"])
                estado["ia_actual"] = "gemini"

        estado["historial"].append({"role": "assistant", "content": texto})
        return jsonify({"ok": True, "respuesta": texto})
    except Exception as e:
        return jsonify({"ok": False, "error": f"Ambas IAs fallaron: {str(e)}"}), 500

# ===== RUTA PARA VOZ USANDO GOOGLE TRANSLATE =====
@app.route("/hablar", methods=["POST"])
def hablar():
    data = request.get_json()
    texto = data.get("texto", "")
    
    if not texto:
        return jsonify({"ok": False, "error": "Texto vacío"}), 400

    # Limpiamos el texto para que Google no lea código
    texto_limpio = texto.replace('*', '').replace('#', '').replace('`', '')[:200]

    try:
        url = "https://translate.google.com/translate_tts"
        params = {
            "ie": "UTF-8",
            "q": texto_limpio,
            "tl": "es",  # Idioma español
            "client": "tw-ob" # Truco para que funcione sin token
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        
        response = requests.get(url, params=params, headers=headers)
        
        if response.status_code == 200:
            audio_base64 = base64.b64encode(response.content).decode('utf-8')
            return jsonify({"ok": True, "audio": audio_base64})
        else:
            return jsonify({"ok": False, "error": "Google TTS falló"}), 500
            
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)

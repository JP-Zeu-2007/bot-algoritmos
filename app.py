# ============================================
# BOT DE ALGORITMOS - BACKEND (Groq + Gemini + Fish Audio)
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
FISH_AUDIO_API_KEY = os.getenv("FISH_AUDIO_API_KEY")

app = Flask(__name__)

# ===== PROMPT MAESTRO =====
PROMPT_MAESTRO = """
Actúa como un ingeniero de software y metodólogo experto en resolución de problemas. Eres amable, estructurado y muy claro al explicar.

==================================================
FLUJO OBLIGATORIO DE LAS ETAPAS (7 ETAPAS)
==================================================
Al iniciar, muestra este menú:
[1] TODOS LOS PROCESOS Y PASOS JUNTOS — RÁPIDO
[2] SE REALIZA CADA PROCESO Y ETAPA PASO A PASO — ANALÍTICO

Si el usuario elige [2], avanza etapa por etapa esperando su confirmación.
Las 7 etapas oficiales que DEBES seguir son:

--- ETAPA 1: Identificación del problema ---
Define claramente cuál es el problema principal, qué lo está causando y dónde están las dificultades. Sé conciso.

--- ETAPA 2: Análisis de hechos ---
Hazle al usuario EXACTAMENTE 3 preguntas clave para recopilar datos importantes que ayuden a resolver el problema. Luego, menciona los datos que ya tienes.

--- ETAPA 3: Desarrollo de soluciones alternativas ---
Propón 2 o 3 soluciones alternativas al problema. Explica brevemente por qué son buenas opciones y menciona sus Pros y Contras. 

--- ETAPA 4: Selección de la mejor solución (TABLA OBLIGATORIA) ---
Aquí DEBES generar la Matriz Comparativa (Tabla Markdown) comparando la solución original del usuario con las alternativas de la Etapa 3. Evalúa del 1 al 10: Velocidad, Complejidad, Eficiencia y Reutilización. Saca el promedio. 
Al final de la tabla, pregunta: "¿Aceptas esta solución recomendada o prefieres quedarte con tu idea original?"

--- ETAPA 5: Diseño de un plan de acción ---
Define una meta, objetivos específicos y las tareas organizadas de forma lógica y clara para llevar a cabo la solución elegida.

--- ETAPA 6: Implementación de la solución ---
Aquí desarrollarás la parte técnica, dividida ESTRICTAMENTE en estas 4 fases. Debes nombrar cada una con su título:

  **Fase 6.1: Pseudocódigo**
  Muestra el pseudocódigo del algoritmo.

  **Fase 6.2: Diagrama de Flujo (Mermaid)**
  Usa SIEMPRE esta estructura para el diagrama:
  ```mermaid
  flowchart TD
      A([Inicio]) --> B[Proceso]
      B --> C{¿Condición?}
      C -->|Sí| D[Acción]
      C -->|No| E([Fin])
  ```

  **Fase 6.3: Elección del Lenguaje**
  Antes de dar el código, DEBES mostrar EXACTAMENTE este menú y esperar la respuesta:
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
  (Si el usuario ya te dijo un lenguaje antes, salta este paso).

  **Fase 6.4: Codificación**
  Una vez que el usuario elige, genera el código funcional en ese lenguaje. Al terminar, pregunta: "¿Deseas pasar a la Etapa 7 (Prueba y Simulación)?"

--- ETAPA 7: Prueba y Simulación (Interactiva) ---
El usuario probará el código. NO uses variables genéricas. Usa datos de ejemplo reales (ej: edad = 23).
DEBES generar un bloque de código con el lenguaje "text" donde cada línea sea un paso y tenga su explicación después de "//". El sistema convertirá esto en una simulación visual con botones de Adelante/Atrás.

Ejemplo del formato exacto para la simulación:
```text
INICIO                  // Comienza el programa
  edad = 23             // Asignamos un valor de prueba (23)
  si edad >= 18         // Evaluamos: 23 es mayor o igual a 18
    imprimir "Mayor"    // Resultado: Imprime "Mayor"
  fin si
FIN                     // Fin del programa
```

==================================================
REGLAS DE FORMATO Y CONVERSACIÓN
==================================================
- ORDEN VISUAL: Usa encabezados para cada etapa (ej: "### Etapa 1 — Identificación").
- COMPRENSIÓN LECTORA: Lee todo lo que escriba el usuario antes de responder.
- REGLA DE RECHAZO: Si el usuario pide algo ajeno a la resolución de problemas o programación, responde: "[FUERA DE CONTEXTO] Solo puedo ayudarte a resolver problemas algorítmicos."

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
        model="openai/gpt-oss-20b", 
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
        
        if estado["ia_actual"] == "gemini":
            try:
                texto = generar_respuesta_gemini(estado["historial"])
            except Exception:
                texto = generar_respuesta_groq(estado["historial"])
                estado["ia_actual"] = "groq"
        else:
            try:
                texto = generar_respuesta_groq(estado["historial"])
            except Exception:
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
            return jsonify({"ok": True, "respuesta": "TODO LO PUEDO EN CRISTO QUE ME FORTALECE\n\n[MODO ADMIN ACTIVO] Modo admin activado."})
        else:
            estado["esperando_password"] = False
            return jsonify({"ok": True, "respuesta": "Contraseña incorrecta."})

    if entrada in ["MODO SUPER ALEXA", "ACTIVA MODO SUPER ALEXA"]:
        if estado["modo_admin"]:
            estado["modo_admin"] = False
            return jsonify({"ok": True, "respuesta": "Modo admin desactivado."})
        else:
            return jsonify({"ok": True, "respuesta": "No estás en modo admin."})

    # ===== CONTROL DE FLUJO =====
    if estado["paso_actual"] == "inicio":
        if entrada in ["1", "2"]:
            estado["paso_actual"] = "esperando_problema"
            modo = "RÁPIDO" if entrada == "1" else "PASO A PASO"
            respuesta_forzada = f"¡Excelente! Has elegido el modo **{modo}**. Ahora, por favor escribe el enunciado del problema que deseas resolver."
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
            except Exception:
                texto = generar_respuesta_groq(estado["historial"])
                estado["ia_actual"] = "groq"
        else:
            try:
                texto = generar_respuesta_groq(estado["historial"])
            except Exception:
                texto = generar_respuesta_gemini(estado["historial"])
                estado["ia_actual"] = "gemini"

        estado["historial"].append({"role": "assistant", "content": texto})
        return jsonify({"ok": True, "respuesta": texto})
    except Exception as e:
        return jsonify({"ok": False, "error": f"Ambas IAs fallaron: {str(e)}"}), 500

# ===== RUTA PARA VOZ DE MIKU (FISH AUDIO) =====
@app.route("/hablar", methods=["POST"])
def hablar():
    data = request.get_json()
    texto = data.get("texto", "")
    if not texto:
        return jsonify({"ok": False, "error": "Texto vacío"}), 400

    texto_limpio = texto.replace('*', '').replace('#', '').replace('`', '')[:300]

    try:
        url = "https://api.fish.audio/v1/tts"
        headers = {
            "Authorization": f"Bearer {FISH_AUDIO_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "text": texto_limpio,
            "reference_id": "d1003169cac340a791e75159c7b152cf", 
            "format": "mp3",
            "model": "s2.1-pro-free" 
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            audio_base64 = base64.b64encode(response.content).decode('utf-8')
            return jsonify({"ok": True, "audio": audio_base64})
        else:
            return jsonify({"ok": False, "error": f"Fish Audio Error: {response.text}"}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)

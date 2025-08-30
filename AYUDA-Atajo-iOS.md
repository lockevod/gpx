# Atajo iOS para abrir un GPX en la PWA (sin “Obtener contenido del archivo”)

URL de tu PWA (ejemplo): https://tusitio.github.io/gpx/  
Sustituye PWA_URL en los pasos por tu URL real.

## Atajo A — Abrir GPX desde la hoja de compartir (embebido en la URL)

Objetivo: Compartir un .gpx desde Archivos/otra app y abrirlo en la PWA.  
No necesitas la acción “Obtener contenido del archivo”.

1) Ajustes del atajo
- Abre el editor del atajo > botón de ajustes (… o “i”).
- Activa “Mostrar en la hoja para compartir”.
- En “Tipos de contenido”, elige “Archivos” y, si puedes, limita a .gpx.

2) Obtener el nombre del archivo (opcional, para mostrarlo en la PWA)
- Acción: “Obtener detalles de archivos”.
  - Detalle: “Nombre”
  - De: “Entrada del atajo”
- Renombra la salida a variable “Nombre”.

3) Codificar el archivo a Base64 (directo)
- Acción: “Codificar”
  - Modo: “Base64”
  - Entrada: “Entrada del atajo”
- Esta acción genera el texto Base64 del GPX sin leerlo como texto.

4) Hacer Base64 URL‑safe
- Acción: “Sustituir texto”
  - Buscar: +
  - Reemplazar: -
  - Texto: (salida del paso 3)
- Acción: “Sustituir texto”
  - Buscar: /
  - Reemplazar: _
  - Texto: (salida anterior)
- Acción: “Sustituir texto”
  - Buscar: =
  - Reemplazar: (vacío)
  - Texto: (salida anterior)
- Renombra la salida a “Base64URL”.

5) Codificar el nombre para URL (opcional)
- Acción: “Codificar URL”
  - Texto: “Nombre” (del paso 2) o escribe uno por defecto (p.ej. “Ruta”)
- Renombra la salida a “NombreURL”.

6) Construir la URL final y abrirla
- Acción: “Texto”
  - Contenido:
```
PWA_URL#gpx=[[Base64URL]]&name=[[NombreURL]]
```
- Acción: “Abrir URL”
  - URL: (salida del bloque de Texto)

Notas
- Si compartes varios archivos a la vez, añade antes un “Obtener elemento de la lista (Índice 1)” sobre “Entrada del atajo”.

## Atajo B — Abrir por enlace directo (gpx_url)

Objetivo: Abrir una URL que ya apunta a un .gpx (el servidor debe permitir CORS).

1) Preguntar la URL del GPX
- Acción: “Preguntar” (Texto) → “Pega la URL del GPX”
- Renombra la salida a “GPX_URL”.

2) Preguntar el nombre (opcional)
- Acción: “Preguntar” (Texto) → “Nombre de la ruta (opcional)”
- Si queda vacío, usa “Ruta compartida”.

3) Codificar el nombre para URL
- Acción: “Codificar URL” sobre el nombre → resultado “NombreURL”.

4) Construir y abrir
- Acción: “Texto”
```
PWA_URL#gpx_url=[[GPX_URL]]&name=[[NombreURL]]
```
- Acción: “Abrir URL”

## Ejemplos con tu PWA (lockevod.github.io/gpx)
- PWA_URL = https://lockevod.github.io/gpx/

- Atajo A — paso 6 “Texto” (GPX embebido en Base64 URL-safe):
```
https://lockevod.github.io/gpx/#gpx=[[Base64URL]]&name=[[NombreURL]]
```

- Atajo B — paso 4 “Texto” (enlace directo al GPX):
```
https://lockevod.github.io/gpx/#gpx_url=[[GPX_URL]]&name=[[NombreURL]]
```

- Ejemplo rápido (gpx_url):
```
https://lockevod.github.io/gpx/#name=Ruta%20de%20prueba&gpx_url=https://ejemplo.com/mi-ruta.gpx
```

## Importante: cómo insertar variables en la acción “Texto”
En los ejemplos verás marcadores como [[Base64URL]] o [[NombreURL]]. Son solo ejemplos legibles en la guía. En la app Atajos NO debes escribir [[...]] a mano.

- En la acción “Texto”:
  - Escribe la parte fija: https://lockevod.github.io/gpx/#gpx=
  - Pulsa el botón de variables (el “píldora” azul / selector de magia) y elige la salida de tu acción “Sustituir texto” (la que renombraste a Base64URL).
  - Escribe &name=
  - Inserta de nuevo con el botón de variables la salida de “Codificar URL” (la que renombraste a NombreURL).
  - Resultado (visualmente verás “píldoras” azules en lugar de [[...]]).

Ejemplo visual esperado en Atajos (no literal):
https://lockevod.github.io/gpx/#gpx=(Base64URL como variable)&name=(NombreURL como variable)

## Diagnóstico rápido: URL empieza por [[PD94…
Si en la consola ves algo como [[PD94… o la URL contiene [[...]]:
- Causa: el Atajo insertó el texto literal [[Base64URL]] en lugar de la variable.
- Solución:
  1) Abre la acción “Texto”.
  2) Borra las partes [[Base64URL]] y [[NombreURL]] si las escribiste a mano.
  3) Inserta las variables reales usando el botón de variables (elige la salida de cada acción previa).
  4) Vuelve a probar. Puedes añadir &log=1 al final para ver registros detallados:
     - https://lockevod.github.io/gpx/#gpx=…&name=…&log=1
     - https://lockevod.github.io/gpx/#gpx_url=…&name=…&log=1

Consejos y alternativas
- Si en tu iOS “Codificar” no acepta archivos, prueba a poner justo antes “Obtener detalles de archivos” → “Tamaño” (esto fuerza a tratar la entrada como datos) y vuelve a “Codificar (Base64)”. En iOS 16/17 la acción “Codificar” suele aceptar directamente “Entrada del atajo (Archivo)”.
- Si la URL final es muy larga y Safari no la abre, usa el Atajo B (gpx_url) o comparte GPX más pequeños.
- La PWA también acepta parámetros en query en lugar de hash: ?gpx= o ?gpx_url=.

Pruebas rápidas
- Inline GPX mínimo (URL‑encoded):
```
https://tusitio/#name=Test&gpx=%3Cgpx%20version%3D%221.1%22%3E...%3C%2Fgpx%3E
```
- Enlace remoto:
```
https://tusitio/#name=Morning&gpx_url=https://ejemplo.com/route.gpx
```

## ¿Por qué “solo coge el nombre” en el Atajo A?
Esto ocurre cuando en el paso 3 (Codificar → Base64) la entrada es el “Nombre” del archivo (texto) en lugar del “Archivo” (datos). Entonces solo se codifica el nombre, no el contenido.

Cómo solucionarlo
1) En el paso 3 “Codificar”:
   - Toca la “píldora” azul que indica la entrada (probablemente pone “Nombre”).
   - Elige “Seleccionar variable” o “Variable mágica”.
   - Selecciona “Entrada del atajo”.
   - Asegúrate de que aparece como Archivo (icono de clip/archivo), NO como Nombre (texto).
   - Deja Modo = Base64.

2) En el paso 6 “Texto”:
   - Escribe la parte fija: https://lockevod.github.io/gpx/#gpx=
   - Inserta la variable que renombraste como “Base64URL” (resultado del paso 4).
   - Escribe &name=
   - Inserta la variable “NombreURL” (resultado del paso 5).
   - Importante: no escribas [[Base64URL]] ni [[NombreURL]] a mano; inserta variables.

Comprobación rápida
- Abre con &log=1 y mira la consola:
  - “Base64 decoded length” debería ser grande (normalmente > 1–2 KB).
  - Si ves ~50–100 bytes, todavía estás enviando el nombre y no el archivo.

## Si “Codificar (Base64)” coge el Nombre y no el Archivo
iOS a veces convierte la variable a “Nombre” (texto). Debe ser “Archivo”.

Forzar que sea Archivo (elige una de estas opciones antes del paso 3 “Codificar”):
- Opción 1 (recomendada)
  1) Acción: “Obtener archivos de la entrada” (en algunas versiones se llama “Obtener archivo de la entrada”).
  2) Si la entrada puede traer varios, añade “Obtener elemento de la lista” → Índice 1.
  3) Ahora en “Codificar (Base64)” toca la píldora azul y selecciona esa salida (debe verse como Archivo).
- Opción 2 (coerción rápida)
  1) Acción: “Vista rápida” sobre “Entrada del atajo” (abre una previsualización del GPX).
  2) Elimina “Vista rápida”.
  3) En “Codificar (Base64)”, selecciona de nuevo “Entrada del atajo” (ahora suele quedar como Archivo).
- Opción 3 (detalles)
  1) Acción: “Obtener detalles de archivos” → “Tamaño” sobre “Entrada del atajo”.
  2) Luego “Codificar (Base64)” con “Entrada del atajo” (esto fuerza a tratarlo como datos/archivo).

Comprobación
- Añade &log=1 a la URL final. En consola deberías ver:
  - Base64 decoded length: (miles de bytes, no ~50–100).
  - Si sigue siendo ~50–100, aún estás pasando “Nombre”.

## Atajo A (seguro) — Pasos completos con coerción a Archivo
1) Recibir entrada del atajo (Archivos .gpx, Hoja para compartir: ON)
2) Obtener archivos de la entrada
3) (Si hay varios) Obtener elemento de la lista → Índice 1
4) Obtener detalles de archivos → Nombre (guárdalo como Nombre)
5) Codificar → Base64
   - Entrada: la salida del paso 2/3 (Archivo), NO “Nombre”.
6) Sustituir texto → + → -
7) Sustituir texto → / → _
8) Sustituir texto → = → (vacío)
   - Renómbralo “Base64URL”
9) Codificar URL (Nombre) → “NombreURL”
10) Texto
```
https://lockevod.github.io/gpx/#gpx=(Base64URL como variable)&name=(NombreURL como variable)
```
11) Abrir URL

## Atajo C — Sin Base64, inyectando el GPX por JavaScript (100% fiable)
Usa el puente postMessage que trae la web. No hay límites de longitud en la URL ni problemas de tipos.

Pasos
1) Recibir entrada del atajo (Archivos .gpx)
2) Obtener archivos de la entrada
3) (Si varios) Obtener elemento de la lista → Índice 1
4) Abrir URL
   - URL: https://lockevod.github.io/gpx/
   - Abrir en: Safari (no vista rápida)
5) Esperar
   - 0.7–1.0 segundos
6) Ejecutar JavaScript en página web
   - Página: Safari
   - Código (inserta variables con las píldoras azules):
```js
/* Pega aquí variables del Atajo: */
const name = /* (Nombre del archivo) */ 
  /* Inserta variable “Nombre” del paso 4 del Atajo A seguro, o usa un texto */;
const gpx = /* (Contenido GPX como texto) */
  /* Si tienes “Convertir a texto” no disponible, usa “Codificar”->Base64 + atob en JS:
     const b64 = (variable Base64);
     const gpx = atob(b64); */;

window.postMessage({ type: "cw-gpx", name, gpx }, "*");
```
Notas
- Si no puedes obtener el GPX como texto en Atajos, puedes:
  - Codificar (Base64) el Archivo y en el JS decodificar: const gpx = atob(/*Base64*/);
- La app ya escucha postMessage y cargará el GPX.

Diagnóstico rápido
- Si ves en consola “[cw] GPX error: No parseable layers…”, el texto recibido no trae <trk>/<rte>/<wpt> (está truncado). Revisa que el paso “Codificar (Base64)” use el Archivo y no el Nombre, o usa el Atajo C.

## Alternativa con Scriptable (recomendada si Atajos no lee el archivo)
Scriptable puede leer ficheros y abrir la PWA pasándole el GPX. Elige una de estas variantes:

### Opción 1 — URL con Base64URL (rápida, pero limitada por longitud de URL)
Pega este script en Scriptable (nuevo script) y ejecútalo:

```javascript
// filepath: /Users/sergi/DEVEL/gpx/AYUDA-Atajo-iOS.md
// Scriptable: abrir PWA con GPX en Base64URL
const PWA_URL = "https://lockevod.github.io/gpx/";
const fileURL = await DocumentPicker.open(["public.xml","public.text","public.data"]);
const fm = FileManager.iCloud();
try { await fm.downloadFileFromiCloud(fileURL); } catch (_) {}
const name = fm.fileName(fileURL, true);
const gpxText = fm.readString(fileURL);
const b64 = Data.fromString(gpxText).toBase64String();
const b64url = b64.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const url = `${PWA_URL}#gpx=${encodeURIComponent(b64url)}&name=${encodeURIComponent(name)}&log=1`;
Safari.open(url);
```

Notas
- Si el GPX es grande, la URL puede ser demasiado larga para Safari. En ese caso usa la Opción 2.

### Opción 2 — WebView + postMessage (sin límites de URL)
Carga la PWA en un WebView y envía el GPX con postMessage (la app ya lo soporta):

```javascript
// filepath: /Users/sergi/DEVEL/gpx/AYUDA-Atajo-iOS.md
// Scriptable: abrir PWA en WebView y enviar GPX con postMessage
const PWA_URL = "https://lockevod.github.io/gpx/";

// Elegir archivo GPX
const fileURL = await DocumentPicker.open(["public.xml","public.text","public.data"]);
const fm = FileManager.iCloud();
try { await fm.downloadFileFromiCloud(fileURL); } catch (_) {}
const name = fm.fileName(fileURL, true);
const gpx = fm.readString(fileURL);

// Preparar inyección JS (escapando el contenido)
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const js = `
  (function(){
    const until = (cond, t=80, d=150) => new Promise(r=>{
      let n=0; const id=setInterval(()=>{ if(cond()){clearInterval(id);r(true);} else if(++n>t){clearInterval(id);r(false);} }, d);
    });
    // Espera opcional a que el loader exista
    until(()=>typeof window.cwLoadGPXFromString==="function").then(()=>{
      window.postMessage({ type:"cw-gpx", name:${JSON.stringify(name)}, gpx:\`${esc(gpx)}\` }, "*");
    });
  })();
`;

// Abrir WebView y enviar GPX
const web = new WebView();
await web.loadURL(PWA_URL);
await web.waitForLoad();
await web.evaluateJavaScript(js);
await web.present(); // opcional: muestra la PWA embebida
```

Comprobación
- Abre la consola con &log=1 si usas la Opción 1: verás “Decoded GPX OK …” y se cargará la ruta.
- En la Opción 2, al presentar el WebView debes ver el mapa con la ruta cargada.

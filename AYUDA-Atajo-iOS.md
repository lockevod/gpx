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

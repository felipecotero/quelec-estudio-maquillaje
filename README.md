# Quelec · Estudio de maquillaje 3D

Aplicación web de caracterización de **Quelec y la semilla del futuro**, revisión **MQ04**. Interfaz en español, modo oscuro y disposición horizontal o vertical.

[Abrir el estudio en línea](https://felipecotero.github.io/quelec-estudio-maquillaje/)

## Uso

Escoge un personaje, una capa, un color y una herramienta; pinta sobre la piel del modelo. Gira con V o Espacio y acerca con la rueda o los botones. Guarda el proyecto `.quelec` antes de cerrar.

Incluye nueve intérpretes con cinco fotografías de referencia cada uno y rostros genéricos editables para los grupos. Brochas, delineador, esponja, sfumato, simetría, selección, degradados, capas, fusión, deshacer/rehacer, facciones, iluminación y propuestas de peinado. Los libros de color ofrecen tonos temáticos y acabados mate, satinados, metálicos y fluorescentes.

Exporta imágenes PNG/JPG/PDF, PSD con capas UV, GLB y OBJ con materiales y texturas. Los proyectos MQ02/MQ03 v2 conservan las capas sobre el mismo mapa UV; los archivos MQ01 v1 usan UV incompatibles.

## Publicación y desarrollo

Sitio estático, sin compilación ni dependencias externas durante el uso. GitHub Pages publica la raíz de la rama `main`; `.nojekyll` conserva los archivos tal cual. Para abrirlo localmente, sirve esta carpeta mediante HTTP, por ejemplo `python3 -m http.server 8766`, y visita `http://127.0.0.1:8766/`.

El guardado se realiza por archivos. En navegadores compatibles se puede elegir una carpeta; en otros se descarga el proyecto. La aplicación no usa localStorage, IndexedDB ni Service Worker para guardar el trabajo. El botón de Drive descarga una copia y abre el Drive de quien lo pulsa; la subida es manual.

## Alcance de MQ04

Quelec: contorno frontal y perfil revisados. Chismosa: perfil, ancho de boca y apertura ocular ajustados. Regañona: transición frente/cráneo suavizada. Los tres mantienen las UV y una única superficie de cabeza y cuello. El listado de libros tiene colores explícitos en oscuro y diurno y permite selección con teclado.

Los modelos representan aproximaciones fotográficas; no son escaneos métricos. Las cámaras no estaban calibradas y las zonas ocultas por cabello se infieren. La iluminación de las fotos permanece parcialmente impresa en las texturas. Los peinados y libros ampliados son propuestas de caracterización.

## Procedencia

- Anatomía y cabello MakeHuman CC0: créditos y licencias conservados en `assets/anatomy/` y `assets/hair/`.
- Three.js: distribución local con avisos de licencia MIT en `vendor/`.
- Fotografías aportadas para el proyecto: procedencia en `assets/faces/provenance.json`.
- Herramientas de pintura propias, con Rebelle 8 como referencia de controles; no reproduce su motor de fluidos.

# ODN · Análisis de combustibles con OpenAI

Panel interactivo del Observatorio de Desarrollo Nacional para analizar precios de combustibles en Honduras. Conserva el diseño y los datos históricos del archivo original y reemplaza la llamada directa a Anthropic por una integración segura con OpenAI.

## Arquitectura

- `index.html`: visualización, gráficos, PDF/JPG y actualización desde el navegador.
- `api/openai.php`: endpoint del servidor que llama a OpenAI Responses API con la herramienta `web_search`.
- `api/config.example.php`: plantilla de configuración sin credenciales.
- `api/.htaccess`: impide descargar archivos de configuración en Apache/cPanel.

La API key nunca se envía al navegador. Las semanas obtenidas se guardan en `localStorage`, por lo que permanecen al recargar la página en el mismo navegador.

## Requisitos

- Hosting con PHP 7.4 o superior.
- Extensión PHP cURL habilitada.
- Una API key de OpenAI con facturación activa. La facturación de la API es independiente de una suscripción personal de ChatGPT.
- HTTPS recomendado para el dominio público.

## Instalación en cPanel

1. Copia `index.html` y la carpeta `api` al directorio público del dominio.
2. Duplica `api/config.example.php` con el nombre `api/config.php`.
3. Abre `api/config.php` en el administrador de archivos y coloca tu API key:

   ```php
   return [
       'api_key' => 'sk-proj-TU_CLAVE',
       'model' => 'gpt-5.5',
   ];
   ```

4. Confirma que `api/config.php` no se añada al repositorio. Ya está incluido en `.gitignore`.
5. Abre el sitio mediante HTTPS y pulsa **Actualizar**.

Como alternativa a `config.php`, configura las variables de entorno `OPENAI_API_KEY` y `OPENAI_MODEL` en el servidor.

## Seguridad

- No coloques la API key dentro de `index.html`.
- No subas `api/config.php` a GitHub.
- El endpoint acepta únicamente JSON por `POST` y aplica un límite básico de 10 solicitudes cada 10 minutos por dirección IP.
- Para un sitio con mucho tráfico, añade autenticación, límites en el proyecto de OpenAI y protección adicional en el servidor o CDN.

## GitHub Pages

GitHub Pages solo sirve archivos estáticos y no ejecuta PHP. Para utilizar el botón **Actualizar**, publica estos archivos en un hosting PHP/cPanel o sustituye `api/openai.php` por una función serverless equivalente.


<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'Método no permitido.']);
}

$contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
if (strpos($contentType, 'application/json') !== 0) {
    respond(415, ['error' => 'La solicitud debe usar application/json.']);
}

// Límite sencillo por IP para reducir abuso accidental del endpoint público.
$clientIp = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$rateFile = sys_get_temp_dir() . '/odn-openai-' . hash('sha256', $clientIp) . '.json';
$now = time();
$windowSeconds = 600;
$maxRequests = 10;
$recent = [];
if (is_file($rateFile)) {
    $stored = json_decode((string)@file_get_contents($rateFile), true);
    if (is_array($stored)) {
        $recent = array_values(array_filter($stored, static function ($timestamp) use ($now, $windowSeconds): bool {
            return is_int($timestamp) && $timestamp > $now - $windowSeconds;
        }));
    }
}
if (count($recent) >= $maxRequests) {
    header('Retry-After: 600');
    respond(429, ['error' => 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.']);
}
$recent[] = $now;
@file_put_contents($rateFile, json_encode($recent), LOCK_EX);

$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody === false ? '' : $rawBody, true);
if (!is_array($input)) {
    respond(400, ['error' => 'JSON inválido.']);
}

$lastKnown = trim((string)($input['last_known'] ?? ''));
$superior = filter_var($input['superior'] ?? null, FILTER_VALIDATE_FLOAT);
$regular = filter_var($input['regular'] ?? null, FILTER_VALIDATE_FLOAT);
$diesel = filter_var($input['diesel'] ?? null, FILTER_VALIDATE_FLOAT);

if (!preg_match('/^\d{2} [A-Za-zÁÉÍÓÚáéíóú]{3} \d{4}$/u', $lastKnown) ||
    $superior === false || $regular === false || $diesel === false ||
    $superior <= 0 || $regular <= 0 || $diesel <= 0 ||
    $superior > 500 || $regular > 500 || $diesel > 500) {
    respond(422, ['error' => 'Los datos de la última semana no son válidos.']);
}

$config = [];
$configFile = __DIR__ . '/config.php';
if (is_file($configFile)) {
    $loaded = require $configFile;
    if (is_array($loaded)) {
        $config = $loaded;
    }
}

$apiKey = trim((string)(getenv('OPENAI_API_KEY') ?: ($config['api_key'] ?? '')));
$model = trim((string)(getenv('OPENAI_MODEL') ?: ($config['model'] ?? 'gpt-5.5')));
if ($apiKey === '') {
    respond(503, ['error' => 'El servidor todavía no tiene configurada OPENAI_API_KEY.']);
}

$prompt = <<<PROMPT
Busca en la web los precios semanales de combustibles en Honduras más recientes publicados por la Secretaría de Energía (SEN). Prioriza la fuente oficial y medios hondureños que reproduzcan el comunicado oficial.

La última semana registrada es "{$lastKnown}" con estos precios en Tegucigalpa, en lempiras por galón:
- Gasolina superior: {$superior}
- Gasolina regular: {$regular}
- Diésel: {$diesel}

Devuelve solamente las semanas POSTERIORES a esa fecha. La salida debe ser exclusivamente una de estas dos opciones:
1. Un JSON array válido con este formato exacto, sin Markdown ni comentarios:
[{"fecha":"DD Abr YYYY","anio":"YYYY","sup":0.00,"reg":0.00,"die":0.00}]
2. Si no existe información posterior verificable, exactamente: NO_NEW_DATA

No inventes datos. Las fechas deben usar las abreviaturas españolas Ene, Feb, Mar, Abr, May, Jun, Jul, Ago, Sep, Oct, Nov o Dic.
PROMPT;

$requestBody = [
    'model' => $model,
    'tools' => [[
        'type' => 'web_search',
        'external_web_access' => true,
    ]],
    'tool_choice' => 'required',
    'include' => ['web_search_call.action.sources'],
    'input' => $prompt,
    'max_output_tokens' => 1200,
    'store' => false,
];

$curl = curl_init('https://api.openai.com/v1/responses');
if ($curl === false) {
    respond(500, ['error' => 'No se pudo inicializar la conexión del servidor.']);
}

curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode($requestBody, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
]);

$responseBody = curl_exec($curl);
$curlError = curl_error($curl);
$httpStatus = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

if ($responseBody === false) {
    respond(502, ['error' => 'No se pudo conectar con OpenAI: ' . $curlError]);
}

$response = json_decode($responseBody, true);
if (!is_array($response)) {
    respond(502, ['error' => 'OpenAI devolvió una respuesta inválida.']);
}
if ($httpStatus < 200 || $httpStatus >= 300) {
    $message = (string)($response['error']['message'] ?? 'OpenAI rechazó la solicitud.');
    respond($httpStatus >= 400 && $httpStatus < 600 ? $httpStatus : 502, ['error' => $message]);
}

$textParts = [];
$sources = [];
foreach (($response['output'] ?? []) as $item) {
    if (($item['type'] ?? '') === 'web_search_call') {
        foreach (($item['action']['sources'] ?? []) as $source) {
            $url = filter_var($source['url'] ?? '', FILTER_VALIDATE_URL);
            if ($url !== false) {
                $sources[$url] = [
                    'url' => $url,
                    'title' => trim((string)($source['title'] ?? 'Fuente consultada')),
                ];
            }
        }
        continue;
    }
    if (($item['type'] ?? '') !== 'message') {
        continue;
    }
    foreach (($item['content'] ?? []) as $content) {
        if (($content['type'] ?? '') !== 'output_text') {
            continue;
        }
        if (isset($content['text']) && is_string($content['text'])) {
            $textParts[] = $content['text'];
        }
        foreach (($content['annotations'] ?? []) as $annotation) {
            if (($annotation['type'] ?? '') !== 'url_citation') {
                continue;
            }
            $url = filter_var($annotation['url'] ?? '', FILTER_VALIDATE_URL);
            if ($url === false) {
                continue;
            }
            $sources[$url] = [
                'url' => $url,
                'title' => trim((string)($annotation['title'] ?? 'Fuente consultada')),
            ];
        }
    }
}

$text = trim(implode('', $textParts));
if ($text === '') {
    respond(502, ['error' => 'OpenAI no devolvió texto utilizable.']);
}

respond(200, [
    'text' => $text,
    'sources' => array_values($sources),
    'request_id' => (string)($response['id'] ?? ''),
]);

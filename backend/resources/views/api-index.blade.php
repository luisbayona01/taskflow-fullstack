<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>TaskFlow API · Índice de rutas</title>
    <style>
        :root {
            --bg: #0f172a;
            --panel: #111c33;
            --border: #1e293b;
            --text: #e2e8f0;
            --muted: #94a3b8;
            --accent: #38bdf8;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            padding: 2rem 1rem 4rem;
            background: var(--bg);
            color: var(--text);
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            line-height: 1.5;
        }

        .container { max-width: 1100px; margin: 0 auto; }

        header h1 { margin: 0 0 .25rem; font-size: 1.9rem; }
        header p { margin: 0; color: var(--muted); }

        .links {
            display: flex;
            flex-wrap: wrap;
            gap: .75rem;
            margin: 1.5rem 0 2rem;
        }

        .links a {
            display: inline-block;
            padding: .6rem 1rem;
            border: 1px solid var(--border);
            border-radius: .5rem;
            background: var(--panel);
            color: var(--accent);
            text-decoration: none;
            font-size: .9rem;
        }

        .links a:hover { border-color: var(--accent); }

        .card {
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: .75rem;
            overflow: hidden;
        }

        table { width: 100%; border-collapse: collapse; font-size: .9rem; }

        th, td {
            padding: .7rem .9rem;
            text-align: left;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
        }

        th {
            background: #16213c;
            color: var(--muted);
            font-weight: 600;
            text-transform: uppercase;
            font-size: .72rem;
            letter-spacing: .06em;
        }

        tr:last-child td { border-bottom: none; }

        .method {
            display: inline-block;
            min-width: 62px;
            padding: .15rem .5rem;
            border-radius: .35rem;
            font-size: .74rem;
            font-weight: 700;
            text-align: center;
            color: #0f172a;
        }

        .method-get { background: #4ade80; }
        .method-post { background: #38bdf8; }
        .method-put { background: #fbbf24; }
        .method-patch { background: #c084fc; }
        .method-delete { background: #f87171; }

        code {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: .84rem;
            color: #e2e8f0;
        }

        .muted { color: var(--muted); font-size: .82rem; }
        .tag { color: var(--accent); font-size: .75rem; }
        footer { margin-top: 2rem; color: var(--muted); font-size: .8rem; }
    </style>
</head>
<body>
<div class="container">
    <header>
        <h1>TaskFlow API</h1>
        <p>Índice de rutas del backend · {{ count($routes) }} operaciones REST documentadas</p>
    </header>

    <div class="links">
        <a href="{{ $documentation['swagger_ui'] }}">Swagger UI</a>
        <a href="{{ $documentation['openapi_json'] }}">OpenAPI (JSON)</a>
        <a href="{{ $documentation['health'] }}">Health check</a>
        <a href="/api">JSON de este índice</a>
    </div>

    <div class="card">
        <table>
            <thead>
            <tr>
                <th>Método</th>
                <th>URI</th>
                <th>Descripción</th>
                <th>Autenticación</th>
            </tr>
            </thead>
            <tbody>
            @foreach($routes as $route)
                <tr>
                    <td><span class="method method-{{ strtolower($route['method']) }}">{{ $route['method'] }}</span></td>
                    <td><code>{{ $route['uri'] }}</code></td>
                    <td>
                        {{ $route['summary'] ?? '—' }}
                        @if($route['tags'])
                            <div class="tag">{{ implode(' · ', $route['tags']) }}</div>
                        @endif
                        <div class="muted">{{ $route['action'] }}</div>
                    </td>
                    <td>
                        @if(collect($route['middleware'])->contains(fn ($middleware) => str_contains($middleware, 'auth')))
                            <span class="tag">Bearer (Sanctum)</span>
                        @else
                            <span class="muted">Pública</span>
                        @endif
                    </td>
                </tr>
            @endforeach
            </tbody>
        </table>
    </div>

    <footer>
        Documento OpenAPI versionado en <code>{{ $documentation['openapi_file'] }}</code>.
        Se regenera con <code>php artisan l5-swagger:generate</code>.
    </footer>
</div>
</body>
</html>

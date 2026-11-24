<?php

return [
    'python' => env('RAPAT_PYTHON', 'python'),
    'engine' => dirname(base_path()).'/tools/rapat/engine.py',
    'health_timeout' => 10,
    'timeout' => 1800,
    // Bump whenever decoding/VAD/filtering changes invalidate previous transcripts.
    'transcription_pipeline_version' => env('RAPAT_TRANSCRIPTION_PIPELINE_VERSION', '3'),
    // Explicitly forward Laravel dotenv values; child processes do not inherit them.
    'model_dirs' => [
        'RAPAT_MODEL_DIR' => env('RAPAT_MODEL_DIR'),
        'RAPAT_WHISPER_MODEL' => env('RAPAT_WHISPER_MODEL', 'small'),
        'RAPAT_OLLAMA_URL' => env('RAPAT_OLLAMA_URL', 'http://127.0.0.1:11434'),
        'RAPAT_OLLAMA_MODEL' => env('RAPAT_OLLAMA_MODEL', 'qwen3.5:9b'),
    ],
];

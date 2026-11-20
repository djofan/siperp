"""Explicit network-enabled model provisioning; never imported by runtime."""
import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from engine import model_path, model_ready, MODEL_DOWNLOAD_FILES, MODEL_REPOS


def main():
    parser = argparse.ArgumentParser(description='Explicitly download only the selected local Whisper model.')
    parser.add_argument('command', choices=['download-model'])
    parser.parse_args()
    from huggingface_hub import snapshot_download
    target = model_path()
    snapshot_download(repo_id=MODEL_REPOS[target.name],
                      local_dir=str(target), allow_patterns=list(MODEL_DOWNLOAD_FILES),
                      token=False, max_workers=2)
    if not model_ready():
        raise RuntimeError('Model files incomplete; expected core files and vocabulary.json or vocabulary.txt')
    print('Model tersedia di ' + str(target))


if __name__ == '__main__':
    main()

<?php

namespace App\Support;

trait HasSubmissionMedia
{
    public function submissionFiles(): array
    {
        return $this->mediaFiles ?: ($this->filePath && $this->fileMime
            ? [['path' => $this->filePath, 'mime' => $this->fileMime, 'name' => 'Setoran', 'size' => null]] : []);
    }

    public function mediaMetadata(): array
    {
        return array_map(static fn ($file, $index) => ['index' => $index, 'name' => $file['name'], 'mime' => $file['mime'], 'size' => $file['size']], $this->submissionFiles(), array_keys($this->submissionFiles()));
    }
}

"""Opt-in real loopback Ollama regression check with synthetic, nonprivate data."""
import json

import engine


TRANSCRIPT = ('Rapat evaluasi layanan pada 20 November 2026. Peserta Amru dan Yono. '
              'Diputuskan memperbarui daftar penerima bantuan. '
              'Amru bertugas memeriksa daftar penerima paling lambat 2026-11-23. '
              'Yono menyiapkan laporan biaya. Rapat berikutnya belum ditentukan.')


def check():
    notes = engine.minutes({'transcript': TRANSCRIPT, 'meeting': {}})
    assert any('penerima' in d.lower() and 'bantuan' in d.lower() for d in notes['decisions']), notes
    assert len(notes['decisions']) == 1, notes
    assert len(notes['actions']) == 2, notes
    actions = {a['assignee']: a for a in notes['actions']}
    assert set(actions) == {'Amru', 'Yono'}, notes
    assert 'daftar' in actions['Amru']['task'].lower(), notes
    assert actions['Amru']['dueDate'] == '2026-11-23', notes
    assert 'laporan' in actions['Yono']['task'].lower(), notes
    assert actions['Yono']['dueDate'] is None, notes
    assert all(a['status'] == 'open' for a in notes['actions']), notes
    assert 0 < len(notes['summary']) < len(TRANSCRIPT), notes
    assert notes['discussion'], notes
    print(json.dumps(notes, ensure_ascii=False))
    empty = engine.minutes({'transcript': 'Rapat membahas kondisi layanan. '
                            'Belum ada keputusan atau penugasan. Jadwal rapat berikutnya belum ditentukan.',
                            'meeting': {'participants': ['Amru', 'Yono']}})
    assert empty['decisions'] == [], empty
    assert empty['actions'] == [], empty
    assert 'Sari' not in json.dumps(empty) and 'Dedi' not in json.dumps(empty), empty
    print(json.dumps(empty, ensure_ascii=False))
    sparse = engine.minutes({'transcript': 'Repet Membahas Lapuran-Bulanan. Terima Kasi.',
                             'meeting': {'agenda': 'Menguji alur rekaman hingga notulen'}})
    assert sparse['discussion'] == [], sparse
    assert sparse['decisions'] == [], sparse
    assert sparse['actions'] == [], sparse
    assert 'belum memuat rincian' in sparse['summary'], sparse
    assert not any(word in json.dumps(sparse).lower() for word in ['rekaman', 'notulen']), sparse
    print(json.dumps(sparse, ensure_ascii=False))


if __name__ == '__main__':
    check()

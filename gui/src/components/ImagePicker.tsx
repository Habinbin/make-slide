import { useState } from 'react';

interface UnsplashPhoto {
  id: string;
  thumb: string;
  full: string;
  alt: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function ImagePicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<'upload' | 'url' | 'unsplash'>('upload');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState(() => localStorage.getItem('unsplash_key') ?? '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(await fileToDataUrl(f));
  };

  const searchUnsplash = async () => {
    if (!key) return setMsg('Unsplash Access Key를 입력하세요.');
    if (!query.trim()) return;
    localStorage.setItem('unsplash_key', key);
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?per_page=12&query=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Client-ID ${key}` } }
      );
      if (!res.ok) throw new Error(`Unsplash ${res.status}`);
      const data = await res.json();
      setResults(
        (data.results ?? []).map((p: any) => ({
          id: p.id,
          thumb: p.urls.thumb,
          full: p.urls.regular,
          alt: p.alt_description ?? '',
        }))
      );
    } catch (e: any) {
      setMsg(String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>이미지 추가</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-tabs">
          <button className={tab === 'upload' ? 'on' : ''} onClick={() => setTab('upload')}>업로드</button>
          <button className={tab === 'url' ? 'on' : ''} onClick={() => setTab('url')}>URL</button>
          <button className={tab === 'unsplash' ? 'on' : ''} onClick={() => setTab('unsplash')}>Unsplash</button>
        </div>

        <div className="modal-body">
          {tab === 'upload' && (
            <div className="upload-zone">
              <input type="file" accept="image/*" onChange={onFile} />
              <p className="panel-hint">로컬 이미지를 선택하면 Base64로 슬라이드에 삽입됩니다.</p>
            </div>
          )}
          {tab === 'url' && (
            <div className="url-zone">
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button className="btn" disabled={!url.trim()} onClick={() => onPick(url.trim())}>적용</button>
            </div>
          )}
          {tab === 'unsplash' && (
            <div className="unsplash-zone">
              <input
                type="password"
                placeholder="Unsplash Access Key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <div className="row">
                <input
                  type="text"
                  placeholder="검색어 (예: mountain)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUnsplash()}
                />
                <button className="btn" disabled={busy} onClick={searchUnsplash}>{busy ? '...' : '검색'}</button>
              </div>
              {msg && <p className="modal-msg">{msg}</p>}
              <div className="unsplash-grid">
                {results.map((p) => (
                  <img key={p.id} src={p.thumb} alt={p.alt} title={p.alt} onClick={() => onPick(p.full)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 150 * 1024 * 1024;

type TimelineEntry = {
  id: string;
  user_id: string;
  event_date: string;
  type: string;
  caption: string | null;
  media_url: string | null;
  spotify_track_id: string | null;
  created_at: string;
};

const TYPE_ICONS: Record<string, string> = {
  text: '✦',
  photo: '◈',
  video: '▶',
  song: '♪',
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [entryType, setEntryType] = useState('text');
  const [caption, setCaption] = useState('');
  const [spotifyTrackId, setSpotifyTrackId] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  const router = useRouter();

  const fetchTimeline = async (userId: string) => {
    const { data, error } = await supabase
      .from('timeline_entries')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: true });
    if (error) console.error('Timeline fetch error:', error);
    else setTimeline(data || []);
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if (!isMounted) return;

      const { data: existingProfile } = await supabase
        .from('profiles').select('id').eq('id', user.id).maybeSingle();

      if (!existingProfile) {
        await supabase.from('profiles').insert({ id: user.id });
      }

      setUser(user);
      await fetchTimeline(user.id);
      setLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (!session?.user) router.push('/login');
    });

    return () => { isMounted = false; authListener.subscription.unsubscribe(); };
  }, [router]);

  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);

  const handleUpload = async () => {
    if (!user) return setUploadStatus('Please sign in first');
    if (!file && !caption.trim() && !spotifyTrackId.trim()) {
      return setUploadStatus('Add a caption, file, or Spotify track ID.');
    }

    setUploading(true);
    setUploadStatus('Saving memory...');

    let mediaUrl: string | null = null;
    let uploadFile: File | null = file;

    if (file) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (isImage && file.size > MAX_IMAGE_BYTES) {
        setUploadStatus('Image too large. Max 10MB.'); setUploading(false); return;
      }
      if (isVideo && file.size > MAX_VIDEO_BYTES) {
        setUploadStatus('Video too large. Max 150MB.'); setUploading(false); return;
      }

      if (isImage) {
        try {
          uploadFile = await imageCompression(file, {
            maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: true, initialQuality: 0.8,
          });
        } catch { uploadFile = file; }
      }

      const fileExt = uploadFile.name.split('.').pop() ?? 'bin';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('timeline-media').upload(fileName, uploadFile);

      if (uploadError) {
        setUploadStatus('Upload failed: ' + uploadError.message);
        setUploading(false); return;
      }

      const { data: urlData } = supabase.storage.from('timeline-media').getPublicUrl(fileName);
      mediaUrl = urlData.publicUrl;
    }

    const { error: insertError } = await supabase.from('timeline_entries').insert({
      user_id: user.id,
      event_date: eventDate || new Date().toISOString(),
      type: entryType,
      caption: caption.trim() || null,
      media_url: mediaUrl,
      spotify_track_id: spotifyTrackId.trim() || null,
    });

    if (insertError) {
      setUploadStatus('Failed: ' + insertError.message);
    } else {
      setUploadStatus('✦ Memory saved');
      await fetchTimeline(user.id);
      setFile(null); setEventDate(''); setCaption('');
      setSpotifyTrackId(''); setEntryType('text');
      setTimeout(() => { setShowForm(false); setUploadStatus(''); }, 1500);
    }

    setUploading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const syncTracks = () => alert('Sync placeholder — real Spotify OAuth coming soon');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0c0c0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c9a96e' }} />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0c0c0b;
          color: #e8e4dc;
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
        }

        ::selection { background: rgba(201,169,110,0.2); }

        /* Subtle grain overlay */
        .ee-root::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 9999;
          opacity: 0.4;
        }

        .feed-card {
          background: #111110;
          border: 1px solid #1e1e1c;
          transition: border-color 0.3s;
        }
        .feed-card:hover { border-color: #2e2e2a; }

        .btn-gold {
          background: #c9a96e;
          color: #0c0c0b;
          border: none;
          padding: 13px 36px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .btn-gold:hover { background: #d9b97e; }
        .btn-gold:active { transform: scale(0.98); }
        .btn-gold:disabled { background: #222220; color: #444440; cursor: not-allowed; }

        .btn-outline {
          background: transparent;
          color: #555550;
          border: 1px solid #222220;
          padding: 11px 24px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-outline:hover { color: #e8e4dc; border-color: #444440; }

        .field-label {
          display: block;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #555550;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .field-input {
          width: 100%;
          background: #0c0c0b;
          border: 1px solid #1e1e1c;
          color: #e8e4dc;
          padding: 12px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 300;
          outline: none;
          transition: border-color 0.2s;
          -webkit-appearance: none;
          appearance: none;
          border-radius: 0;
        }
        .field-input:focus { border-color: #c9a96e; }
        .field-input::placeholder { color: #2e2e2a; }
        .field-input option { background: #111110; }
        textarea.field-input { resize: none; min-height: 96px; line-height: 1.6; }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 9, 0.88);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-box {
          background: #111110;
          border: 1px solid #222220;
          width: 100%;
          max-width: 580px;
          max-height: 92vh;
          overflow-y: auto;
          padding: 44px 48px;
        }

        @media (max-width: 600px) {
          .modal-box { padding: 32px 24px; }
          .form-grid { grid-template-columns: 1fr !important; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s ease both; }

        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #0c0c0b; }
        ::-webkit-scrollbar-thumb { background: #2a2a28; }
      `}</style>

      <div className="ee-root" style={{ minHeight: '100vh', background: '#0c0c0b' }}>

        {/* ── Navigation ── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(12,12,11,0.96)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #1a1a18',
          padding: '0 40px', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 300, color: '#e8e4dc', letterSpacing: '0.04em' }}>
              Eternal
            </span>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 600, color: '#c9a96e', letterSpacing: '0.04em' }}>
              Echoes
            </span>
          </div>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <span style={{ fontSize: '12px', color: '#383835', display: 'none' }}
                className="hide-mobile">{user.email}</span>
              <button className="btn-outline" onClick={handleSignOut}>Sign out</button>
            </div>
          )}
        </nav>

        <main style={{ maxWidth: '640px', margin: '0 auto', padding: '72px 24px 120px' }}>

          {/* ── Hero ── */}
          <div className="fade-up" style={{ textAlign: 'center', marginBottom: '80px' }}>
            <p style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '12px', letterSpacing: '0.28em', textTransform: 'uppercase',
              color: '#555550', marginBottom: '24px', fontStyle: 'italic',
            }}>
              A living record of your life
            </p>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(56px, 12vw, 96px)',
              fontWeight: 300, lineHeight: 0.92,
              letterSpacing: '-0.01em', color: '#e8e4dc',
              marginBottom: '28px',
            }}>
              Your Story,<br />
              <em style={{ color: '#c9a96e', fontStyle: 'italic' }}>Forever</em>
            </h1>
            <p style={{
              fontSize: '14px', color: '#555550', fontWeight: 300,
              lineHeight: 1.75, maxWidth: '380px', margin: '0 auto 40px',
            }}>
              Curate the moments that define you — photos, words, music, memories. A timeline that outlasts everything.
            </p>
            {user && (
              <button className="btn-gold" onClick={() => setShowForm(true)}>
                + Add a Memory
              </button>
            )}
          </div>

          {/* ── Spotify ── */}
          <div style={{
            marginBottom: '56px',
            padding: '24px 28px',
            background: '#111110',
            border: '1px solid #1a1a18',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '16px',
          }}>
            <div>
              <p style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555550', marginBottom: '5px' }}>
                Music
              </p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 400, color: '#e8e4dc' }}>
                Attach your soundtrack
              </p>
            </div>
            {spotifyConnected ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(29,185,84,0.08)', border: '1px solid #1DB954',
                  padding: '8px 14px', fontSize: '12px', color: '#1DB954',
                  fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.04em',
                }}>
                  ♪ Connected
                </span>
                <button className="btn-outline" onClick={syncTracks}>Sync</button>
              </div>
            ) : (
              <button
                onClick={() => setSpotifyConnected(true)}
                style={{
                  background: '#1DB954', color: '#000', border: 'none',
                  padding: '11px 24px', fontSize: '11px', fontWeight: 500,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  transition: 'background 0.2s',
                }}
              >
                Connect Spotify
              </button>
            )}
          </div>

          {/* ── Timeline Header ── */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 400, color: '#e8e4dc' }}>
              Timeline
            </h2>
            <span style={{ fontSize: '11px', color: '#333330', letterSpacing: '0.08em' }}>
              {timeline.length} {timeline.length === 1 ? 'memory' : 'memories'}
            </span>
          </div>

          {/* ── Timeline Entries ── */}
          {timeline.length === 0 ? (
            <div style={{
              padding: '72px 32px', textAlign: 'center',
              border: '1px dashed #1a1a18',
            }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 300, fontStyle: 'italic', color: '#2e2e2a', marginBottom: '10px' }}>
                Nothing here yet
              </p>
              <p style={{ fontSize: '13px', color: '#222220', fontWeight: 300 }}>
                Your first memory is waiting to be saved.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {timeline.map((entry, i) => (
                <div
                  key={entry.id}
                  className="feed-card fade-up"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  {/* Card top row */}
                  <div style={{ padding: '22px 24px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#c9a96e', lineHeight: 1, flexShrink: 0 }}>
                        {TYPE_ICONS[entry.type] ?? '✦'}
                      </span>
                      <div>
                        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 400, color: '#e8e4dc', lineHeight: 1.2 }}>
                          {new Date(entry.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#3a3a37', marginTop: '3px', fontWeight: 500 }}>
                          {entry.type}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#272724', whiteSpace: 'nowrap', paddingTop: '2px', flexShrink: 0 }}>
                      {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Caption */}
                  {entry.caption && (
                    <div style={{ padding: '0 24px 20px', borderTop: '1px solid #191917' }}>
                      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '19px', fontWeight: 300, lineHeight: 1.65, color: '#b8b4aa', fontStyle: 'italic', paddingTop: '18px' }}>
                        "{entry.caption}"
                      </p>
                    </div>
                  )}

                  {/* Media */}
                  {entry.media_url && (
                    <div style={{ background: '#0a0a09', borderTop: '1px solid #191917' }}>
                      {isVideoUrl(entry.media_url) ? (
                        <video controls style={{ width: '100%', display: 'block', maxHeight: '500px', objectFit: 'contain' }}>
                          <source src={entry.media_url} />
                        </video>
                      ) : (
                        <Image
                          src={entry.media_url}
                          alt={entry.caption ?? 'Memory'}
                          width={1600}
                          height={1200}
                          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '540px', objectFit: 'contain' }}
                        />
                      )}
                    </div>
                  )}

                  {/* Spotify tag */}
                  {entry.spotify_track_id && (
                    <div style={{ padding: '14px 24px', borderTop: '1px solid #191917' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '7px',
                        background: 'rgba(29,185,84,0.06)', border: '1px solid rgba(29,185,84,0.2)',
                        padding: '6px 12px', fontSize: '11px', color: '#1DB954',
                        letterSpacing: '0.04em',
                      }}>
                        ♪ {entry.spotify_track_id}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ── Add Memory Modal ── */}
        {showForm && (
          <div
            className="overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <div className="modal-box">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px' }}>
                <div>
                  <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555550', marginBottom: '8px' }}>New entry</p>
                  <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '34px', fontWeight: 300, color: '#e8e4dc', lineHeight: 1 }}>
                    Add a Memory
                  </h2>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ background: 'none', border: 'none', color: '#3a3a37', fontSize: '24px', cursor: 'pointer', lineHeight: 1, marginTop: '4px' }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="field-label">Date</label>
                    <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="field-input" />
                  </div>
                  <div>
                    <label className="field-label">Type</label>
                    <select value={entryType} onChange={(e) => setEntryType(e.target.value)} className="field-input">
                      <option value="text">Text</option>
                      <option value="photo">Photo</option>
                      <option value="video">Video</option>
                      <option value="song">Song</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="field-label">Caption</label>
                  <textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="field-input" placeholder="Describe this memory..." />
                </div>

                <div>
                  <label className="field-label">
                    Photo / Video&nbsp;
                    <span style={{ color: '#282825', textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>max 10MB image · 150MB video</span>
                  </label>
                  <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="field-input" style={{ cursor: 'pointer' }} />
                  {file && (
                    <p style={{ fontSize: '11px', color: '#3a3a37', marginTop: '6px' }}>
                      {file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB
                    </p>
                  )}
                </div>

                <div>
                  <label className="field-label">
                    Spotify Track ID&nbsp;
                    <span style={{ color: '#282825', textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>optional</span>
                  </label>
                  <input type="text" value={spotifyTrackId} onChange={(e) => setSpotifyTrackId(e.target.value)} className="field-input" placeholder="4uLU6hMCjMI75M1A2tKUQC" />
                </div>
              </div>

              <div style={{ marginTop: '36px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button className="btn-gold" onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Saving...' : 'Save Memory'}
                </button>
                <button className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                {uploadStatus && (
                  <span style={{
                    fontSize: '13px',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontStyle: 'italic',
                    color: uploadStatus.startsWith('✦') ? '#c9a96e' : '#cc5555',
                  }}>
                    {uploadStatus}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
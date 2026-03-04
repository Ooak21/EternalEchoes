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

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [entryType, setEntryType] = useState('text');
  const [caption, setCaption] = useState('');
  const [spotifyTrackId, setSpotifyTrackId] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data, error } = await supabase
        .from('timeline_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (error) console.error('Timeline fetch error:', error);
      else setTimeline(data || []);

      setLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) router.push('/login');
    });

    return () => authListener.subscription.unsubscribe();
  }, [router]);

  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|m4v)$/i.test(url);

  const handleUpload = async () => {
    if (!user) return setUploadStatus('Please sign in first');

    setUploadStatus('Uploading...');

    let mediaUrl: string | null = null;
    let uploadFile: File | null = file;

    if (file) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (isImage && file.size > MAX_IMAGE_BYTES) {
        setUploadStatus('Image too large. Max 10MB.');
        return;
      }
      if (isVideo && file.size > MAX_VIDEO_BYTES) {
        setUploadStatus('Video too large. Max 150MB.');
        return;
      }

      if (isImage) {
        try {
          uploadFile = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: true, initialQuality: 0.8 });
        } catch (err) {
          console.error('Compression failed, using original');
        }
      }
    }

    if (uploadFile) {
      const fileName = `${user.id}/${Date.now()}.${uploadFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('timeline-media').upload(fileName, uploadFile);
      if (uploadError) return setUploadStatus('Upload failed: ' + uploadError.message);

      const { data } = supabase.storage.from('timeline-media').getPublicUrl(fileName);
      mediaUrl = data.publicUrl;
    }

    const { error } = await supabase.from('timeline_entries').insert({
      user_id: user.id,
      event_date: eventDate || new Date().toISOString(),
      type: entryType,
      caption: caption || null,
      media_url: mediaUrl,
      spotify_track_id: spotifyTrackId || null,
    });

    if (error) {
      setUploadStatus('Insert failed: ' + error.message);
    } else {
      setUploadStatus('✅ Entry added successfully!');

      const { data: fresh } = await supabase
        .from('timeline_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      setTimeline(fresh || []);

      setFile(null);
      setEventDate('');
      setCaption('');
      setSpotifyTrackId('');
      setEntryType('text');
    }
  };

  const connectSpotify = () => {
    setSpotifyConnected(true);
    alert('Spotify connected (test mode)');
  };

  const syncTracks = () => alert('Sync placeholder');

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center text-xl">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-12 font-sans">
      <h1 className="text-5xl md:text-7xl font-bold text-center mb-16">EternalEchoes</h1>

      <div className="max-w-4xl mx-auto mb-12 bg-gray-900 p-6 rounded-xl border border-gray-700">
        {user ? (
          <p className="text-green-400 text-xl">Welcome back, {user.email}</p>
        ) : (
          <p className="text-yellow-400 text-xl">Redirecting to login...</p>
        )}
      </div>

      {/* Spotify Test Section (unchanged) */}
      <div className="max-w-4xl mx-auto mb-16 bg-gray-900 p-8 rounded-xl border border-gray-700">
        <h2 className="text-3xl font-semibold mb-6">Spotify (Test Mode)</h2>
        {spotifyConnected ? (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <span className="text-green-400 text-2xl font-bold">✅ Connected</span>
            <button onClick={syncTracks} className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl text-lg transition-colors">Sync Favorite Tracks</button>
          </div>
        ) : (
          <button onClick={connectSpotify} className="bg-[#1DB954] hover:bg-[#1ed760] text-black px-10 py-5 rounded-full text-xl font-bold transition hover:scale-105 shadow-md">Connect Spotify</button>
        )}
      </div>

      {/* Upload Form (unchanged from working version) */}
      {user && (
        <div className="max-w-4xl mx-auto bg-gray-900 p-8 rounded-xl border border-gray-700 mb-12">
          <h3 className="text-2xl font-semibold mb-6">Add New Memory</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-300 mb-2">Date</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Type</label>
              <select value={entryType} onChange={(e) => setEntryType(e.target.value)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white">
                <option value="text">Text</option>
                <option value="photo">Photo</option>
                <option value="video">Video</option>
                <option value="song">Song</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-300 mb-2">Caption</label>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white h-24" placeholder="Describe the memory..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-300 mb-2">Upload Photo/Video (optional)</label>
              <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-300 mb-2">Spotify Track ID (optional)</label>
              <input type="text" value={spotifyTrackId} onChange={(e) => setSpotifyTrackId(e.target.value)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white" placeholder="spotify:track:..." />
            </div>
          </div>
          <button onClick={handleUpload} className="mt-6 bg-purple-600 hover:bg-purple-700 text-white px-10 py-4 rounded-full font-bold transition">Add to Timeline</button>
          {uploadStatus && <p className="mt-4 text-center text-gray-300">{uploadStatus}</p>}
        </div>
      )}

      {/* Timeline Display (unchanged) */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold mb-8 text-center">Your Life Timeline</h2>
        {timeline.length === 0 ? (
          <div className="bg-gray-900 p-10 rounded-xl border border-gray-700 text-center">
            <p className="text-gray-400 text-xl mb-4">No entries yet...</p>
            <p className="text-gray-500">Add your first memory above.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {timeline.map((entry) => (
              <div key={entry.id} className="bg-gray-900 p-6 rounded-xl border border-gray-700 shadow-lg hover:shadow-2xl transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xl font-semibold">{new Date(entry.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-gray-400 capitalize">{entry.type}</p>
                  </div>
                  <span className="text-gray-500 text-sm">Added {new Date(entry.created_at).toLocaleDateString()}</span>
                </div>
                {entry.caption && <p className="text-lg mb-4">{entry.caption}</p>}
                {entry.media_url && (
                  <div className="w-full mb-4">
                    {isVideoUrl(entry.media_url) ? (
                      <video controls className="w-full h-auto rounded-lg"><source src={entry.media_url} /></video>
                    ) : (
                      <Image src={entry.media_url} alt="" width={1600} height={1600} className="w-full h-auto rounded-lg object-contain" />
                    )}
                  </div>
                )}
                {entry.spotify_track_id && <p className="text-green-400 font-medium">🎵 {entry.spotify_track_id}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
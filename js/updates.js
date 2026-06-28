// ===== LOAD UPDATES =====
function renderUpdateMedia(url) {
  if (!url || !url.trim()) return '';
  const u = url.trim();

  // YouTube
  const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return '<div class="update-video-wrap"><iframe src="https://www.youtube.com/embed/' + ytMatch[1] + '" frameborder="0" allowfullscreen loading="lazy"></iframe></div>';
  }

  // Direct video file
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(u)) {
    return '<video class="update-media" controls preload="metadata"><source src="' + escapeHtml(u) + '">Your browser does not support video.</video>';
  }

  // Direct image file
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(u)) {
    return '<img class="update-media" src="' + escapeHtml(u) + '" alt="Update image" onerror="this.style.display=\'none\'">';
  }

  // Google Drive / Dropbox / other — show as link
  return '<a href="' + escapeHtml(u) + '" target="_blank" class="update-media-link">📎 View Attachment</a>';
}

// ===== LOAD UPDATES =====
async function loadUpdates() {
  const container = document.getElementById('updates-list');
  if (!container) return;

  container.innerHTML = '<p class="placeholder-text">Loading...</p>';

  try {
    const { data, error } = await sb
      .from('updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load updates', 'error'); return; }

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No updates yet</p>';
      return;
    }

    container.innerHTML = data.map(u => {
      const date = new Date(u.created_at);
      const imageMedia = u.image_url ? renderUpdateMedia(u.image_url) : '';
      const videoMedia = u.video_url ? renderUpdateMedia(u.video_url) : '';

      return '<div class="update-card">' +
        (u.title ? '<h3 class="update-title">' + escapeHtml(u.title) + '</h3>' : '') +
        '<div class="update-content">' + sanitizeHtml(u.content) + '</div>' +
        imageMedia +
        videoMedia +
        '<div class="update-meta">' +
          date.toLocaleDateString() + ' • ' +
          date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        '</div>' +
      '</div>';
    }).join('');

  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}
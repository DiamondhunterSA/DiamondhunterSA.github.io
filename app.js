(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-navigation');
  const closeMenu = () => { menu?.setAttribute('aria-expanded', 'false'); nav?.classList.remove('open'); };
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { const wasOpen = menu?.getAttribute('aria-expanded') === 'true'; closeMenu(); if (wasOpen) menu.focus(); }
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) {
      event.preventDefault();
      const input = document.querySelector('#search-input');
      if (input) input.focus(); else location.assign('/search.html');
    }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  let ticking = false;
  const updateProgress = () => {
    const progress = document.querySelector('.reading-progress');
    if (!document.querySelector('.article-layout')) return;
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${scrollable > 0 ? Math.min(100, scrollY / scrollable * 100) : 100}%`;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  updateProgress();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      document.querySelectorAll('.toc a').forEach(link => link.classList.toggle('active', link.getAttribute('href') === '#' + visible.target.id));
    }, { rootMargin: '-100px 0px -55% 0px' });
    document.querySelectorAll('.prose h2[id], .prose h3[id]').forEach(h => observer.observe(h));
  }
  const clipboardWrite = async text => {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
  };
  document.querySelectorAll('.prose pre').forEach(pre => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'code-copy'; button.textContent = 'Copy'; button.setAttribute('aria-label', 'Copy code block');
    button.addEventListener('click', async () => {
      try { await clipboardWrite(pre.querySelector('code')?.textContent || ''); button.textContent = 'Copied'; }
      catch { button.textContent = 'Select to copy'; const range = document.createRange(); range.selectNodeContents(pre.querySelector('code') || pre); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); }
      setTimeout(() => { button.textContent = 'Copy'; }, 2500);
    }); pre.append(button);
  });
  const copyLink = document.querySelector('.copy-link');
  copyLink?.addEventListener('click', async () => {
    const status = document.querySelector('.copy-status');
    try { await clipboardWrite(location.origin + location.pathname); status.textContent = 'Link copied.'; }
    catch { status.textContent = 'Copy the address from your browser to share this entry.'; }
  });
  if (innerWidth <= 850) document.querySelector('.toc details')?.removeAttribute('open');
  const form = document.querySelector('.search-form');
  if (!form) return;
  const input = document.querySelector('#search-input'), status = document.querySelector('.search-status'), results = document.querySelector('.search-results');
  const sections = { projects: 'Projects', notes: 'Learning Notes', explorations: 'Explorations' };
  let allPosts = [], filter = 'all', loaded = false;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const queryTokens = () => input.value.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean).slice(0,20);
  function highlight(value, tokens) {
    const terms = [...new Set(tokens)].sort((a,b)=>b.length-a.length);
    if (!terms.length) return escape(value);
    const regex = new RegExp('(' + terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')','gi');
    return String(value).split(regex).map((part,i) => i%2 ? `<mark>${escape(part)}</mark>` : escape(part)).join('');
  }
  function render() {
    if (!loaded) return;
    const tokens = queryTokens();
    const matches = allPosts.filter(p => (filter === 'all' || p.section === filter) && tokens.every(t => `${p.title} ${p.description} ${p.tags.join(' ')} ${p.text}`.toLocaleLowerCase('en').includes(t))).sort((a,b) => {
      const score = p => tokens.reduce((total,t)=>total + (p.title.toLowerCase().includes(t)?5:0) + (p.tags.some(tag=>tag.toLowerCase().includes(t))?3:0),0);
      return score(b)-score(a) || b.date.localeCompare(a.date);
    });
    status.textContent = tokens.length ? `${matches.length} ${matches.length === 1 ? 'entry' : 'entries'} found for “${input.value.trim()}”${filter === 'all' ? '.' : ` in ${sections[filter]}.`}` : `${matches.length} ${matches.length === 1 ? 'entry' : 'entries'} to explore${filter === 'all' ? '.' : ` in ${sections[filter]}.`}`;
    if (!matches.length) { results.innerHTML = '<div class="empty-state"><h2>No trace of that spark.</h2><p>Try a shorter phrase, another tag, or a different section.</p><a href="/posts.html">Browse all entries →</a></div>'; return; }
    results.innerHTML = matches.map(p => {
      const plain = p.text.replace(/&(?:amp|lt|gt|quot|#39);/g, m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[m]));
      const first = tokens.length ? plain.toLowerCase().indexOf(tokens[0]) : -1;
      const excerpt = first >= 0 ? (first > 55 ? '…' : '') + plain.slice(Math.max(0,first-55),Math.max(0,first-55)+220) + '…' : p.description;
      const displayDate = new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(p.date+'T00:00:00Z'));
      return `<article class="search-result"><div class="card-labels"><span class="entry-label">${sections[p.section]}</span>${p.starter?'<span class="starter-label">Starter entry</span>':''}</div><h2><a href="${escape(p.url)}">${highlight(p.title,tokens)}</a></h2><p>${highlight(excerpt,tokens)}</p><small>${displayDate} · ${p.minutes} min read · ${p.tags.map(escape).join(' / ')}</small></article>`;
    }).join('');
  }
  input.value = (new URLSearchParams(location.search).get('q') || '').slice(0,200);
  form.addEventListener('submit', event => {
    event.preventDefault(); render();
    const query = input.value.trim(); history.replaceState(null, '', '/search.html' + (query ? '?q=' + encodeURIComponent(query) : ''));
  });
  input.addEventListener('input', render);
  document.querySelectorAll('[data-search-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.searchFilter;
    document.querySelectorAll('[data-search-filter]').forEach(other=>other.setAttribute('aria-pressed',String(other===button))); render();
  }));
  fetch('/search-index.json').then(response => { if (!response.ok) throw new Error('Search index unavailable'); return response.json(); }).then(data=>{allPosts=data;loaded=true;render();}).catch(()=>{
    status.textContent = 'Search could not load. Refresh this page or browse the tag index.';
    results.innerHTML = '<p><a class="text-link" href="/tags.html">Browse tags →</a> &nbsp; <a class="text-link" href="/posts.html">All entries →</a></p>';
  });
})();

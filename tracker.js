(function() {
  'use strict';

  var CFG = window.FUNNEL_CONFIG || {};
  var visitorId = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  var scrollMilestones = { 25: false, 50: false, 75: false, 100: false };
  var sbClient = null;

  // ── Init Supabase ─────────────────────────────────────────
  function initSupabase() {
    if (CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase) {
      sbClient = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    }
  }

  // ── Init Meta Pixel ───────────────────────────────────────
  function initMetaPixel() {
    if (!CFG.metaPixelId) return;
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)
    }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CFG.metaPixelId);
    window.fbq('track', 'PageView');
  }

  // ── Init Google Analytics ─────────────────────────────────
  function initGA() {
    if (!CFG.gaId) return;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + CFG.gaId;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', CFG.gaId);
  }

  // ── Send event ────────────────────────────────────────────
  function sendEvent(eventType, eventData) {
    var payload = {
      funnel_id: CFG.funnelId || 'advertorial',
      visitor_id: visitorId,
      event_type: eventType,
      event_data: eventData || {},
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      referrer: document.referrer,
      created_at: new Date().toISOString()
    };

    // Supabase
    if (sbClient) {
      sbClient.from('funnel_events').insert(payload).then(function(){}).catch(function(){});
    }

    // Meta Pixel
    if (window.fbq) {
      if (eventType === 'cta_click' || eventType === 'conversion') {
        window.fbq('track', 'InitiateCheckout', { content_name: 'SeverX', value: 29, currency: 'EUR' });
      }
    }

    // GA
    if (window.gtag) {
      window.gtag('event', eventType, eventData || {});
    }
  }

  // ── Scroll tracking ───────────────────────────────────────
  function getScrollPercent() {
    var el = document.documentElement;
    var scrolled = el.scrollTop || document.body.scrollTop;
    var total = el.scrollHeight - el.clientHeight;
    return total > 0 ? Math.round((scrolled / total) * 100) : 0;
  }

  var scrollThrottle = null;
  function onScroll() {
    if (scrollThrottle) return;
    scrollThrottle = setTimeout(function() {
      scrollThrottle = null;
      var pct = getScrollPercent();
      [25, 50, 75, 100].forEach(function(milestone) {
        if (pct >= milestone && !scrollMilestones[milestone]) {
          scrollMilestones[milestone] = true;
          sendEvent('scroll_' + milestone, { percent: milestone });
        }
      });
    }, 200);
  }

  // ── CTA click tracking ────────────────────────────────────
  function onDocClick(e) {
    var el = e.target.closest('[data-cta]');
    if (!el) return;
    var ctaId = el.getAttribute('data-cta');
    sendEvent('cta_click', { cta_id: ctaId, text: el.textContent.trim().substring(0, 100) });
    sendEvent('conversion', { cta_id: ctaId });
  }

  // ── Page view ─────────────────────────────────────────────
  function trackPageView() {
    sendEvent('page_view', {
      title: document.title,
      referrer: document.referrer,
      utm_source: getParam('utm_source'),
      utm_medium: getParam('utm_medium'),
      utm_campaign: getParam('utm_campaign')
    });
  }

  function getParam(name) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || '';
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    initSupabase();
    initMetaPixel();
    initGA();
    trackPageView();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onDocClick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

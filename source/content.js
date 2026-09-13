/* Portfolio content layer.
   Collapsed cards carry identity only — logo, position, company, dates for
   work; number, name, dates for projects. Everything substantive lives in the
   expanded state built by buildDetail(). odyssey.js owns motion; this file
   owns what the visitor reads. */
(function () {
  'use strict';

  const MEDIA = window.PORTFOLIO_MEDIA || {};

  /* Real credentials supplied by the author. */
  const COPY = {
    name: 'SATHYA DEVARAJAN',
    role: '// MECHANICAL DESIGN, STRUCTURES & DFM',
    tagline: 'Mechanical engineering student building real hardware in design, structures, and manufacturing, with an eye on problems that matter for people and the planet.',
    facts: [
      ['University', 'Purdue University'],
      ['Program', 'John Martinson Honors College'],
      ['Degree / GPA', 'B.S. ME · 3.8+ / 4.00'],
      ['Graduation', 'Expected May 2028'],
      ['Citizenship', 'US Citizen']
    ],
    about: "My depth is in mechanical design, structural analysis, and design-for-manufacturing. I've machined drivetrain components for Formula SAE Electric and designed production tooling for rotorcraft at Sikorsky, and what I care about is the full path from geometry and tolerancing to a part that comes off a machine and works. From that base I've pushed outward into the systems around the hardware: sensor fusion and closed-loop control, analog circuit design, and Python simulations for feasibility and trade studies. I got into engineering to work on problems that genuinely help people and the planet, and the more of the stack I understand, the more useful I can be on them.",
    contactHeading: 'GET IN TOUCH',
    contactBody: 'Available for mechanical engineering internships, tooling and structures design, and additive/subtractive manufacturing collaboration.',
    email: 'sathyadevarajan07@gmail.com',
    phone: '630-888-0715',
    phoneHref: 'tel:6308880715',
    linkedin: 'https://linkedin.com/in/sathya-devarajan',
    linkedinLabel: 'linkedin.com/in/sathya-devarajan',
    portfolioPdf: 'assets/Sathya_Devarajan_Portfolio.pdf',
    resumePdf: 'assets/Resume.pdf',
    status: 'AVAILABLE_FOR_INTERNSHIPS_AND_PROJECTS'
  };

  /* Authentic employer / organization marks supplied by the author, keyed by
     the logoType already present in the portfolio data. Intrinsic pixel sizes
     are measured from the files so containers adopt the real ratio. */
  const LOGOS = {
    sikorsky: { src: 'assets/logos/sikorsky.png', width: 1875, height: 1871, alt: 'Sikorsky, a Lockheed Martin company' },
    fsae: { src: 'assets/logos/purdue-electric-racing.png', width: 200, height: 200, alt: 'Purdue Electric Racing' }
  };

  /* Real project media from the author's portfolio, matched to its destination. */
  const GALLERIES = {
    fsae: [
      ['upright-wheel-cad-01.jpg', '2027 rear wheel upright CAD model in Siemens NX.'],
      ['upright-fea.jpg', 'Static structural FEA result for the rear upright and hub group.'],
      ['upright-cam-01-roughing.jpg', 'CAM roughing setup for the upright.'],
      ['upright-5axis-machined.jpg', 'Upright after 5-axis machining.']
    ],
    'proj-01': [
      ['bike-01-frame-assembly.jpg', 'Parametric electric bike frame assembly.'],
      ['bike-02-fea-prepped.jpg', 'Frame model prepared for FEA.'],
      ['bike-03-fea-stress.jpg', 'Stress distribution across the frame under static load.']
    ],
    'proj-03': [
      ['topo-01-source.jpg', 'Source portrait used to drive the relief.'],
      ['topo-02-heightmap.jpg', 'Grayscale heightmap derived from the source image.'],
      ['topo-03-mesh-toolpath.jpg', 'Relief mesh with generated CAM toolpaths.'],
      ['topo-05-stockprep.jpg', 'Stock preparation before machining.'],
      ['topo-06-router.jpg', 'Machining the relief on the router.'],
      ['topo-07-final.jpg', 'Finished machined relief.']
    ],
    'proj-04': [
      ['audio-eq-schematic.png', 'Multi-stage analog equalizer schematic.']
    ]
  };

  /* Machining-pass footage localized from the author's original portfolio,
     https://sathyadev07.github.io/sathya-devarajan-portfolio/, in the order
     that page presents it. Two encodes per pass, exactly as the original
     ships them: a ~1.4 MB 960x540 silent loop for the strip, and the full
     1280x720 capture, fetched only when the visitor asks to watch it. The
     full files run 12-79 MB, so nothing here is loaded up front. */
  const VIDEO_W = 960;
  const VIDEO_H = 540;
  const VIDEOS = {
    'proj-03': [
      { stem: 'topo-video-1', caption: '01 — Machining Pass — Video 1' },
      { stem: 'topo-video-2', caption: '02 — Machining Pass — Video 2' },
      { stem: 'topo-video-3', caption: '03 — Machining Pass — Video 3' }
    ]
  };

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        const value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else node.setAttribute(key, value === true ? '' : value);
      });
    }
    (children || []).forEach(function (child) {
      if (!child) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  /* Understated diagonal arrow, pointing to the top right: these actions open
     something, they do not download it in place. Drawn rather than typed so it
     keeps the button's optical weight and never depends on a glyph. */
  function arrow() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'btn-arrow');
    svg.setAttribute('viewBox', '0 0 12 12');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M3.2 8.8 8.8 3.2M4.6 3.2h4.2v4.2');
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '1.4');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(p);
    return svg;
  }

  function list(items, className) {
    return el('ul', { class: className || 'bullets' }, items.map(function (item) {
      return el('li', { text: item });
    }));
  }

  function tagRow(tags) {
    return el('ul', { class: 'tags', 'aria-label': 'Tools and methods' }, tags.map(function (tag) {
      return el('li', { class: 'tag od-keep', text: tag });
    }));
  }

  /* The shared element that morphs between the collapsed card and the modal. */
  function logoMark(logoType, context) {
    const logo = LOGOS[logoType];
    if (!logo) return null;
    return el('span', { class: 'logo-mark', 'data-logo': logoType, 'data-logo-context': context }, [
      el('img', {
        src: logo.src,
        alt: logo.alt,
        width: logo.width,
        height: logo.height,
        decoding: 'async'
      })
    ]);
  }

  function figure(entry) {
    const file = entry[0];
    const dims = MEDIA[file] || {};
    const image = el('img', {
      class: 'od-media',
      src: 'assets/images/' + file,
      alt: entry[1],
      loading: 'lazy',
      decoding: 'async',
      width: dims.width || null,
      height: dims.height || null
    });
    if (dims.width && dims.height) image.style.aspectRatio = dims.width + ' / ' + dims.height;
    return el('figure', { class: 'shot' }, [image, el('figcaption', { text: entry[1] })]);
  }

  function statGrid(stats) {
    return el('ul', { class: 'stats' }, stats.map(function (stat) {
      return el('li', { class: 'od-stat stat' }, [
        el('strong', { class: 'stat-value od-nowrap', text: stat.value }),
        el('span', { class: 'stat-label', text: stat.label })
      ]);
    }));
  }

  /* Real model presentation. The mapping, orientation and stand-in media come
     from source/model-map.js; a destination with no mapped asset gets no block
     at all rather than an invented one. */
  function appendModel(parts, contentId) {
    const spec = (window.PORTFOLIO_MODELS || {})[contentId];
    if (!spec || !spec.model) return;
    parts.push(el('h3', { class: 'detail-sub', text: 'CAD model' }));
    parts.push(el('div', { class: 'viewer-block' }, [
      el('p', { class: 'viewer-caption mono', text: spec.label }),
      el('div', {
        class: 'viewer-host',
        'data-viewer': contentId,
        'data-od-id': 'viewer-' + contentId
      }),
      el('div', { class: 'viewer-controls od-cluster' }, [
        /* Pressed on arrival: the model is already turning when the block
           mounts, so the control reads as a way to stop it. */
        el('button', { type: 'button', class: 'chip od-touch', disabled: true, 'data-viewer-action': 'spin', 'data-viewer-for': contentId, 'aria-pressed': 'true', text: 'Auto-rotate' }),
        el('button', { type: 'button', class: 'chip od-touch', disabled: true, 'data-viewer-action': 'reset', 'data-viewer-for': contentId, text: 'Reset view' })
      ])
    ]));
  }

  /* The machining footage sits below the model block, in the original's order.
     Each tile carries the silent loop; the play control swaps that one tile to
     the full capture with controls, so a visitor never downloads footage they
     did not ask for and two passes never fight for the decoder. */
  function appendVideos(parts, contentId) {
    const entries = VIDEOS[contentId];
    if (!entries || !entries.length) return;
    parts.push(el('h3', { class: 'detail-sub', text: 'Machining passes' }));
    parts.push(el('div', { class: 'video-strip', 'data-od-id': 'video-strip-' + contentId }, entries.map(function (entry) {
      const preview = el('video', {
        class: 'video-preview',
        muted: true,
        loop: true,
        playsinline: true,
        preload: 'none',
        width: VIDEO_W,
        height: VIDEO_H,
        tabindex: '-1',
        'aria-hidden': 'true',
        'data-preview': 'assets/video/' + entry.stem + '-preview.mp4'
      });
      preview.muted = true;
      return el('figure', { class: 'video-item', 'data-od-id': 'video-' + entry.stem }, [
        el('div', { class: 'video-frame' }, [
          preview,
          el('button', {
            type: 'button',
            class: 'video-play od-touch',
            'data-video-full': 'assets/video/' + entry.stem + '.mp4',
            'data-video-label': entry.caption
          }, [
            el('span', { class: 'video-play-mark', 'aria-hidden': 'true' }),
            el('span', { class: 'visually-hidden', text: 'Play ' + entry.caption })
          ])
        ]),
        el('figcaption', { class: 'video-cap mono', text: entry.caption })
      ]);
    })));
  }

  /* ---------- destination panels ---------- */

  function heroPanel() {
    return el('div', { class: 'panel-inner', 'data-od-id': 'hero-panel' }, [
      el('p', { class: 'eyebrow mono', text: COPY.role }),
      el('h1', { class: 'display name', id: 'panel-title-hero', 'data-od-id': 'hero-name', text: COPY.name }),
      el('p', { class: 'lead', text: COPY.tagline }),
      el('div', { class: 'actions od-cluster' }, [
        el('a', {
          class: 'btn primary od-touch',
          id: 'portfolio-pdf-action',
          'data-od-id': 'hero-portfolio-pdf',
          href: COPY.portfolioPdf,
          target: '_blank',
          rel: 'noopener'
        }, [
          el('span', { text: 'View Portfolio PDF' }),
          arrow()
        ]),
        el('button', {
          type: 'button',
          class: 'btn ghost od-touch',
          id: 'resume-action',
          'data-od-id': 'hero-view-resume',
          'aria-haspopup': 'dialog'
        }, [
          el('span', { text: 'View Resume' }),
          arrow()
        ])
      ]),
      el('dl', { class: 'facts', 'data-od-id': 'hero-facts' }, COPY.facts.reduce(function (acc, fact) {
        acc.push(el('dt', { text: fact[0] }));
        acc.push(el('dd', { text: fact[1] }));
        return acc;
      }, [])),
      el('p', { class: 'hint', text: 'View Resume opens the PDF in a reader you can download or print. View Portfolio PDF opens a print-ready portfolio; choose Save as PDF. Scroll to explore, or select a destination above.' })
    ]);
  }

  function aboutPanel() {
    return el('div', { class: 'panel-inner', 'data-od-id': 'about-panel' }, [
      el('h2', { class: 'display', id: 'panel-title-about', text: 'About' }),
      el('p', { class: 'body', text: COPY.about })
    ]);
  }

  /* Collapsed work card: logo, position, company, dates. Nothing else. */
  function experienceCard(item) {
    return el('button', {
      type: 'button',
      class: 'panel-inner card',
      'data-detail': item.id,
      'data-od-id': 'card-' + item.id,
      'aria-haspopup': 'dialog'
    }, [
      el('span', { class: 'card-head od-row' }, [
        logoMark(item.logoType, 'card'),
        el('span', { class: 'card-company od-keep', id: 'panel-title-' + item.id, text: item.company })
      ]),
      el('span', { class: 'card-role', text: item.title }),
      el('span', { class: 'card-date mono od-nowrap', text: item.period }),
      el('span', { class: 'card-open mono', 'aria-hidden': 'true', text: 'Open' })
    ]);
  }

  /* Collapsed project card: number, name, dates. Nothing else. */
  function projectCard(item) {
    return el('button', {
      type: 'button',
      class: 'panel-inner card',
      'data-detail': item.id,
      'data-od-id': 'card-' + item.id,
      'aria-haspopup': 'dialog'
    }, [
      el('span', { class: 'card-number mono', text: item.projNumber }),
      el('span', { class: 'card-title display', id: 'panel-title-' + item.id, text: item.title }),
      el('span', { class: 'card-date mono od-nowrap', text: item.period }),
      el('span', { class: 'card-open mono', 'aria-hidden': 'true', text: 'Open' })
    ]);
  }

  function contactPanel() {
    return el('div', { class: 'panel-inner', 'data-od-id': 'contact-panel' }, [
      el('p', { class: 'eyebrow mono', text: 'Contact' }),
      el('h2', { class: 'display', id: 'panel-title-contact', text: COPY.contactHeading }),
      el('p', { class: 'body', text: COPY.contactBody }),
      el('p', { class: 'status od-row' }, [
        el('span', { class: 'status-dot', 'aria-hidden': 'true' }),
        el('span', { class: 'mono', text: COPY.status })
      ]),
      el('div', { class: 'contact-actions', 'data-od-id': 'contact-pills' }, [
        el('a', { class: 'pill primary od-touch', 'data-od-id': 'contact-email', href: 'mailto:' + COPY.email }, [
          el('span', { class: 'pill-label mono', text: 'Email' }),
          el('span', { class: 'pill-value', text: COPY.email })
        ]),
        el('a', { class: 'pill od-touch', 'data-od-id': 'contact-phone', href: COPY.phoneHref }, [
          el('span', { class: 'pill-label mono', text: 'Phone' }),
          el('span', { class: 'pill-value od-nowrap', text: COPY.phone })
        ]),
        el('a', { class: 'pill od-touch', 'data-od-id': 'contact-linkedin', href: COPY.linkedin, target: '_blank', rel: 'noopener' }, [
          el('span', { class: 'pill-label mono', text: 'LinkedIn' }),
          el('span', { class: 'pill-value', text: COPY.linkedinLabel })
        ])
      ]),
      el('button', { type: 'button', class: 'btn ghost od-touch', 'data-od-id': 'contact-restart', 'data-goto': 'hero', text: 'Back to Start' })
    ]);
  }

  /* ---------- expanded detail views ---------- */

  function experienceDetail(item) {
    const parts = [
      el('div', { class: 'detail-head od-row' }, [
        logoMark(item.logoType, 'modal'),
        el('div', { class: 'detail-headings' }, [
          el('p', { class: 'eyebrow mono', text: item.company }),
          el('h2', { class: 'display', text: item.title })
        ])
      ]),
      el('p', { class: 'meta mono od-nowrap', text: item.period }),
      tagRow(item.tags),
      statGrid(item.stats),
      el('h3', { class: 'detail-sub', text: 'What I did' }),
      list(item.bullets)
    ];
    if (item.telemetryNote) {
      parts.push(el('div', { class: 'note' }, [
        el('p', { class: 'mono note-title', text: item.telemetryNote.title }),
        list(item.telemetryNote.lines, 'note-lines')
      ]));
    }
    const gallery = GALLERIES[item.id];
    if (gallery) {
      parts.push(el('h3', { class: 'detail-sub', text: 'Hardware' }));
      parts.push(el('div', { class: 'gallery' }, gallery.map(figure)));
    }
    appendModel(parts, item.id);
    if (item.id === 'fsae') appendModel(parts, 'fsae-assembly');
    return parts;
  }

  /* No project carries an organization mark, so the head is a plain stack:
     number, discipline, title, each starting at the same left edge. The
     side-by-side head belongs to the work entries, where a real logo fills
     the column — running it here left the title indented past an empty slot. */
  function projectDetail(item) {
    const parts = [
      el('div', { class: 'detail-head detail-head-stacked' }, [
        el('div', { class: 'detail-headings' }, [
          el('p', { class: 'detail-number mono', text: item.projNumber }),
          el('p', { class: 'eyebrow mono', text: item.subtitle }),
          el('h2', { class: 'display', text: item.title })
        ])
      ]),
      el('p', { class: 'meta mono od-nowrap', text: item.period }),
      tagRow(item.tags),
      el('p', { class: 'body', text: item.summary }),
      el('h3', { class: 'detail-sub', text: 'Engineering notes' }),
      list(item.bullets)
    ];
    const gallery = GALLERIES[item.id];
    if (gallery) {
      parts.push(el('h3', { class: 'detail-sub', text: 'Build media' }));
      parts.push(el('div', { class: 'gallery' }, gallery.map(figure)));
    }
    appendModel(parts, item.id);
    appendVideos(parts, item.id);
    return parts;
  }

  /* ---------- public builders ---------- */

  window.buildPanels = function (route, data) {
    const byId = {};
    data.experiences.forEach(function (item) { byId[item.id] = item; });
    data.projects.forEach(function (item) { byId[item.id] = item; });

    return route.map(function (waypoint) {
      let inner;
      if (waypoint.kind === 'hero') inner = heroPanel();
      else if (waypoint.kind === 'about') inner = aboutPanel();
      else if (waypoint.kind === 'experience') inner = experienceCard(byId[waypoint.contentId]);
      else if (waypoint.kind === 'project') inner = projectCard(byId[waypoint.contentId]);
      else inner = contactPanel();

      return el('section', {
        class: 'panel panel-' + waypoint.kind,
        id: 'wp-' + waypoint.id,
        'data-waypoint': waypoint.id,
        'data-od-id': 'section-' + waypoint.id,
        'aria-labelledby': 'panel-title-' + waypoint.id
      }, [inner]);
    });
  };

  window.buildDetail = function (id, data) {
    const experience = data.experiences.filter(function (item) { return item.id === id; })[0];
    if (experience) return experienceDetail(experience);
    const project = data.projects.filter(function (item) { return item.id === id; })[0];
    if (project) return projectDetail(project);
    return [];
  };

  window.PORTFOLIO_COPY = COPY;
})();

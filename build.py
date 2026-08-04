#!/usr/bin/env python3
"""Static site generator for the portfolio. Reads data/projects.json and
renders index.html, one page per category, about/contact, and one
case-study page per project. Re-run after editing data/projects.json."""
import json
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(ROOT, "data", "projects.json")))

PERSON = DATA["person"]
CATEGORIES = DATA["categories"]
PROJECTS = DATA["projects"]

CAT_BY_SLUG = {c["slug"]: c for c in CATEGORIES}

# Motion Graphics and Video Editing are hidden from nav/discipline lists for
# now (client request) — but NOT deleted: their data, category pages, and
# case-study pages still build normally, just aren't linked from anywhere.
HIDDEN_CATEGORY_SLUGS = {"motion-graphics", "video-editing"}
VISIBLE_CATEGORIES = [c for c in CATEGORIES if c["slug"] not in HIDDEN_CATEGORY_SLUGS]


def projects_in(cat_slug):
    return sorted([p for p in PROJECTS if p["category"] == cat_slug], key=lambda p: p["index"])


HEAD = """<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="{css}css/style.css" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<title>{title}</title>
"""


# While only Graphic Design is visible, its nav label reads "Work" rather
# than a narrower discipline name — revisit once Motion/Video are shown too.
NAV_LABEL_OVERRIDES = {"graphic-design": "Projects"}
BG_POSITION_OVERRIDES = {"bunny": "left center"}

# Per-project gallery collages: groups of consecutive gallery images that
# render side-by-side as one row instead of each getting its own full-width
# block. (filenames, cell-aspect-ratio) — the ratio is a representative value
# for the group (some collages mix slightly different source aspect ratios;
# object-fit:cover absorbs the small difference so the row stays tidy).
GALLERY_COLLAGES = {
    "bunny": [
        (["g7.jpg", "g8.jpg", "g9.jpg"], 0.7),
        (["g10.jpg", "g11.jpg", "g12.jpg"], 0.7),
        (["g13.jpg", "g14.jpg"], 1.8),
        (["g15.jpg", "g16.jpg"], 1.8),
        (["g17.jpg", "g18.jpg"], 0.85),
        (["g19.jpg", "g20.jpg"], 2.1),
        (["g22.jpg", "g23.jpg", "g24.jpg"], 1.0),
        (["g25.jpg", "g26.jpg"], 1.76),
        (["g27.jpg", "g28.jpg"], 1.73),
    ],
}


def gallery_html_for(p):
    gallery = p.get("gallery")
    if not gallery:
        return f"""<div class="cs-gallery">
    <div class="g-block ph-block tone-{p['tone']}"></div>
    <div class="g-block ph-block tone-{p['tone']}"></div>
  </div>"""

    collages = GALLERY_COLLAGES.get(p["slug"], [])
    group_of = {}
    for gi, (files, _ratio) in enumerate(collages):
        for f in files:
            group_of[f] = gi
    path_by_basename = {os.path.basename(g): g for g in gallery}

    parts = []
    seen_groups = set()
    for g in gallery:
        fname = os.path.basename(g)
        gid = group_of.get(fname)
        if gid is None:
            parts.append(f'<img class="g-block" src="../{g}" alt="{p["title"]} detail" />')
            continue
        if gid in seen_groups:
            continue  # already emitted this whole row when its first member came up
        seen_groups.add(gid)
        files, ratio = collages[gid]
        imgs = "".join(
            f'<img src="../{path_by_basename[fn]}" alt="{p["title"]} detail" style="aspect-ratio:{ratio};" />'
            for fn in files
        )
        parts.append(f'<div class="cs-collage" style="grid-template-columns:repeat({len(files)}, 1fr);">{imgs}</div>')

    return '<div class="cs-gallery">' + "".join(parts) + "</div>"


def nav(css_prefix, active):
    def link(href, label, key):
        cls = "active" if key == active else ""
        return f'<a href="{href}" class="{cls}">{label}</a>'

    cat_links = [
        link(
            f"{css_prefix}{c['slug']}.html",
            NAV_LABEL_OVERRIDES.get(c["slug"], c["label"].split(" ")[0]),
            c["slug"],
        )
        for c in VISIBLE_CATEGORIES
    ]
    links = "".join([
        link(f"{css_prefix}index.html", "Home", "home"),
        *cat_links,
        link(f"{css_prefix}about.html", "About", "about"),
        link(f"{css_prefix}contact.html", "Contact", "contact"),
    ])
    return f"""
<div class="nav-backdrop"></div>
<a href="{css_prefix}index.html" class="site-logo"><img src="{css_prefix}assets/logo-sree.png" alt="{PERSON['name']}" /></a>
<nav class="pillnav">
  <ul class="links">{links}</ul>
  <button class="nav-burger" aria-label="Menu">&#9776;</button>
</nav>
"""


def sidebar(css_prefix, active_category=None, project_index_for=None):
    topics_block = ""
    index_items = ""
    if project_index_for:
        plist = projects_in(project_index_for)

        topics = []
        for p in plist:
            for d in p.get("disciplines", []):
                if d not in topics:
                    topics.append(d)
        if topics:
            tag_items = "".join(f'<span class="topic-tag" data-topic="{d}">{d}</span>' for d in topics)
            topics_block = f"""
    <div class="eyebrow">Topics</div>
    <div class="topic-tags">{tag_items}</div>
    """

        for p in plist:
            index_items += (
                f'<li><a href="{css_prefix}case-study/{p["slug"]}.html">'
                f'<span class="n">{p["index"]:02d}</span> {p["title"]}</a></li>'
            )

    index_block = f"""
    {topics_block}
    <div class="eyebrow">{CAT_BY_SLUG[active_category]['label'].upper()} PROJECTS</div>
    <ul class="index-list">{index_items}</ul>
    """ if project_index_for else '<div style="flex:1"></div>'

    return f"""
<aside class="sidebar">
  {index_block}
  <div class="copyright">&copy; 2026 {PERSON['name']}</div>
</aside>
"""


def footer(css_prefix, tagline=None, wrap=False):
    tagline = tagline or PERSON["title"]
    socials = " &middot; ".join([f'<a href="{s["url"]}">{s["label"]}</a>' for s in PERSON["socials"]])
    cls = "site-footer site-footer-wrap" if wrap else "site-footer"
    return f"""
<footer class="{cls}">
  <div>&copy; 2026 {PERSON['name']} — {tagline}</div>
  <div>{socials}</div>
  <div><a href="mailto:{PERSON['email']}">{PERSON['email']}</a></div>
</footer>
"""


def photo_style(p, css_prefix):
    """Returns (extra_class, css_declaration) for a card that has a real cover photo."""
    cover = p.get("cover")
    if not cover:
        return "", ""
    position = BG_POSITION_OVERRIDES.get(p["slug"], "center")
    return " has-photo", f"background-image:url('{css_prefix}{cover}');background-position:{position};"


def card(p, css_prefix, n_style="index"):
    photo_cls, bg_decl = photo_style(p, css_prefix)
    style_attr = f' style="{bg_decl}"' if bg_decl else ""
    disc_attr = f' data-disciplines="{"|".join(p["disciplines"])}"' if p.get("disciplines") else ""
    return f"""
<a class="project-card tone-{p['tone']}{photo_cls}" href="{css_prefix}case-study/{p['slug']}.html"{style_attr}{disc_attr}>
  <span class="pc-n">{p['index']:02d}</span>
  <span class="pc-t">{p['title']}</span>
  <span class="pc-s">{p['subtitle']}</span>
  <span class="pc-link">View Project &#8599;</span>
</a>"""


def grid(projects, css_prefix):
    return '<div class="project-grid">' + "".join(card(p, css_prefix) for p in projects) + "</div>"


def page_shell(css_prefix, active, active_category, project_index_for, body, title, footer_tagline=None):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
{HEAD.format(css=css_prefix, title=title)}
</head>
<body>
{nav(css_prefix, active)}
<div class="page-shell">
{sidebar(css_prefix, active_category, project_index_for)}
<main class="content">
{body}
{footer(css_prefix, footer_tagline)}
</main>
</div>
<script src="{css_prefix}js/main.js"></script>
</body>
</html>"""


def write(path, html):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f:
        f.write(html)
    print("wrote", path)


# ---------- Home ----------
def hero_dcarousel(projects):
    """Draggable 3D ring carousel — same technique as Framer's
    EditableDirectionalCarousel: a preserve-3d ring where each card sits at
    rotateY(angle) translateZ(radius), evenly spaced around 360°, spun by
    dragging (1:1 with pointer movement) and auto-rotating slowly the rest
    of the time. Captions + case-study links added (the raw component has
    neither). Each card's box matches its cover photo's real aspect ratio
    computed at build time, so object-fit:cover never has to crop it —
    the box already matches the image 100%."""
    height = 175
    gap = 11
    n = len(projects)
    sizes = []
    for p in projects:
        w, h = Image.open(os.path.join(ROOT, p["cover"])).size
        sizes.append(round(height * w / h))
    avg_width = sum(sizes) / len(sizes)
    radius = round((avg_width + gap) / (2 * math.sin(math.pi / n)) * 0.96)

    items = ""
    for i, (p, width) in enumerate(zip(projects, sizes)):
        angle = round(360 / n * i, 2)
        tilt = 8 if i % 2 == 0 else -4  # alternating static tilt for a layered, editorial (not symmetrical) feel
        img_pos = BG_POSITION_OVERRIDES.get(p["slug"], "center")
        items += f"""
<div class="hm-dc-item" data-angle="{angle}" style="width:{width}px;height:{height}px;margin:-{height // 2}px 0 0 -{width // 2}px;--ry:{angle}deg;--rz:{radius}px;--tilt:{tilt}deg;">
  <a href="case-study/{p['slug']}.html">
    <img src="{p['cover']}" alt="{p['title']}" style="object-position:{img_pos};" />
    <div class="hm-dc-caption">
      <div class="hm-dc-caption-title">{p['title']}</div>
    </div>
  </a>
  <div class="hm-dc-reflect"></div>
</div>"""

    return f"""
<div class="hm-dcarousel">
  <div class="hm-dc-ring" id="heroDragCarousel">{items}</div>
</div>
"""


def hero_ticker(projects):
    """Premium editorial kinetic-typography ticker: oversized bold words
    (Swiss/editorial style) interspersed with real floating project preview
    cards, star separators between every item, continuous GSAP-driven
    right-to-left scroll that never pauses, and a hover interaction where
    the hovered word/card gets a soft blurred pill + flanking arrows while
    every other item dims to 20% opacity."""
    covers = {p["slug"]: p["cover"] for p in projects}
    titles = {p["slug"]: p["title"] for p in projects}
    order = ["origin-83", "bunny", "void", "making", "stratum"]
    tilts = [-4, 3, -3, 4, -2]

    words = [
        "BRAND IDENTITY", "PACKAGING DESIGN", "CAMPAIGN DESIGN", "TYPOGRAPHY",
        "VISUAL SYSTEMS", "EDITORIAL DESIGN", "PRINT DESIGN", "ART DIRECTION",
        "CREATIVE DIRECTION", "STORYTELLING",
    ]

    def sep():
        return '<span class="hm-t-sep">&#10022;</span>'

    def word_item(text):
        return (
            f'{sep()}<a class="hm-t-word" href="#work">'
            f'<span class="hm-t-arrow left">&#8599;</span>'
            f'<span class="hm-t-word-label">{text}</span>'
            f'<span class="hm-t-arrow right">&#8599;</span>'
            f'</a>'
        )

    def img_item(slug, tilt):
        pos = BG_POSITION_OVERRIDES.get(slug, "center")
        return (
            f'{sep()}<a class="hm-t-card" href="case-study/{slug}.html" style="--tilt:{tilt}deg">'
            f'<img src="{covers[slug]}" alt="{titles[slug]}" style="object-position:{pos};" />'
            f'</a>'
        )

    seq = (
        word_item(words[0])
        + img_item(order[0], tilts[0])
        + word_item(words[1]) + word_item(words[2])
        + img_item(order[1], tilts[1])
        + word_item(words[3]) + word_item(words[4])
        + img_item(order[2], tilts[2])
        + word_item(words[5]) + word_item(words[6])
        + img_item(order[3], tilts[3])
        + word_item(words[7]) + word_item(words[8])
        + img_item(order[4], tilts[4])
        + word_item(words[9])
        + sep()
    )

    return f"""
<div class="hm-ticker">
  <div class="hm-ticker-track" id="heroTicker">{seq}{seq}</div>
</div>
"""


def build_home():
    gd = projects_in("graphic-design")
    mg = projects_in("motion-graphics")
    ve = projects_in("video-editing")

    services = "".join(f"<span>{c['label']}</span>" for c in VISIBLE_CATEGORIES)

    dept_items = "".join(f'<li><a href="{c["slug"]}.html">{c["label"].upper()}</a></li>' for c in VISIBLE_CATEGORIES)

    hero = f"""
<section class="hero-mondragon">
  {hero_dcarousel(gd)}
  {hero_ticker(gd)}
  <div class="hm-main">
    <aside class="hm-disc-card hm-anim" style="animation-delay:.05s;">
      <div class="eyebrow">Disciplines</div>
      <ul class="hm-disc-list">{dept_items}</ul>
    </aside>
    <div class="hm-copy-block">
      <div class="hm-role-row hm-anim" style="animation-delay:.15s;">
        <div class="hm-kicker">
          <span class="hm-kicker-title">Art Director &amp; Graphic Designer</span>
          <p class="hm-kicker-desc">Creating brand identities, packaging, and visual systems through strategic thinking, refined execution, and purposeful storytelling.</p>
        </div>
        <div class="hm-services">{services}</div>
      </div>
      <div class="hm-name-row hm-anim" style="animation-delay:.35s;">
        <img class="hm-photo" src="{PERSON['photo']}" alt="{PERSON['name']}" />
        <h1 class="hm-name">
          <span class="hm-name-line">SREENATH</span>
          <span class="hm-name-line hm-name-sub">Pasupulati Kannaiah</span>
        </h1>
      </div>
      <div class="hm-cta-row hm-anim" style="animation-delay:.45s;">
        <a class="btn-primary" href="#work">Explore Work</a>
        <div class="hm-status-badge"><span class="dot-emoji">&#128994;</span>Available for Full-Time Roles</div>
      </div>
    </div>
  </div>
  <div class="hm-bottom">
    <div class="hm-bottom-facts">
      <div>Based in {PERSON['location']}</div>
      <div>5 Years Experience</div>
      <div>Looking for New Challenges</div>
    </div>
    <div class="hm-note">Additional enterprise work available upon request due to NDA.</div>
    <div class="hm-contact">
      <a href="tel:{PERSON['phone'].replace(' ', '')}">{PERSON['phone']}</a>
      <a href="mailto:{PERSON['email']}">{PERSON['email']}</a>
    </div>
  </div>
  <a class="scroll-cue" href="#work">
    <span>Scroll to Explore</span>
    <span class="scroll-cue-line"></span>
  </a>
</section>
"""

    def static_section(cat_slug, num_label, plist, blurb):
        cat = CAT_BY_SLUG[cat_slug]
        return f"""
<section class="discipline-section reveal" id="{'work' if num_label == '01' else cat_slug}">
  <div class="discipline-head">
    <h2>{cat['label']}</h2>
    <p>{blurb}</p>
  </div>
  {grid(plist, "")}
</section>
"""

    gd_section = static_section(
        "graphic-design", "01", gd,
        "A curated selection of brand identity, packaging, editorial, and campaign design projects.",
    )
    mg_section = static_section("motion-graphics", "02", mg, "Kinetic type, brand animation and a full showreel")
    ve_section = static_section("video-editing", "03", ve, "Documentary, commercial and event edits")

    # Topics sidebar (same tag cloud + hover cross-highlight as the category
    # pages), aggregated across every project so it applies as you scroll
    # through all three discipline sections below the hero. Followed by the
    # project names (home page only shows Graphic Design, so this is that
    # category's project list).
    topics = []
    for p in PROJECTS:
        for d in p.get("disciplines", []):
            if d not in topics:
                topics.append(d)
    topic_tags = "".join(f'<span class="topic-tag" data-topic="{d}">{d}</span>' for d in topics)
    gd_index_items = "".join(
        f'<li><a href="case-study/{p["slug"]}.html"><span class="n">{p["index"]:02d}</span> {p["title"]}</a></li>'
        for p in gd
    )
    home_sidebar = f"""
<aside class="sidebar">
  <div class="eyebrow">Topics</div>
  <div class="topic-tags">{topic_tags}</div>
  <div class="eyebrow">Graphic Design Projects</div>
  <ul class="index-list">{gd_index_items}</ul>
  <div style="flex:1"></div>
  <div class="copyright">&copy; 2026 {PERSON['name']}</div>
</aside>
"""

    below_hero = f"""
<div class="page-shell page-shell-no-nav-gap">
{home_sidebar}
<main class="content">
{gd_section}
{footer("")}
</main>
</div>
"""

    full = f"""<!DOCTYPE html>
<html lang="en">
<head>
{HEAD.format(css="", title=f"{PERSON['name']} — {PERSON['title']}")}
</head>
<body>
{nav("", "home")}
<div class="content-full">
{hero}
</div>
{below_hero}
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="js/main.js"></script>
</body>
</html>"""
    write("index.html", full)


# ---------- Category pages (static grids, reached via nav / sidebar / home scroll) ----------
CATEGORY_DESCRIPTIONS = {
    "graphic-design": "A curated selection of brand identity, packaging, editorial, and campaign design projects.",
}


def build_category_page(cat_slug):
    cat = CAT_BY_SLUG[cat_slug]
    plist = projects_in(cat_slug)
    description = CATEGORY_DESCRIPTIONS.get(cat_slug, "")
    description_html = (
        f'<p style="margin-top:16px;color:var(--ink-soft);font-size:1.05rem;max-width:60ch;">{description}</p>'
        if description else ""
    )
    intro = f"""
<div style="padding-top:10px;">
  <div class="eyebrow" style="font-family:var(--font-mono);font-size:.75rem;color:var(--ink-faint);">{cat['label'].upper()}</div>
  <h1 class="serif" style="font-size:clamp(2rem,4vw,3rem);margin-top:8px;">{cat['label']}</h1>
  {description_html}
</div>
"""
    body = intro + f"""
<div class="section-head"><h2>All Projects</h2></div>
{grid(plist, "")}
"""
    write(f"{cat_slug}.html", page_shell("", cat_slug, cat_slug, cat_slug, body, f"{cat['label']} — {PERSON['name']}"))


# ---------- About ----------
def build_about():
    photo_html = ""
    if PERSON.get("photo"):
        photo_html = f'<img class="about-photo hm-anim" style="animation-delay:.1s;" src="{PERSON["photo"]}" alt="{PERSON["name"]}" />'

    body = f"""
<div class="about-hero hm-anim">
  <div class="eyebrow">About</div>
  <h1 class="about-name">{PERSON['name']}</h1>
</div>
<div class="about-layout">
  {photo_html}
  <div class="about-info hm-anim" style="animation-delay:.2s;">
    <p class="about-bio">{PERSON['bio']}</p>
    <div class="about-meta">
      <div>
        <div class="eyebrow">Based In</div>
        <div class="about-meta-value">{PERSON['location']}</div>
      </div>
    </div>
  </div>
</div>
{about_experience_section()}
{about_skills_section()}
"""
    write("about.html", page_shell("", "about", None, None, body, f"About — {PERSON['name']}"))


def about_experience_section():
    items = ""
    for e in PERSON.get("experience", []):
        highlights = "".join(f"<li>{h}</li>" for h in e["highlights"])
        items += f"""
<div class="about-exp-item">
  <div class="about-exp-period">{e['period']}</div>
  <div class="about-exp-body">
    <div class="about-exp-role">{e['role']}</div>
    <div class="about-exp-company">{e['company']} &mdash; {e['location']}</div>
    <ul class="about-exp-highlights">{highlights}</ul>
  </div>
</div>"""

    edu_items = "".join(
        f'<div class="about-edu-item"><div class="about-exp-period">{ed["period"]}</div>'
        f'<div class="about-exp-body"><div class="about-exp-role">{ed["degree"]}</div>'
        f'<div class="about-exp-company">{ed["school"]}</div></div></div>'
        for ed in PERSON.get("education", [])
    )

    return f"""
<section class="about-section">
  <div class="eyebrow">Experience</div>
  <div class="about-exp-list">{items}</div>
</section>
<section class="about-section">
  <div class="eyebrow">Education</div>
  <div class="about-exp-list">{edu_items}</div>
</section>
"""


def about_skills_section():
    skills = "".join(f'<span class="topic-tag">{s}</span>' for s in PERSON.get("skills", []))
    tools = "".join(f'<span class="topic-tag">{t}</span>' for t in PERSON.get("tools", []))
    langs = "".join(
        f'<div class="about-lang-item"><span class="about-lang-name">{l["name"]}</span>'
        f'<span class="about-lang-level">{l["level"]}</span></div>'
        for l in PERSON.get("languages", [])
    )
    return f"""
<section class="about-section">
  <div class="eyebrow">Skills</div>
  <div class="topic-tags about-pills">{skills}</div>
</section>
<section class="about-section">
  <div class="eyebrow">Tools</div>
  <div class="topic-tags about-pills">{tools}</div>
</section>
<section class="about-section">
  <div class="eyebrow">Languages</div>
  <div class="about-lang-list">{langs}</div>
</section>
"""


# ---------- Contact ----------
def build_contact():
    meta_items = [
        ("Location", PERSON["location"]),
        ("Availability", "Open to Full-Time Roles"),
        ("Experience", "5+ Years"),
        ("Phone", f'<a href="tel:{PERSON["phone"].replace(" ", "")}">{PERSON["phone"]}</a>'),
    ]
    meta_html = "".join(
        f'<div><div class="eyebrow">{label}</div><div class="about-meta-value">{value}</div></div>'
        for label, value in meta_items
    )

    body = f"""
<div class="contact-hero hm-anim">
  <div class="eyebrow">Contact</div>
  <h1 class="contact-heading">Let's create something<br>worth remembering.</h1>
  <p class="contact-sub">Looking for my next opportunity to build thoughtful brands, visual systems and campaigns.</p>
</div>
<a class="contact-email hm-anim" style="animation-delay:.15s;" href="mailto:{PERSON['email']}">{PERSON['email']}</a>
<div class="contact-meta hm-anim" style="animation-delay:.25s;">{meta_html}</div>
"""
    write("contact.html", page_shell(
        "", "contact", None, None, body, f"Contact — {PERSON['name']}",
        footer_tagline="Graphic Designer &bull; Brand Identity &bull; Packaging &bull; Editorial Design",
    ))


# ---------- Case studies ----------
def build_case_study(p):
    cat = CAT_BY_SLUG[p["category"]]
    same_cat = projects_in(p["category"])
    idx = same_cat.index(p)
    prev_p = same_cat[idx - 1] if idx > 0 else same_cat[-1]
    next_p = same_cat[(idx + 1) % len(same_cat)]

    role = p.get("role", "Design & Direction")
    cs = p.get("caseStudy")

    if p.get("cover"):
        cover_html = f'<img class="cs-cover" src="../{p["cover"]}" alt="{p["title"]} cover" />'
    else:
        cover_html = f'<div class="cs-cover ph-block tone-{p["tone"]}"></div>'

    if cs:
        body_copy = f"<p>{cs['brief']}</p>\n  <p>{cs['approach']}</p>"
        closing_copy = f"<p>{cs['result']}</p>"
    else:
        body_copy = f"<p>{p['blurb']} This case study placeholder describes the brief, the process, and the outcome. Replace this copy with the real project narrative — challenge, approach, and results.</p>"
        closing_copy = "<p>Additional detail on execution, deliverables, and impact goes here.</p>"

    gallery_html = gallery_html_for(p)

    body = f"""
<div class="cs-hero">
  <div class="eyebrow">{cat['label'].upper()} &middot; {p['index']:02d}/{len(same_cat):02d}</div>
  <h1>{p['title']}</h1>
  <p style="max-width:60ch;margin-top:18px;color:var(--ink-soft);font-size:1.05rem;">{p['blurb']}</p>
  <div class="meta">
    <div><span>Category</span>{cat['label']}</div>
    <div><span>Role</span>{role}</div>
  </div>
</div>
{cover_html}
<div class="cs-body">
  <div class="cs-text">{body_copy}</div>
  {gallery_html}
  <div class="cs-text">{closing_copy}</div>
</div>
"""
    full = f"""<!DOCTYPE html>
<html lang="en">
<head>
{HEAD.format(css="../", title=f"{p['title']} — {cat['label']} — {PERSON['name']}")}
</head>
<body>
{nav("../", None)}
<main class="wrap">
{body}
</main>
<div class="cs-nextprev">
  <a href="{prev_p['slug']}.html">&#8592; {prev_p['title']}</a>
  <a href="../{cat['slug']}.html">All {cat['label']}</a>
  <a href="{next_p['slug']}.html">{next_p['title']} &#8594;</a>
</div>
{footer("../", wrap=True)}
<script src="../js/main.js"></script>
</body>
</html>"""
    write(f"case-study/{p['slug']}.html", full)


def main():
    build_home()
    build_category_page("graphic-design")
    build_category_page("motion-graphics")
    build_category_page("video-editing")
    build_about()
    build_contact()
    for p in PROJECTS:
        build_case_study(p)
    print(f"\nDone. {len(PROJECTS)} case studies generated.")


if __name__ == "__main__":
    main()

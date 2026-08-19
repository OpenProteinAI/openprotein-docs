#!/usr/bin/env python
"""First pass RST -> MDX; run with __old/.pixi/envs/default/bin/python (needs docutils)."""

from __future__ import annotations

import argparse
import json
import posixpath
import re
import sys
from pathlib import Path

from docutils import nodes, utils
from docutils.frontend import get_default_settings
from docutils.parsers.rst import Directive, Parser, directives, roles

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / '__old' / 'source'
DOC_EXT = ('.rst', '.ipynb', '.md')
PROD_URL = re.compile(
    r'^(?:https?://docs\.openprotein\.ai/([^?#\s]*?)(?:\.html)?|/([^?#\s]*?)\.html)(#\S*)?$'
)
DOTTED = re.compile(r'^[A-Za-z_]\w*(?:\.\w+)+$')
SCHEME = re.compile(r'^(?:[a-z][a-z0-9+.-]*:|//)', re.I)
DIVIDER = re.compile(r'^<div class="dot-line"\s*>\s*</div>$')
SENTENCE = re.compile(r'^.*?[.!?](?=\s|$)')
YAML_BARE = re.compile(r'^[A-Za-z0-9][^:#{}\[\]&*!|>\'"%@`]*$')

CALLOUT = {
    'note': 'info',
    'tip': 'idea',
    'hint': 'idea',
    'seealso': 'info',
    'important': 'warn',
    'warning': 'warn',
    'caution': 'warn',
    'attention': 'warn',
    'danger': 'error',
    'error': 'error',
}
CUSTOM_CALLOUT = {'youtube', 'goal', 'disclaimer', 'example', 'git'}
# Sphinx page names are singular where the python module is plural.
PY_PAGE_ALIAS = {'embeddings': 'embedding'}
CONTAINER_CLASS = {'columns': 'grid gap-6 md:grid-cols-3', 'column': ''}


def slug(text: str) -> str:
    """github-slugger, which is what rehype-slug gives the rendered heading."""
    s = re.sub(r'[^\w\- ]+', '', text.strip().lower(), flags=re.UNICODE)
    return s.replace(' ', '-')


def refrag(frag: str) -> str:
    """Re-slugify an inbound anchor; dotted python anchors stay verbatim."""
    frag = frag.lstrip('#')
    if not frag:
        return ''
    if DOTTED.match(frag):
        return frag
    return re.sub(r'[^\w\-]+', '-', frag.lower()).strip('-')


def indent(text: str, width: int) -> str:
    pad = ' ' * width
    return '\n'.join(pad + line if line.strip() else '' for line in text.split('\n'))


def jsx_attr(name: str, value: str) -> str:
    value = re.sub(r'\s+', ' ', value).strip().replace('"', '&quot;')
    return f' {name}="{value}"' if value else ''


def yaml_value(value: str) -> str:
    if YAML_BARE.match(value) and not value.endswith(' '):
        return value
    return '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"'


def code_span(text: str) -> str:
    runs = re.findall(r'`+', text)
    ticks = '`' * ((max(len(r) for r in runs) + 1) if runs else 1)
    pad = ' ' if text.startswith('`') or text.endswith('`') else ''
    return f'{ticks}{pad}{text}{pad}{ticks}'


def md_link(text: str, href: str) -> str:
    if re.search(r'[\s()]', href):
        href = f'<{href}>'
    return f'[{text}]({href})' if text else href


class mdx_block(nodes.General, nodes.Element):
    pass


class mdx_inline(nodes.Inline, nodes.Element):
    pass


class AnyOptions(dict):
    """Accepts every option a Sphinx directive might carry, and stays truthy when empty."""

    def __missing__(self, key):
        return directives.unchanged

    def __bool__(self):
        return True


ANY_OPTION = AnyOptions()


def stub(kind: str, parse: bool = False):
    class Stub(Directive):
        optional_arguments = 1
        final_argument_whitespace = True
        has_content = True
        option_spec = ANY_OPTION

        def run(self):
            node = mdx_block(
                '',
                kind=kind,
                arg=' '.join(self.arguments).strip(),
                opts=dict(self.options),
                raw=list(self.content),
            )
            node.line = self.lineno
            if parse and self.content:
                self.state.nested_parse(self.content, self.content_offset, node)
            return [node]

    return Stub


class CodeBlock(Directive):
    optional_arguments = 1
    has_content = True
    option_spec = ANY_OPTION

    def run(self):
        text = '\n'.join(self.content)
        node = nodes.literal_block(text, text)
        node['language'] = self.arguments[0].strip() if self.arguments else 'text'
        return [node]


def role_stub(kind: str):
    def role(name, rawtext, text, lineno, inliner, options=None, content=None):
        node = mdx_inline(rawtext, kind=kind, raw=utils.unescape(text), role=name)
        node.line = lineno
        return [node], []

    return role


def register() -> None:
    for name in ('code-block', 'sourcecode'):
        directives.register_directive(name, CodeBlock)
    for name in ('dropdown', 'seealso'):
        directives.register_directive(name, stub(name, parse=True))
    for name in ('toctree', 'autoclass', 'autofunction', 'autosummary', 'bibliography', 'include'):
        directives.register_directive(name, stub(name))
    for name in ('py:class', 'py:meth', 'py:attr', 'py:func', 'py:obj', 'py:mod', 'class'):
        roles.register_local_role(name, role_stub('py'))
    roles.register_local_role('doc', role_stub('doc'))
    roles.register_local_role('ref', role_stub('ref'))
    for name in ('cite:year', 'cite:t', 'cite:p', 'cite'):
        roles.register_local_role(name, role_stub('cite'))


def parse_rst(path: Path):
    text = path.read_text(encoding='utf8')
    settings = get_default_settings(Parser)
    settings.report_level = 5
    settings.halt_level = 5
    settings.sectsubtitle_xform = False
    settings.raw_enabled = True
    settings.file_insertion_enabled = True
    doc = utils.new_document(str(path), settings)
    Parser().parse(text, doc)
    return doc, text


def title_of(section) -> str:
    title = section.next_node(nodes.title)
    return title.astext() if title else ''


def notebook_title(path: Path) -> str:
    """First markdown heading of a notebook, used for link text and the sidebar."""
    try:
        cells = json.loads(path.read_text(encoding='utf8')).get('cells', [])
    except (ValueError, OSError):
        return ''
    for cell in cells:
        source = cell.get('source', '')
        text = source if isinstance(source, str) else ''.join(source)
        match = re.search(r'^#{1,3}\s+(.+)$', text, re.M)
        if cell.get('cell_type') == 'markdown' and match:
            return match.group(1).strip()
    return ''


def route_of(docname: str) -> str:
    if docname == 'index':
        return '/'
    if docname.endswith('/index'):
        return '/' + docname[: -len('/index')]
    return '/' + docname


def doc_title_node(doc):
    """The page title, plus the section whose heading it came from (if any)."""
    for child in doc.children:
        if isinstance(child, nodes.title):
            return child.astext(), None
        if isinstance(child, nodes.section):
            return title_of(child), child
    return '', None


def toctree_entries(node) -> list[tuple[str, str]]:
    out = []
    for line in node['raw']:
        line = line.strip()
        if not line or line.startswith(':'):
            continue
        m = re.match(r'^(.*?)\s*<(.+?)>$', line)
        title, target = (m.group(1).strip(), m.group(2).strip()) if m else ('', line)
        out.append((title, target))
    return out


class Manifest:
    def __init__(self):
        self.docs: dict[str, dict] = {}
        self.labels: dict[str, dict] = {}
        self.folders: dict[str, str] = {}
        self.toctrees: dict[str, list[tuple[str, str]]] = {}

    def build(self) -> None:
        for path in sorted(SRC.rglob('*.ipynb')):
            docname = path.relative_to(SRC).with_suffix('').as_posix()
            self.docs[docname] = {
                'route': route_of(docname),
                'title': notebook_title(path) or path.stem,
                'kind': 'ipynb',
            }
        for path in sorted(SRC.rglob('*.rst')):
            docname = path.relative_to(SRC).with_suffix('').as_posix()
            doc, _ = parse_rst(path)
            title, _ = doc_title_node(doc)
            self.docs[docname] = {'route': route_of(docname), 'title': title, 'kind': 'rst'}
            self._labels(doc, docname)
            trees = [n for n in doc.findall(mdx_block) if n['kind'] == 'toctree']
            entries = [e for tree in trees for e in toctree_entries(tree)]
            if entries:
                self.toctrees[docname] = entries
        for docname, entries in self.toctrees.items():
            base = posixpath.dirname(docname)
            for title, target in entries:
                if not title or target == 'self':
                    continue
                resolved = self.resolve_doc(target, docname)
                if resolved and resolved.endswith('/index'):
                    self.folders[posixpath.dirname(resolved)] = title
            if base and base not in self.folders:
                self.folders.setdefault(base, self.docs.get(docname, {}).get('title', ''))

    def _labels(self, doc, docname: str) -> None:
        """Explicit '.. _label:' targets and every section's implicit name."""
        names = {}
        title, title_section = doc_title_node(doc)
        for section in doc.findall(nodes.section):
            anchor = '' if section is title_section else slug(title_of(section))
            for name in section['names']:
                names[name] = anchor
        uris = {}
        for target in doc.findall(nodes.target):
            if not target['names']:
                continue
            entry = {'docname': docname, 'anchor': '', 'title': title}
            uri = target.get('refuri')
            for name in target['names']:
                if uri:  # named external targets are document-local in Sphinx
                    uris[name] = uri
                    continue
                section = self._nearest_section(target)
                if section is not None and section is not title_section:
                    entry = dict(entry, anchor=slug(title_of(section)), title=title_of(section))
                self.labels[name] = entry
        self.docs[docname]['names'] = names
        self.docs[docname]['uris'] = uris

    @staticmethod
    def _nearest_section(target):
        parent = target.parent
        siblings = list(parent.children)
        for node in siblings[siblings.index(target) + 1 :]:
            if isinstance(node, nodes.section):
                return node
            if isinstance(node, nodes.title):
                return None
        while parent is not None:
            if isinstance(parent, nodes.section):
                return parent
            parent = parent.parent
        return None

    def resolve_doc(self, target: str, from_doc: str) -> str | None:
        """Sphinx :doc: semantics: absolute from source root, or relative to this page."""
        target = target.strip()
        for ext in DOC_EXT:
            if target.endswith(ext):
                target = target[: -len(ext)]
        if not target:
            return None
        if target == 'self':
            return from_doc
        base = posixpath.dirname(from_doc)
        if target.startswith('/'):
            candidates = [target.lstrip('/')]
        elif target.startswith(('./', '../')):
            candidates = [posixpath.normpath(posixpath.join(base, target))]
        else:
            candidates = [posixpath.normpath(posixpath.join(base, target)), target]
        for candidate in candidates:
            for name in (candidate, candidate + '/index'):
                if name in self.docs:
                    return name
        return None

    def route(self, docname: str) -> str:
        return self.docs[docname]['route']

    def as_json(self) -> dict:
        return {
            'docs': {
                name: {k: v for k, v in info.items() if k not in ('names', 'uris')}
                for name, info in sorted(self.docs.items())
            },
            'labels': dict(sorted(self.labels.items())),
            'folders': dict(sorted(self.folders.items())),
            'toctrees': {k: [list(e) for e in v] for k, v in sorted(self.toctrees.items())},
        }


class Converter:
    def __init__(self, man: Manifest, docname: str, path: Path):
        self.man = man
        self.docname = docname
        self.path = path
        self.rel = path.as_posix().replace(ROOT.as_posix() + '/', '')
        self.doc, text = parse_rst(path)
        self.lines = text.split('\n')
        self.cursor: dict[str, int] = {}
        self.raw_html = 0
        self.errors: list[dict] = []
        self.warns: list[dict] = []
        self.title_section = None

    def find_line(self, needle: str, node=None) -> int:
        start = self.cursor.get(needle, 0)
        for i in range(start, len(self.lines)):
            if needle in self.lines[i]:
                self.cursor[needle] = i + 1
                return i + 1
        return getattr(node, 'line', None) or 0

    def error(self, target: str, note: str, node=None) -> None:
        self.errors.append(
            {'ref': target, 'note': note, 'file': self.rel, 'line': self.find_line(target, node)}
        )

    def warn(self, target: str, note: str, node=None) -> None:
        self.warns.append(
            {'ref': target, 'note': note, 'file': self.rel, 'line': self.find_line(target, node)}
        )

    def doc_href(self, target: str, node=None) -> str | None:
        target, _, frag = target.partition('#')
        docname = self.man.resolve_doc(target, self.docname)
        if docname is None:
            return None
        href = self.man.route(docname)
        anchor = refrag(frag)
        return f'{href}#{anchor}' if anchor else href

    def uri_href(self, uri: str, node=None) -> str:
        uri = uri.strip()
        if uri.startswith('#'):
            return '#' + refrag(uri)
        prod = PROD_URL.match(uri)
        if prod:
            docname = self.man.resolve_doc('/' + (prod.group(1) or prod.group(2)), self.docname)
            if docname:
                anchor = refrag(prod.group(3) or '')
                route = self.man.route(docname)
                return f'{route}#{anchor}' if anchor else route
            self.error(uri, 'old site URL has no matching page', node)
            return uri
        bare = uri.partition('#')[0]
        if bare.endswith(DOC_EXT):
            href = self.doc_href(uri, node)
            if href:
                if bare.endswith('.md') and not (SRC / self.docname).parent.joinpath(bare).exists():
                    self.warn(uri, f'.md link was broken upstream; resolved to {href}', node)
                return href
            self.error(uri, 'link target is not a page in the old source', node)
            return uri
        return uri

    def name_href(self, refname: str, node=None) -> str:
        doc = self.man.docs.get(self.docname, {})
        if refname in doc.get('uris', {}):
            return self.uri_href(doc['uris'][refname], node)
        label = self.man.labels.get(refname)
        local = doc.get('names', {})
        if refname in local:
            anchor = local[refname]
            return f'#{anchor}' if anchor else self.man.route(self.docname)
        if label and label['docname'] in self.man.docs:
            route = self.man.route(label['docname'])
            return f"{route}#{label['anchor']}" if label['anchor'] else route
        self.error(refname, 'no target or section with this name', node)
        return '#' + slug(refname)

    def py_href(self, dotted: str, node=None) -> str | None:
        parts = dotted.split('.')
        if len(parts) < 2:
            self.warn(dotted, 'py role target has no module; left as code', node)
            return None
        module = parts[1] if parts[1][:1].islower() else 'openprotein'
        module = PY_PAGE_ALIAS.get(module, module)
        base = 'python-api/api-reference/'
        for name in (base + module, base + module[:-1]):
            if name in self.man.docs:
                return f'{self.man.route(name)}#{dotted}'
        self.warn(dotted, 'no api-reference page for this module', node)
        return None

    def escape(self, text: str) -> str:
        for char in ('\\', '<', '{', '*', '[', ']'):
            text = text.replace(char, '\\' + char)
        if text.count('`') % 2:  # an unpaired backtick would swallow the rest of the line
            text = text.replace('`', '\\`')
        return text

    def inline(self, node) -> str:
        return ''.join(self.inline_node(child) for child in node.children)

    def inline_node(self, node) -> str:
        if isinstance(node, nodes.Text):
            return self.escape(node.astext())
        if isinstance(node, mdx_inline):
            return self.role(node)
        if isinstance(node, nodes.emphasis):
            return f'*{self.inline(node)}*'
        if isinstance(node, nodes.strong):
            return f'**{self.inline(node)}**'
        if isinstance(node, nodes.title_reference):
            if re.match(r'^[^<>]+<\S+>$', node.astext().strip()):
                self.warn(node.astext(), 'single backticks: link markup is broken upstream', node)
            return code_span(node.astext())
        if isinstance(node, nodes.literal):
            return code_span(node.astext())
        if isinstance(node, nodes.subscript):
            return f'<sub>{self.inline(node)}</sub>'
        if isinstance(node, nodes.superscript):
            return f'<sup>{self.inline(node)}</sup>'
        if isinstance(node, nodes.image):
            return self.image_md(node)
        if isinstance(node, nodes.reference):
            return md_link(self.inline(node) or self.escape(node.astext()), self.ref_href(node))
        if isinstance(node, nodes.citation_reference):
            return f'<Cite id="{node.astext()}" />'
        if isinstance(node, nodes.footnote_reference):
            return f'[^{node.astext()}]'
        if isinstance(node, nodes.raw):
            return node.astext() if node.get('format') == 'html' else ''
        if isinstance(node, nodes.problematic):
            return self.escape(node.astext())
        if isinstance(node, (nodes.target, nodes.system_message, nodes.comment)):
            return ''
        if isinstance(node, nodes.line_break):
            return '  \n'
        return self.inline(node) if node.children else self.escape(node.astext())

    def ref_href(self, node) -> str:
        if node.get('refuri'):
            return self.uri_href(node['refuri'], node)
        refname = node.get('refname') or nodes.fully_normalize_name(node.astext())
        return self.name_href(refname, node)

    def role(self, node) -> str:
        kind, raw = node['kind'], node['raw']
        m = re.match(r'^(.*?)\s*<(.+?)>$', raw, re.S)
        label, target = (m.group(1).strip(), m.group(2).strip()) if m else ('', raw.strip())
        if kind == 'cite':
            return f'<Cite id="{target}" />'
        if kind == 'py':
            dotted = target.lstrip('~!')
            href = self.py_href(dotted, node)
            text = label or (dotted.split('.')[-1] if target.startswith('~') else dotted)
            return md_link(code_span(text), href) if href else code_span(text)
        if kind == 'doc':
            href = self.doc_href(target, node)
            if href is None:
                self.error(target, ':doc: target is not a page in the old source', node)
                return self.escape(label or target)
            docname = self.man.resolve_doc(target.partition('#')[0], self.docname)
            return md_link(self.escape(label or self.man.docs[docname]['title'] or target), href)
        if kind == 'ref':
            name = nodes.fully_normalize_name(target)
            href = self.name_href(name, node)
            fallback = self.man.labels.get(name, {}).get('title') or target
            return md_link(self.escape(label or fallback), href)
        return self.escape(raw)

    def image_src(self, uri: str) -> str:
        if SCHEME.match(uri) or uri.startswith('/'):
            return uri
        return '/' + re.sub(r'^(?:\.\./|\./)+', '', uri)

    def image_md(self, node) -> str:
        alt = re.sub(r'[\[\]]', '', node.get('alt', ''))
        return f"![{alt}]({self.image_src(node['uri'])})"

    def blocks(self, children) -> list[str]:
        out: list[str] = []
        kids = list(children)
        i = 0
        while i < len(kids):
            node = kids[i]
            if self.is_dropdown(node):
                run = []
                while i < len(kids) and (self.is_dropdown(kids[i]) or self.is_divider(kids[i])):
                    run.append(kids[i])
                    i += 1
                while run and self.is_divider(run[-1]):
                    kids.insert(i, run.pop())
                out.append(self.accordions(run))
                continue
            text = self.block(node)
            if text:
                out.append(text)
            i += 1
        return out

    @staticmethod
    def is_dropdown(node) -> bool:
        return isinstance(node, mdx_block) and node['kind'] == 'dropdown'

    @staticmethod
    def is_divider(node) -> bool:
        """Decorative FAQ separator between dropdowns; kept as a review comment."""
        return isinstance(node, nodes.raw) and bool(DIVIDER.match(node.astext().strip()))

    def body(self, children, width: int = 2) -> str:
        return indent('\n\n'.join(self.blocks(children)), width)

    def block(self, node) -> str:
        if isinstance(node, nodes.section):
            return self.section(node)
        if isinstance(node, nodes.paragraph):
            return self.inline(node)
        if isinstance(node, nodes.compound):
            return '\n\n'.join(self.blocks(node.children))
        if isinstance(node, (nodes.bullet_list, nodes.enumerated_list)):
            return self.list_block(node)
        if isinstance(node, nodes.definition_list):
            return self.definition_list(node)
        if isinstance(node, nodes.literal_block):
            return self.literal_block(node)
        if isinstance(node, nodes.doctest_block):
            return f"```python\n{node.astext()}\n```"
        if isinstance(node, nodes.block_quote):
            return '\n'.join(
                ('> ' + line) if line else '>'
                for line in '\n\n'.join(self.blocks(node.children)).split('\n')
            )
        if isinstance(node, nodes.figure):
            return self.figure(node)
        if isinstance(node, nodes.image):
            return self.image_md(node)
        if isinstance(node, nodes.table):
            return self.table(node)
        if isinstance(node, nodes.rubric):
            return f'**{self.inline(node)}**'
        if isinstance(node, nodes.container):
            return self.container(node)
        if isinstance(node, nodes.raw):
            return self.raw(node)
        if isinstance(node, nodes.transition):
            return '---'
        if isinstance(node, nodes.field_list):
            return '\n\n'.join(
                f"**{f[0].astext()}**: {self.inline(f[1])}" for f in node.children if len(f) > 1
            )
        if isinstance(node, (nodes.note, nodes.tip, nodes.hint, nodes.warning, nodes.important,
                             nodes.caution, nodes.attention, nodes.danger, nodes.error,
                             nodes.admonition)):
            return self.callout(node)
        if isinstance(node, mdx_block):
            return self.mdx(node)
        if isinstance(node, nodes.system_message):
            if int(node.get('level', 0)) >= 2:
                text = node.astext().split('\n')[0].split('.rst:')[-1]
                self.warn(text, 'docutils parse message', node)
            return ''
        if isinstance(node, (nodes.comment, nodes.target, nodes.substitution_definition,
                             nodes.citation, nodes.footnote, nodes.title)):
            return ''
        return '\n\n'.join(self.blocks(node.children)) if node.children else ''

    def section(self, node) -> str:
        depth, inside, parent = 0, False, node
        while parent is not None:
            depth += isinstance(parent, nodes.section)
            inside = inside or parent is self.title_section and parent is not node
            parent = parent.parent
        level = max(2, min(depth + 1 - int(inside), 6))
        parts = [] if node is self.title_section else [
            '#' * level + ' ' + self.inline(node.next_node(nodes.title))
        ]
        parts += self.blocks([c for c in node.children if not isinstance(c, nodes.title)])
        return '\n\n'.join(p for p in parts if p)

    def list_block(self, node) -> str:
        ordered = isinstance(node, nodes.enumerated_list)
        items, loose = [], False
        for i, item in enumerate(node.children, start=1):
            marker = f'{i}. ' if ordered else '- '
            parts = self.blocks(item.children)
            loose = loose or len(parts) > 1
            text = indent('\n\n'.join(parts), len(marker))
            items.append(marker + text[len(marker):])
        return ('\n\n' if loose else '\n').join(items)

    def definition_list(self, node) -> str:
        out = []
        for item in node.children:
            term = item.next_node(nodes.term)
            definition = item.next_node(nodes.definition)
            text = self.inline(term) if term is not None else ''
            out.append(text if '**' in text else f'**{text}**' if text else '')
            if definition is not None:
                out += self.blocks(definition.children)
        return '\n\n'.join(p for p in out if p)

    def literal_block(self, node) -> str:
        # conf.py sets highlight_language = python, so bare '::' blocks are python.
        lang = node.get('language') or ('' if 'code' in node.get('classes', []) else 'python')
        fence = '`' * max(3, len(max(re.findall(r'`+', node.astext()) or [''], key=len)) + 1)
        return f'{fence}{lang}\n{node.astext()}\n{fence}'

    def figure(self, node) -> str:
        image = node.next_node(nodes.image)
        caption = node.next_node(nodes.caption)
        if image is None:
            return ''
        if caption is None:
            return self.image_md(image)
        attrs = jsx_attr('src', self.image_src(image['uri']))
        attrs += jsx_attr('alt', image.get('alt', '')) + jsx_attr('caption', caption.astext())
        return f'<Figure{attrs} />'

    def table(self, node) -> str:
        group = node.next_node(nodes.tgroup)
        if group is None:
            return ''
        cols = int(group.get('cols') or 0)
        head, body = [], []
        for child in group.children:
            if isinstance(child, nodes.thead):
                head += [self.cells(row) for row in child.children]
            elif isinstance(child, nodes.tbody):
                body += [self.cells(row) for row in child.children]
        cols = max([cols] + [len(r) for r in head + body])
        header = head[0] if head else [''] * cols
        rows = head[1:] + body
        pad = lambda row: row + [''] * (cols - len(row))
        out = ['| ' + ' | '.join(pad(header)) + ' |', '| ' + ' | '.join(['---'] * cols) + ' |']
        out += ['| ' + ' | '.join(pad(row)) + ' |' for row in rows]
        title = node.next_node(nodes.title)
        return (f'**{self.inline(title)}**\n\n' if title else '') + '\n'.join(out)

    def cells(self, row) -> list[str]:
        out = []
        for entry in row.children:
            text = '<br />'.join(self.blocks(entry.children))
            text = re.sub(r'\s*\n\s*', '<br />', text).replace('|', '\\|')
            out.append(text.strip())
        return out

    def container(self, node) -> str:
        inner = '\n\n'.join(self.blocks(node.children))
        for cls in node.get('classes', []):
            if cls in CONTAINER_CLASS:
                attr = jsx_attr('className', CONTAINER_CLASS[cls])
                return f'<div{attr}>\n\n{indent(inner, 2)}\n\n</div>'
        return inner

    def raw(self, node) -> str:
        if node.get('format') != 'html':
            return ''
        html = node.astext().strip()
        if DIVIDER.match(html):
            return f'{{/* RAW HTML - REVIEW: {html} */}}'
        self.raw_html += 1
        return f'{{/* RAW HTML - REVIEW */}}\n{html}\n{{/* END RAW HTML */}}'

    def callout(self, node, kind: str = '', title: str = '') -> str:
        classes = [c for c in node.get('classes', []) if c not in ('admonition',)]
        kind = kind or next((c for c in classes if c in CALLOUT or c in CUSTOM_CALLOUT), '')
        kind = kind or node.__class__.__name__
        ctype = CALLOUT.get(kind, kind if kind in CUSTOM_CALLOUT else 'info')
        title_node = node.next_node(nodes.title)
        title = title or (title_node.astext() if title_node else '')
        children = [c for c in node.children if not isinstance(c, nodes.title)]
        attrs = jsx_attr('type', ctype) + jsx_attr('title', title)
        return f'<Callout{attrs}>\n{self.body(children)}\n</Callout>'

    def accordions(self, run) -> str:
        items = []
        for node in run:
            if self.is_divider(node):
                items.append(self.raw(node))
                continue
            title = node['arg']
            children = list(node.children)
            if not title and children and isinstance(children[0], nodes.paragraph):
                title = children.pop(0).astext()
            title = re.sub(r'\*\*|``', '', title).strip()
            body = self.body(children)
            items.append(f'<Accordion{jsx_attr("title", title)}>\n{body}\n</Accordion>')
        return '<Accordions>\n' + indent('\n\n'.join(items), 2) + '\n</Accordions>'

    def mdx(self, node) -> str:
        kind, arg = node['kind'], node['arg']
        if kind == 'toctree':
            return ''
        if kind == 'seealso':
            return self.callout(node, kind='seealso', title='See also')
        if kind == 'autoclass':
            return f'<PyClass{jsx_attr("path", arg)} />'
        if kind == 'autofunction':
            return f'<PyFunction{jsx_attr("path", arg)} />'
        if kind == 'autosummary':
            paths = [l.strip() for l in node['raw'] if l.strip() and not l.strip().startswith(':')]
            return '<PyModuleSummary paths={' + json.dumps(paths) + '} />'
        if kind == 'bibliography':
            files = arg.split() or [l.strip() for l in node['raw'] if l.strip()]
            return '<Bibliography files={' + json.dumps([Path(f).name for f in files]) + '} />'
        if kind == 'include':
            target = arg if arg.startswith(('./', '../', '/')) else './' + arg
            return '<include>' + re.sub(r'\.(rst|md)$', '.mdx', target) + '</include>'
        return ''

    def frontmatter(self, title: str, description: str, extra: dict) -> str:
        lines = [f'title: {yaml_value(title)}'] if title else []
        if not (lines or description or extra):
            return ''
        if description:
            lines.append(f'description: {yaml_value(description)}')
        for key, value in extra.items():
            lines.append(f'{key}: {yaml_value(value) if value else "true"}')
        return '---\n' + '\n'.join(lines) + '\n---'

    def describe(self, children) -> str:
        for child in children:
            for node in child.findall(nodes.paragraph):
                text = re.sub(r'\s*\(\s*\)', '', re.sub(r'\s+', ' ', node.astext())).strip()
                if not text:
                    continue
                match = SENTENCE.match(text)
                text = match.group(0) if match else text
                if len(text) > 160:
                    text = text[:157].rsplit(' ', 1)[0] + '...'
                return text
        return ''

    def convert(self) -> str:
        title, self.title_section = doc_title_node(self.doc)
        if not title:  # untitled index pages inherit the title their parent toctree gave them
            title = self.man.folders.get(posixpath.dirname(self.docname), '')
        extra = {}
        children = []
        for child in self.doc.children:
            if isinstance(child, nodes.field_list) and not children:
                for field in child.children:
                    value = field[1].astext().strip() if len(field) > 1 else ''
                    extra[field[0].astext().strip()] = value
                continue
            children.append(child)
        body = '\n\n'.join(self.blocks(children))
        if self.raw_html:
            self.warn(f'{self.raw_html} raw html blocks',
                      'kept verbatim; hand-review before this page will compile')
        head = self.frontmatter(title, self.describe(children), extra)
        page = f'{head}\n\n{body}\n' if head else f'{body}\n'
        return page.replace('\n\n\n', '\n\n')


def meta_files(man: Manifest) -> dict[str, dict]:
    """toctrees never reach the body; they become one meta.json per directory."""
    out = {}
    for docname, entries in man.toctrees.items():
        folder = posixpath.dirname(docname)
        pages = [] if not folder else ['index']
        for _, target in entries:
            resolved = man.resolve_doc(target, docname)
            if resolved is None or resolved == docname:
                continue
            rel = posixpath.relpath(resolved, folder) if folder else resolved
            rel = rel[: -len('/index')] if rel.endswith('/index') else rel
            if rel not in pages:
                pages.append(rel)
        meta = {}
        if man.folders.get(folder):
            meta['title'] = man.folders[folder]
        meta['pages'] = pages
        out[posixpath.join(folder, 'meta.json') if folder else 'meta.json'] = meta
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description='Convert the old Sphinx RST into MDX (first pass).')
    ap.add_argument('paths', nargs='*', help='.rst files to convert')
    ap.add_argument('--all', action='store_true', help='convert every .rst under __old/source')
    ap.add_argument('--out', default='content/docs', help='output root (default content/docs)')
    ap.add_argument('--dry-run', action='store_true', help='print instead of writing (default)')
    ap.add_argument('--write', action='store_true', help='actually write files')
    ap.add_argument('--manifest', action='store_true', help='dump the route and label tables')
    args = ap.parse_args()

    register()
    man = Manifest()
    man.build()

    if args.manifest:
        print(json.dumps(man.as_json(), indent=2))
        return 0

    if args.all:
        targets = sorted(SRC.rglob('*.rst'))
    else:
        targets = [Path(p).resolve() for p in args.paths]
    if not targets:
        ap.error('pass .rst paths or --all')

    write = args.write and not args.dry_run
    out_root = ROOT / args.out
    errors, warns, failed = [], [], []
    written = 0
    for path in targets:
        under_src = path.as_posix().startswith(SRC.as_posix() + '/')
        docname = path.relative_to(SRC).with_suffix('').as_posix() if under_src else path.stem
        try:
            conv = Converter(man, docname, path)
            text = conv.convert()
        except Exception as exc:
            failed.append({'ref': docname, 'note': f'{exc.__class__.__name__}: {exc}'})
            continue
        errors += conv.errors
        warns += conv.warns
        dest = out_root / f'{docname}.mdx'
        if write:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(text, encoding='utf8')
            written += 1
        elif not args.all:
            print(f'--- {dest.relative_to(ROOT)} ---')
            print(text)

    metas = meta_files(man)
    if write:
        for rel, meta in metas.items():
            dest = out_root / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(json.dumps(meta, indent=2) + '\n', encoding='utf8')
            written += 1

    def line(status, label, detail):
        print(f'{status.ljust(5)} {label.ljust(17)} {detail}')

    line('FAIL' if failed else 'ok', 'converted',
         f'{len(targets) - len(failed)}/{len(targets)} files, {len(failed)} crashed')
    line('FAIL' if errors else 'ok', 'internal links', f'{len(errors)} unresolved')
    if warns:
        line('WARN', 'review', f'{len(warns)} notes')
    line('ok', 'meta.json', f'{len(metas)} directories'
         + ('' if write else ' (not written; pass --write)'))
    if write:
        line('ok', 'written', f'{written} files under {args.out}')

    def where(entry):
        return f"{entry['file']}:{entry['line']}" if entry['line'] else entry['file']

    for entry in failed:
        print(f"\n  FAIL  convert: {entry['ref']}\n        {entry['note']}")
    for entry in errors:
        print(f"\n  FAIL  unresolved: {entry['ref']}\n        {entry['note']}"
              f"\n        {where(entry)}")
    for entry in warns:
        print(f"\n  WARN  {entry['ref']}\n        {entry['note']}\n        {where(entry)}")

    if failed or errors:
        print(f'\nFAIL {len(failed)} crashes, {len(errors)} unresolved internal links.')
        return 1
    print('\nok all pages converted and every internal link resolved.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

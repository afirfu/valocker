"""Build a VaLocker .docx that matches balorasi.docx table 1 dimensions."""

from __future__ import annotations

import io
import zipfile
from xml.sax.saxutils import escape

NS_W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
NS_R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

# First table in balorasi.docx
PAGE_W = 16838
PAGE_H = 11906
MARGIN = 1440
TABLE_W = 11448
TABLE_IND = 1259
GRID = (1101, 1984, 1984, 2126, 2127, 2126)
CORNER_W = GRID[0] + GRID[1]
GUN_FILL = "FFFFFF"
EMPTY_FILL = "D9D9D9"
NO_SKIN = "(No skin available)"
LABEL_FILL = {
    "red": "F7CAAC",
    "blue": "BDD6EE",
    "green": "C5E0B3",
    "yellow": "FFE599",
}
LABEL_FAMILY = {
    "warpath": "red",
    "beastly": "red",
    "archetype": "blue",
    "derivation": "blue",
    "minimal": "green",
    "technological": "green",
    "whimsical": "yellow",
    "cartoonish": "yellow",
}

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""

RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""

DOC_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>
"""

STYLES = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles {NS_W}>
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="259" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont">
    <w:name w:val="Default Paragraph Font"/>
  </w:style>
  <w:style w:type="table" w:default="1" w:styleId="TableNormal">
    <w:name w:val="Normal Table"/>
    <w:tblPr>
      <w:tblInd w:w="0" w:type="dxa"/>
      <w:tblCellMar>
        <w:top w:w="0" w:type="dxa"/>
        <w:left w:w="108" w:type="dxa"/>
        <w:bottom w:w="0" w:type="dxa"/>
        <w:right w:w="108" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:basedOn w:val="TableNormal"/>
    <w:pPr>
      <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      </w:tblBorders>
    </w:tblPr>
  </w:style>
</w:styles>
"""

SETTINGS = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings {NS_W}>
  <w:zoom w:percent="100"/>
</w:settings>
"""

CORE = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>VaLocker</dc:title>
  <dc:creator>VaLocker</dc:creator>
</cp:coreProperties>
"""

APP = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>VaLocker</Application>
</Properties>
"""


def _run(text: str, *, bold: bool = False, italic: bool = False, font: str | None = None) -> str:
    rpr = []
    if font:
        rpr.append(f'<w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:cs="{font}"/>')
    if bold:
        rpr.append("<w:b/><w:bCs/>")
    if italic:
        rpr.append("<w:i/><w:iCs/>")
    props = f"<w:rPr>{''.join(rpr)}</w:rPr>" if rpr else ""
    space = ' xml:space="preserve"' if text[:1].isspace() or text[-1:].isspace() else ""
    return f"<w:r>{props}<w:t{space}>{escape(text)}</w:t></w:r>"


def _p(runs: str, *, bold: bool = False, italic: bool = False, center: bool = False, font: str | None = None) -> str:
    rpr = []
    if font:
        rpr.append(f'<w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:cs="{font}"/>')
    if bold:
        rpr.append("<w:b/><w:bCs/>")
    if italic:
        rpr.append("<w:i/><w:iCs/>")
    jc = '<w:jc w:val="center"/>' if center else ""
    props = f"<w:pPr>{jc}<w:rPr>{''.join(rpr)}</w:rPr></w:pPr>" if (rpr or jc) else ""
    return f"<w:p>{props}{runs}</w:p>"


def _empty_p(*, bold: bool = False) -> str:
    rpr = "<w:rPr><w:b/><w:bCs/></w:rPr>" if bold else ""
    return f"<w:p><w:pPr>{rpr}</w:pPr></w:p>"


def _tc(width: int, paras: str, *, span: int | None = None, vmerge: str | None = None, fill: str | None = None, slash: bool = False) -> str:
    bits = [f'<w:tcW w:w="{width}" w:type="dxa"/>']
    if span:
        bits.append(f'<w:gridSpan w:val="{span}"/>')
    if vmerge == "restart":
        bits.append('<w:vMerge w:val="restart"/>')
    elif vmerge == "continue":
        bits.append("<w:vMerge/>")
    if slash:
        bits.append('<w:tcBorders><w:tl2br w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tcBorders>')
    if fill:
        bits.append(f'<w:shd w:val="clear" w:color="auto" w:fill="{fill}"/>')
    return f"<w:tc><w:tcPr>{''.join(bits)}</w:tcPr>{paras}</w:tc>"


def _header_row() -> str:
    corner = _tc(
        CORNER_W,
        _p(_run("Rarity", bold=True), bold=True, center=True) + _p(_run("Guns", bold=True), bold=True, center=True),
        span=2,
        slash=True,
    )
    ultra = _tc(
        GRID[2],
        _p(_run("Ultra", bold=True) + _run("/ Exclusive", bold=True), bold=True)
        + _p(_run("//with ", bold=True) + _run("Finisher", bold=True), bold=True),
    )
    prem_f = _tc(
        GRID[3],
        _p(_run("Premium", bold=True), bold=True)
        + _p(_run("//with ", bold=True) + _run("Finisher", bold=True), bold=True),
    )
    prem = _tc(
        GRID[4],
        _p(_run("Premium", bold=True), bold=True) + _p(_run("//no finisher", bold=True), bold=True),
    )
    select = _tc(
        GRID[5],
        _p(_run("Select/ Deluxe", bold=True), bold=True) + _p(_run("//no finisher", bold=True), bold=True),
    )
    return f"<w:tr>{corner}{ultra}{prem_f}{prem}{select}</w:tr>"


def _skin_cell(cell: dict) -> str:
    available = bool(cell.get("available", True))
    text = str(cell.get("text") or "").strip()
    family = LABEL_FAMILY.get(str(cell.get("color") or ""), "")
    slant = bool(cell.get("slant"))
    bold = bool(cell.get("bold"))
    if not available:
        return _tc(0, _p(_run(NO_SKIN)), fill=EMPTY_FILL)  # width set by caller
    fill = LABEL_FILL.get(family)
    if not text:
        return _tc(0, _empty_p(), fill=fill)
    return _tc(0, _p(_run(text, bold=bold, italic=slant), bold=bold, italic=slant), fill=fill)


def _fix_width(cell_xml: str, width: int) -> str:
    return cell_xml.replace('<w:tcW w:w="0" w:type="dxa"/>', f'<w:tcW w:w="{width}" w:type="dxa"/>', 1)


def _body_rows(groups: list[dict]) -> str:
    rows = []
    for group in groups:
        label = str(group.get("label") or "")
        guns = group.get("rows") or []
        for index, row in enumerate(guns):
            cells = []
            if index == 0:
                cells.append(_tc(GRID[0], _p(_run(label, bold=True), bold=True), vmerge="restart"))
            else:
                cells.append(_tc(GRID[0], _empty_p(bold=True), vmerge="continue"))
            gun = str(row.get("gun") or "")
            cells.append(_tc(GRID[1], _p(_run(gun, bold=True), bold=True), fill=GUN_FILL))
            skin_cells = row.get("cells") or []
            for col, width in enumerate(GRID[2:]):
                raw = skin_cells[col] if col < len(skin_cells) else {}
                cells.append(_fix_width(_skin_cell(raw if isinstance(raw, dict) else {}), width))
            rows.append(f"<w:tr>{''.join(cells)}</w:tr>")
    return "".join(rows)


def _document_xml(username: str, groups: list[dict]) -> str:
    name = _p(_run(username, bold=True, font="Arial"), bold=True, font="Arial")
    grid = "".join(f'<w:gridCol w:w="{width}"/>' for width in GRID)
    tbl = (
        f"<w:tbl>"
        f"<w:tblPr>"
        f'<w:tblStyle w:val="TableGrid"/>'
        f'<w:tblW w:w="{TABLE_W}" w:type="dxa"/>'
        f'<w:tblInd w:w="{TABLE_IND}" w:type="dxa"/>'
        f'<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
        f"</w:tblPr>"
        f"<w:tblGrid>{grid}</w:tblGrid>"
        f"{_header_row()}"
        f"{_body_rows(groups)}"
        f"</w:tbl>"
    )
    sect = (
        f"<w:sectPr>"
        f'<w:pgSz w:w="{PAGE_W}" w:h="{PAGE_H}" w:orient="landscape"/>'
        f'<w:pgMar w:top="{MARGIN}" w:right="{MARGIN}" w:bottom="{MARGIN}" w:left="{MARGIN}" w:header="708" w:footer="708" w:gutter="0"/>'
        f"</w:sectPr>"
    )
    return (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:document {NS_W} {NS_R}>'
        f"<w:body>{name}{tbl}{sect}</w:body>"
        f"</w:document>"
    )


def sanitize_groups(raw: object) -> list[dict]:
    if not isinstance(raw, list) or not raw:
        raise ValueError("Nothing to export")
    if len(raw) > 12:
        raise ValueError("Export is too large")
    groups = []
    for group in raw:
        if not isinstance(group, dict):
            continue
        rows_in = group.get("rows")
        if not isinstance(rows_in, list) or not rows_in:
            continue
        if len(rows_in) > 24:
            raise ValueError("Export is too large")
        rows = []
        for row in rows_in:
            if not isinstance(row, dict):
                continue
            cells_in = row.get("cells") if isinstance(row.get("cells"), list) else []
            cells = []
            for cell in cells_in[:4]:
                if not isinstance(cell, dict):
                    cell = {}
                cells.append(
                    {
                        "text": str(cell.get("text") or "")[:80],
                        "available": bool(cell.get("available", True)),
                        "color": str(cell.get("color") or "")[:32],
                        "slant": bool(cell.get("slant")),
                        "bold": bool(cell.get("bold")),
                    }
                )
            while len(cells) < 4:
                cells.append({"text": "", "available": True, "color": "", "slant": False, "bold": False})
            rows.append({"gun": str(row.get("gun") or "")[:40], "cells": cells})
        if rows:
            groups.append({"label": str(group.get("label") or "")[:40], "rows": rows})
    if not groups:
        raise ValueError("Nothing to export")
    return groups


def build_locker_docx(username: str, groups: list[dict]) -> bytes:
    document = _document_xml(username, groups)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES)
        zf.writestr("_rels/.rels", RELS)
        zf.writestr("word/_rels/document.xml.rels", DOC_RELS)
        zf.writestr("word/document.xml", document)
        zf.writestr("word/styles.xml", STYLES)
        zf.writestr("word/settings.xml", SETTINGS)
        zf.writestr("docProps/core.xml", CORE)
        zf.writestr("docProps/app.xml", APP)
    return buf.getvalue()

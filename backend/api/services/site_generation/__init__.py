# Site Generation subpackage
from .generator import generate_config
from .normalizer import _normalize_config, _normalize_catalog
from .section_mappers import (
    VALID_SECTION_TYPES,
    LAYOUT_STYLES,
    CONTENT_TYPES,
    _default_layout,
    _hero_section,
    _overlay_section,
    _columns_section,
    _gallery_section,
    _testimonials_section,
    _stats_section,
)

__all__ = [
    "generate_config",
    "_normalize_config",
    "_normalize_catalog",
    "VALID_SECTION_TYPES",
    "LAYOUT_STYLES",
    "CONTENT_TYPES",
    "_default_layout",
    "_hero_section",
    "_overlay_section",
    "_columns_section",
    "_gallery_section",
    "_testimonials_section",
    "_stats_section",
]

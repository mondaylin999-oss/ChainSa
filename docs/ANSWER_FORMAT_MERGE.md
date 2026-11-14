# Contributor answer-format merge

Merged origin/feature/earthlens-site-8-section-chat while preserving the current Home and Explore Map frontend, township navigation, EARTHBEAT, back button and collapsed topic categories.

The current chat panel uses StructuredAnswer: a three-part summary, NASA evidence tables, evidence-based action cards and six collapsible detailed sections. The chat no longer requires an AI provider key to enable submission; the server supplies deterministic evidence-based template answers when no provider is configured. Optional provider and verification behavior from the branch remains supported.

The branch also contributes MODIS NDVI support and its API adapters. MODIS retrieval failures remain explicit; a successful live MODIS response has not been verified in this merge.

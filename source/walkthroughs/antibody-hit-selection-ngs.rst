============================================
Antibody hit selection from NGS data
============================================

A recommended end-to-end workflow for selecting antibody hits from an NGS-derived
library on the **Dataset Assay Details** page. Each step assumes the previous
step's output is in place.

This walkthrough is task-oriented. For a feature-by-feature reference of the
controls used below — Predict, Clustering, Advanced Filters, and the Antibody
settings panel — see :doc:`/web-app/opmodels/dataset-assay`.

.. figure:: /_static/walkthroughs/antibody-hit-selection-ngs/dataset-assay-overview.png
   :alt: Dataset Assay Details page overview, showing tabs, header chips, and action bar


Step 0 — Prepare the dataset
============================

Upload the NGS-derived antibody library as an assay dataset. The platform
auto-annotates antibody datasets (germline assignment, CDR3 extraction,
mutation counts). Wait for the dataset status to reach *SUCCESS* before
continuing.

.. note::

   Once the dataset reaches *SUCCESS*, a default UMAP job is queued
   automatically — you'll see it appear in the Jobs panel without having to
   trigger it. The **UMAP** tab will be empty until that job finishes.


Step 1 — Configure the antibody view
====================================

On the **Dataset** tab, open the **Antibody** panel:

1. Pick **IMGT** as the numbering scheme (matches most NGS annotation tools).
2. Tick **Show CDR1 / CDR2 / CDR3** so regions are visually obvious in the
   table.
3. Tick **Aligned** (and **Trim non-standard positions**) so VH and VL line up
   across rows — required for visual comparison and for the *Liabilities*
   column.
4. Click **Customize columns** and enable: *Heavy V-Gene*, *Light V-Gene*,
   *Germline pair*, *Total Mutations*, *CDR3 length*, *Germline distance (%)*,
   *Liabilities*.

You now have a fully annotated table view of the library.


Step 2 — Reduce redundancy with Clustering
==========================================

NGS libraries are dominated by closely related clones. Cluster first so
downstream steps operate on diverse families.

1. **Cluster → New clustering.**
2. Pick **PoET-2** (chain-aware; works for heavy:light pairs).
3. Leave **Reduction = Mean**, **Linkage = Ward**, **Metric = Euclidean**
   unless you have a reason to change.
4. Submit. When the chip turns active, open the chip and tune **Number of
   clusters** while watching the UMAP — choose a number that visually
   separates populations.

You now have a ``Cluster Number`` column.


Step 3 — Pre-filter using NGS / antibody metadata
=================================================

Open **Advanced Filters** from the Dataset tab and stack:

1. **Quality / abundance gate.** Filter on read count or replicate measurement
   (e.g. ``count ≥ N``) to drop singletons.
2. **Drop liability-heavy clones** *(optional).* If the *Liabilities* column
   flags many rows, sort by it and exclude the worst.
3. **Germline focus** *(optional but common).* Filter on **Heavy V-Gene** /
   **Light V-Gene** or **Germline Pair** to focus on a developability-friendly
   germline family.
4. **Mutation window.** Filter on **Total Mutations** (e.g. ``≥ 3`` to skip
   naive sequences, or ``≤ 15`` to skip over-mutated clones) — or use
   **Germline distance (%)** if your sequences differ in length.
5. **CDR3 length window.** Filter on **CDR3 Length** to enforce a length range
   that suits your therapeutic format.
6. **Diversity by cluster.** Add ``Group by = Cluster Number`` and
   ``Top K per group = 1–5``, sorted by your strongest assay readout. This
   guarantees one (or a few) representatives per family so the candidate list
   spans the library.

Toggle **Show select column** if you want to see what got rejected instead of
hiding it.


Step 4 — Score with Predict
===========================

With the candidate set narrowed, run a model to rank within it.

1. **Predict → New prediction.**
2. If you have a trained user model for the property you care about (binding,
   expression, developability), pick it under *User models*.
3. Otherwise, on antibody datasets the **Recommended for you** tab proposes
   preset PoET-2 configurations using the dataset itself as the prompt
   context — a good default when you have no labels yet.
4. Submit. A **Predict** chip appears and a score column is added.

You can run multiple predictions in parallel — for example, one for binding
and one for developability. Each gets its own chip and its own column.


Step 5 — Combine signals
========================

Add another filter card on top of the existing stack:

- **Column =** ``<your prediction>`` **· Operator =** ``≥`` **· Value =**
  ``<threshold>``

Or sort: **Sort by** ``<prediction>`` **Desc**, **Top K = 96**.

If you ran two predictions, stack two filter cards (one per score) to require
both signals — e.g. high binding score AND high developability score.


Step 6 — Inspect visually
=========================

- **UMAP** — points coloured by cluster; the prediction score is selectable
  as a colour axis. Confirm the surviving candidates are spread across the
  embedding space, not collapsed in one corner.
- **Joint plot** — pairwise relationships, e.g. prediction score vs. CDR3
  length, or score-A vs. score-B.
- Plots respect the active filters: hidden rows are dimmed; selected rows are
  highlighted. Selecting points in the UMAP also selects the corresponding
  rows in the table, and vice versa.

.. figure:: /_static/walkthroughs/antibody-hit-selection-ngs/umap-clusters-vs-prediction.png
   :alt: UMAP coloured by Cluster Number, and the same UMAP coloured by a prediction score

.. figure:: /_static/walkthroughs/antibody-hit-selection-ngs/joint-plot-two-scores.png
   :alt: Joint plot with two prediction scores as axes


Step 7 — Export the hit list
============================

Back on the Dataset tab, the visible (or selected) rows are your shortlist.
From here you can:

- Train a new model on the selected rows (footer **Train model** action) for
  an iterative round.
- Export the table for ordering / wet-lab follow-up.


Quick decision guide
====================

.. list-table::
   :header-rows: 1
   :widths: 50 50

   * - Goal
     - Use
   * - See CDRs / aligned heavy + light side-by-side
     - **Antibody panel** → CDR checkboxes + Aligned + IMGT
   * - Add germline / mutation columns to the table
     - **Antibody panel** → Customize columns
   * - Remove near-duplicate clones from NGS
     - **Cluster** + filter ``Top K per Cluster Number``
   * - Restrict to a germline family
     - **Advanced Filter** on ``Heavy V-Gene`` / ``Germline Pair``
   * - Filter out clones with developability liabilities
     - **Antibody panel** → enable *Liabilities* column, then sort/exclude
   * - Rank by predicted property
     - **Predict** + sort by score column
   * - Combine binding + developability
     - Two **Predict** runs + two filter cards
   * - See structure of the library
     - **UMAP** tab, coloured by ``Cluster Number`` or a prediction score
   * - See pairwise tradeoffs
     - **Joint plot** with two prediction scores as axes

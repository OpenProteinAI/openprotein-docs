# Upstream `openprotein-python` docstring defects

Generated — do not hand-edit. Regenerate with:

```
pnpm sync:pyapi          # then
.venv-pyapi/bin/python scripts/pyapi/generate.py --upstream > scripts/pyapi/UPSTREAM.md
```

Measured against `openprotein-python 0.16.1` (commit `85dc94bd15a3`). These are reproduced faithfully in the rendered docs, because the docs are not the place to silently correct the SDK — but each is worth filing upstream.

## Return type drifts from the annotation (26)

napoleon prints the docstring's type, so the live Sphinx site published the left-hand
column. `typing.List`/`Dict`/`Tuple`/`Set`/`Optional` spellings are normalised away first.

| member | docstring says | annotated as |
|---|---|---|
| `openprotein.design.DesignAPI.list_designs` | `list of DesignFuture` | `list[DesignFuture]` |
| `openprotein.design.DesignFuture.stream` | `Generator` | `Iterator[DesignResult]` |
| `openprotein.embeddings.EmbeddingsAPI.get_model` | `ProtembedModel` | `EmbeddingModel` |
| `openprotein.embeddings.EmbeddingsGenerateFuture.stream` | `Generator` | `Iterator[Score]` |
| `openprotein.embeddings.EmbeddingsGenerateFuture.wait` | `Any` | `list[V]` |
| `openprotein.embeddings.EmbeddingsResultFuture.stream` | `Generator` | `Iterator[tuple[K, V]]` |
| `openprotein.embeddings.EmbeddingsResultFuture.wait` | `Any` | `list[tuple[K, V]]` |
| `openprotein.embeddings.EmbeddingsScoreFuture.stream` | `Generator` | `Iterator[Score]` |
| `openprotein.embeddings.EmbeddingsScoreFuture.wait` | `Any` | `list[V]` |
| `openprotein.embeddings.PoET2Model.single_site` | `EmbeddingsScoreFuture` | `EmbeddingsScoreSingleSiteFuture` |
| `openprotein.embeddings.future.EmbeddingsScoreSingleSiteFuture.stream` | `Generator` | `Iterator[SingleSiteScore]` |
| `openprotein.embeddings.future.EmbeddingsScoreSingleSiteFuture.wait` | `Any` | `list[V]` |
| `openprotein.fold.AlphaFold2Model.fold` | `Job` | `FoldResultFuture` |
| `openprotein.fold.FoldResultFuture.get_affinity` | `list[list[BoltzAffinity]]` | `list[BoltzAffinity]` |
| `openprotein.fold.FoldResultFuture.get_item` | `Complex` | `FoldResult` |
| `openprotein.fold.FoldResultFuture.stream` | `Generator` | `Iterator[Structure] \| Iterator[np.ndarray] \| Iterator[pd.DataFrame] \| Iterator[BoltzAffinity] \| Iterator[list[BoltzConfidence]] \| Iterator[list[ProtenixConfidence]] \| Iterator[list[ESMFold2Confidence]]` |
| `openprotein.fold.FoldResultFuture.wait` | `Any` | `list[tuple[K, V]]` |
| `openprotein.jobs.Future.wait` | `Any` | `V` |
| `openprotein.models.BoltzGenFuture.stream` | `Generator` | `Iterator[Complex]` |
| `openprotein.models.BoltzGenFuture.wait` | `Any` | `list[tuple[K, V]]` |
| `openprotein.models.RFdiffusionFuture.stream` | `Generator` | `Iterator[Complex]` |
| `openprotein.models.RFdiffusionFuture.wait` | `Any` | `list[tuple[K, V]]` |
| `openprotein.predictor.PredictorModel.get_assay` | `AssayDataset: Assay dataset used for train job.` | `AssayDataset` |
| `openprotein.prompt.Prompt.wait` | `Any` | `V` |
| `openprotein.svd.SVDModel.wait` | `Any` | `Self` |
| `openprotein.umap.UMAPModel.wait` | `Any` | `V` |

## griffe warnings (10)

Raised on every `sync:pyapi`. A documented parameter that is not in the signature, or a
documented parameter with no type.

```
openprotein/align/align.py:391: Parameter 'job' does not appear in the function signature
openprotein/align/align.py:407: Parameter 'job' does not appear in the function signature
openprotein/embeddings/embeddings.py:131: Parameter 'model_id' does not appear in the function signature
openprotein/fold/future.py:294: Parameter 'sequence' does not appear in the function signature
openprotein/models/foundation/boltzgen.py:224: Parameter 'n' does not appear in the function signature
openprotein/models/foundation/esmif1.py:136: No types or annotations for parameters ['**kwargs']
openprotein/models/foundation/esmif1.py:136: Parameter '**kwargs' does not appear in the function signature
openprotein/models/foundation/rfdiffusion.py:209: Parameter 'n' does not appear in the function signature
openprotein/svd/models.py:169: No types or annotations for parameters ['reduction']
openprotein/svd/models.py:169: Parameter 'reduction' does not appear in the function signature
```

## Documented parameter/return types that disagree with the annotation (7)

The live Sphinx site printed the docstring's type; we print the annotation, because it
is what the code enforces. Where the two disagree the docstring is stale — including two
that are malformed (a default glued into the type, and a trailing comma) and one whose
return description is indented under the underline so the whole line reads as the type.

| member | parameter | docstring says | annotated as |
|---|---|---|---|
| `openprotein.fold.Boltz2Model.fold` | `properties` | `list[dict] \| None = None` | `Sequence[Mapping] \| None` |
| `openprotein.fold.Boltz2Model.fold` | `templates` | `list[Protein \| Complex \| Template] \| None = None` | `Sequence[Protein \| Complex \| Template] \| None` |
| `openprotein.fold.ProtenixModel.fold` | `templates` | `list[Protein \| Complex \| Template] \| None = None` | `Sequence[Protein \| Complex \| Template] \| None` |
| `openprotein.fold.RosettaFold3Model.fold` | `sequences` | `list[Complex \| Protein \| str \| bytes] \| MSAFuture,` | `Sequence[Complex \| Protein \| str \| bytes] \| MSAFuture` |
| `openprotein.molecules.Template.validate_for_target` | `target` | `Protein \| Complex` | `TargetMolecule` |
| `openprotein.predictor.PredictorModel.get_assay` | `-> return` | `Assay dataset used for train job.` | `AssayDataset: Assay dataset used for train job.` |
| `openprotein.svd.SVDModel.fit_umap` | `reduction` | `ReductionType \| None` | `(none)` |

## Methods with an annotated return type and no `Returns:` section (38)

Not a defect in the SDK so much as a gap: `autodoc_typehints_description_target =
"documented"` meant the live site **withheld** these return types, because only a
documented return gets one. We print the annotation instead — strictly more information,
and a deliberate deviation recorded in the skill. Documenting them upstream would make
the two agree.

- `openprotein.embeddings.EmbeddingsAPI.list_models`
- `openprotein.fold.FoldAPI.list_models`
- `openprotein.fold.FoldResultFuture.get_affinity_batch`
- `openprotein.fold.FoldResultFuture.get_confidence_batch`
- `openprotein.fold.FoldResultFuture.get_ipae_batch`
- `openprotein.fold.FoldResultFuture.get_pae_batch`
- `openprotein.fold.FoldResultFuture.get_pde_batch`
- `openprotein.fold.FoldResultFuture.get_plddt_batch`
- `openprotein.fold.FoldResultFuture.get_ptm_batch`
- `openprotein.jobs.JobsAPI.get`
- `openprotein.jobs.JobsAPI.list`
- `openprotein.models.BoltzGenFuture.get_item`
- `openprotein.models.RFdiffusionFuture.get_item`
- `openprotein.molecules.Complex.to_string`
- `openprotein.molecules.Protein.at`
- `openprotein.molecules.Protein.formatted`
- `openprotein.molecules.Protein.from_filepath`
- `openprotein.molecules.Protein.get_structure_mask`
- `openprotein.molecules.Protein.mask_sequence`
- `openprotein.molecules.Protein.mask_sequence_at`
- `openprotein.molecules.Protein.mask_sequence_except_at`
- `openprotein.molecules.Protein.mask_structure`
- `openprotein.molecules.Protein.mask_structure_at`
- `openprotein.molecules.Protein.mask_structure_except_at`
- `openprotein.molecules.Protein.to_string`
- `openprotein.molecules.Structure.to_string`
- `openprotein.molecules.Template.validate_for_target`
- `openprotein.predictor.PredictorModel.crossvalidate`
- `openprotein.predictor.PredictorModel.delete`
- `openprotein.predictor.PredictorModel.get_model`
- `openprotein.predictor.PredictorModel.predict`
- `openprotein.predictor.PredictorModel.single_site`
- `openprotein.prompt.Prompt.get_as_complexes`
- `openprotein.prompt.Prompt.get_as_proteins`
- `openprotein.prompt.Query.get_as_complex`
- `openprotein.prompt.Query.get_as_protein`
- `openprotein.svd.SVDModel.delete`
- `openprotein.umap.UMAPModel.delete`

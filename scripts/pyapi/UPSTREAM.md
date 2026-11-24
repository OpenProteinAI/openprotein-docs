# Upstream `openprotein-python` docstring defects

Generated — do not hand-edit. Regenerate with:

```
.venv-pyapi/bin/python scripts/pyapi/generate.py --upstream
```

Measured against `openprotein-python 0.17.1.dev284+gc410c2fe4` (commit `c410c2fe442a`). These are reproduced faithfully in the rendered docs, because the docs are not the place to silently correct the SDK — but each is worth filing upstream.

## Return type drifts from the annotation (56)

napoleon prints the docstring's type, so the live Sphinx site published the left-hand
column. `typing.List`/`Dict`/`Tuple`/`Set`/`Optional` spellings are normalised away first.

| member | docstring says | annotated as |
|---|---|---|
| `openprotein.clustering.HierarchicalClusteringFuture.wait` | `Any` | `V` |
| `openprotein.data.DataAPI.list` | `List[AssayDataset]` | `builtins.list[AssayDataset]` |
| `openprotein.design.DesignAPI.list_designs` | `list of DesignFuture` | `list[DesignFuture]` |
| `openprotein.design.DesignConstraint.as_dict` | `dict of int to list of str` | `dict[int, list[str]]` |
| `openprotein.design.DesignConstraint.initialize` | `dict of int to set of str` | `dict[int, set[str]]` |
| `openprotein.design.DesignFuture.stream` | `Generator` | `Iterator[DesignResult]` |
| `openprotein.design.DesignFuture.wait` | `Any` | `list[V]` |
| `openprotein.embeddings.EmbeddingsAPI.get_model` | `ProtembedModel` | `EmbeddingModel` |
| `openprotein.embeddings.EmbeddingsGenerateFuture.get` | `list` | `list[V]` |
| `openprotein.embeddings.EmbeddingsGenerateFuture.stream` | `Generator` | `Iterator[Score]` |
| `openprotein.embeddings.EmbeddingsGenerateFuture.wait` | `Any` | `list[V]` |
| `openprotein.embeddings.EmbeddingsResultFuture.get` | `list` | `list[V]` |
| `openprotein.embeddings.EmbeddingsResultFuture.stream` | `Generator` | `Iterator[tuple[K, V]]` |
| `openprotein.embeddings.EmbeddingsResultFuture.wait` | `Any` | `list[tuple[K, V]]` |
| `openprotein.embeddings.EmbeddingsScoreFuture.get` | `list` | `list[V]` |
| `openprotein.embeddings.EmbeddingsScoreFuture.stream` | `Generator` | `Iterator[Score]` |
| `openprotein.embeddings.EmbeddingsScoreFuture.wait` | `Any` | `list[V]` |
| `openprotein.embeddings.PoET2Model.single_site` | `EmbeddingsScoreFuture` | `EmbeddingsScoreSingleSiteFuture` |
| `openprotein.embeddings.future.BaseScoreFuture.get` | `list` | `list[V]` |
| `openprotein.embeddings.future.EmbeddingsScoreSingleSiteFuture.get` | `list` | `list[V]` |
| `openprotein.embeddings.future.EmbeddingsScoreSingleSiteFuture.stream` | `Generator` | `Iterator[SingleSiteScore]` |
| `openprotein.embeddings.future.EmbeddingsScoreSingleSiteFuture.wait` | `Any` | `list[V]` |
| `openprotein.fold.AlphaFold2Model.fold` | `Job` | `FoldResultFuture` |
| `openprotein.fold.FoldResultFuture.get_affinity` | `list[list[BoltzAffinity]]` | `list[BoltzAffinity]` |
| `openprotein.fold.FoldResultFuture.get_item` | `Structure or np.ndarray or pd.DataFrame or BoltzAffinity or list` | `FoldResult` |
| `openprotein.fold.FoldResultFuture.stream` | `Generator` | `Iterator[Structure] \| Iterator[np.ndarray] \| Iterator[pd.DataFrame] \| Iterator[BoltzAffinity] \| Iterator[list[BoltzConfidence]] \| Iterator[list[ProtenixConfidence]] \| Iterator[list[ESMFold2Confidence]]` |
| `openprotein.fold.FoldResultFuture.wait` | `Any` | `list[tuple[K, V]]` |
| `openprotein.jobs.Future.wait` | `Any` | `V` |
| `openprotein.jobs.MappedFuture.stream` | `Generator` | `Iterator[tuple[K, V]]` |
| `openprotein.jobs.MappedFuture.wait` | `Any` | `list[tuple[K, V]]` |
| `openprotein.jobs.StreamingFuture.stream` | `Generator` | `Iterator[V]` |
| `openprotein.jobs.StreamingFuture.wait` | `Any` | `list[V]` |
| `openprotein.models.BoltzGen.generate` | `StructureDesignFuture` | `futures.StructureDesignFuture` |
| `openprotein.models.BoltzGenFuture.stream` | `Generator` | `Iterator[Complex]` |
| `openprotein.models.BoltzGenFuture.wait` | `Any` | `list[tuple[K, V]]` |
| `openprotein.models.GPModel.crossvalidate` | `CrossvalidateFuture` | `futures.CrossvalidateFuture` |
| `openprotein.models.RFdiffusion.generate` | `StructureDesignFuture` | `futures.StructureDesignFuture` |
| `openprotein.models.RFdiffusionFuture.stream` | `Generator` | `Iterator[Complex]` |
| `openprotein.models.RFdiffusionFuture.wait` | `Any` | `list[tuple[K, V]]` |
| `openprotein.models.StructureGenerationFuture.stream` | `Generator` | `Iterator[Complex]` |
| `openprotein.models.StructureGenerationFuture.wait` | `Any` | `list[tuple[K, V]]` |
| `openprotein.models.StructureGenerativeModel.generate` | `StructureDesignFuture` | `futures.StructureDesignFuture` |
| `openprotein.predictor.PredictionResultFuture.get` | `np.ndarray` | `tuple[np.ndarray, np.ndarray]` |
| `openprotein.predictor.PredictionResultFuture.get` | `np.ndarray` | `tuple[np.ndarray, np.ndarray]` |
| `openprotein.predictor.PredictionResultFuture.get_item` | `np.ndarray` | `tuple[np.ndarray, np.ndarray]` |
| `openprotein.predictor.PredictionResultFuture.get_item` | `np.ndarray` | `tuple[np.ndarray, np.ndarray]` |
| `openprotein.predictor.PredictionResultFuture.wait` | `Any` | `V` |
| `openprotein.predictor.PredictorModel.get_assay` | `AssayDataset: Assay dataset used for train job.` | `AssayDataset` |
| `openprotein.predictor.validate.CVResultFuture.get` | `tuple of np.ndarray` | `tuple[np.ndarray, np.ndarray, np.ndarray]` |
| `openprotein.predictor.validate.CVResultFuture.wait` | `Any` | `V` |
| `openprotein.prompt.Prompt.wait` | `Any` | `V` |
| `openprotein.svd.SVDAPI.list_svd` | `list of SVDModel` | `list[SVDModel]` |
| `openprotein.svd.SVDEmbeddingsResultFuture.stream` | `Generator` | `Iterator[tuple[K, V]]` |
| `openprotein.svd.SVDModel.wait` | `Any` | `Self` |
| `openprotein.umap.UMAPEmbeddingsResultFuture.stream` | `Generator` | `Iterator[tuple[K, V]]` |
| `openprotein.umap.UMAPModel.wait` | `Any` | `V` |

## griffe warnings (5)

Raised on every `sync:pyapi`. A documented parameter that is not in the signature, or a
documented parameter with no type.

```
openprotein/align/align.py:492: Parameter 'job' does not appear in the function signature
openprotein/align/align.py:508: Parameter 'job' does not appear in the function signature
openprotein/base.py:177: No matching parameter for '\*\*kwargs'
openprotein/base.py:177: Parameter '\*\*kwargs' does not appear in the function signature
openprotein/embeddings/embeddings.py:158: Parameter 'model_id' does not appear in the function signature
```

## Documented parameter/return types that disagree with the annotation (24)

The live Sphinx site printed the docstring's type; we print the annotation, because it
is what the code enforces. Where the two disagree the docstring is stale — including two
that are malformed (a default glued into the type, and a trailing comma) and one whose
return description is indented under the underline so the whole line reads as the type.

| member | parameter | docstring says | annotated as |
|---|---|---|---|
| `openprotein.align.AlignAPI.abnumber_file` | `file` | `file-like object` | `file-like object, bytes, bytearray, str, tuple or list` |
| `openprotein.align.AlignAPI.clustalo_file` | `file` | `file-like object` | `file-like object, bytes, bytearray, str, tuple or list` |
| `openprotein.align.AlignAPI.mafft_file` | `file` | `file-like object` | `file-like object, bytes, bytearray, str, tuple or list` |
| `openprotein.align.AlignAPI.upload_msa` | `msa_file` | `str` | `BinaryIO` |
| `openprotein.embeddings.PoET2Model.indel` | `decoder_type` | `{'mlm', 'clm'} or None, optional` | `clm` |
| `openprotein.embeddings.PoET2Model.score` | `decoder_type` | `{'mlm', 'clm'} or None, optional` | `clm` |
| `openprotein.embeddings.PoET2Model.single_site` | `decoder_type` | `{'mlm', 'clm'} or None, optional` | `clm` |
| `openprotein.fold.AlphaFold2Model.fold` | `sequences` | `Sequence[Complex \| Protein \| str \| bytes] \| MSAFuture` | `FoldInput \| MSAFuture` |
| `openprotein.fold.Boltz1Model.fold` | `sequences` | `Sequence[Complex \| Protein \| str \| bytes] \| MSAFuture` | `FoldInput \| MSAFuture` |
| `openprotein.fold.Boltz1xModel.fold` | `sequences` | `Sequence[Complex \| Protein \| str \| bytes] \| MSAFuture` | `FoldInput \| MSAFuture` |
| `openprotein.fold.Boltz2Model.fold` | `properties` | `list[dict] \| None = None` | `Sequence[Mapping] \| None` |
| `openprotein.fold.Boltz2Model.fold` | `sequences` | `Sequence[Complex \| Protein \| str \| bytes] \| MSAFuture` | `FoldInput \| MSAFuture` |
| `openprotein.fold.Boltz2Model.fold` | `templates` | `list[Protein \| Complex \| Template] \| None = None` | `Sequence[Protein \| Complex \| Template] \| None` |
| `openprotein.fold.ESMFold2FastModel.fold` | `sequences` | `Sequence[Complex \| Protein \| str \| bytes]` | `FoldInput` |
| `openprotein.fold.ESMFold2Model.fold` | `sequences` | `Sequence[Complex \| Protein \| str \| bytes] \| MSAFuture` | `FoldInput \| MSAFuture` |
| `openprotein.fold.ESMFoldModel.fold` | `sequences` | `Sequence[Complex \| Protein \| str \| bytes]` | `FoldInput` |
| `openprotein.fold.FoldResultFuture.get_item` | `-> return` | `Complex` | `Structure or np.ndarray or pd.DataFrame or BoltzAffinity or list` |
| `openprotein.fold.MiniFoldModel.fold` | `sequences` | `Sequence[bytes \| str]` | `FoldInput` |
| `openprotein.fold.ProtenixModel.fold` | `sequences` | `Sequence[Complex \| Protein \| str \| bytes] \| MSAFuture` | `FoldInput \| MSAFuture` |
| `openprotein.fold.ProtenixModel.fold` | `templates` | `list[Protein \| Complex \| Template] \| None = None` | `Sequence[Protein \| Complex \| Template] \| None` |
| `openprotein.fold.RosettaFold3Model.fold` | `sequences` | `list[Complex \| Protein \| str \| bytes] \| MSAFuture,` | `FoldInput \| MSAFuture` |
| `openprotein.molecules.Template.validate_for_target` | `target` | `Protein \| Complex` | `TargetMolecule` |
| `openprotein.predictor.PredictorModel.get_assay` | `-> return` | `Assay dataset used for train job.` | `AssayDataset: Assay dataset used for train job.` |
| `openprotein.svd.SVDModel.fit_umap` | `sequences` | `List[bytes]` | `list[bytes] \| list[str] \| None` |

## Methods with an annotated return type and no `Returns:` section (357)

Not a defect in the SDK so much as a gap: `autodoc_typehints_description_target =
"documented"` meant the live site **withheld** these return types, because only a
documented return gets one. We print the annotation instead — strictly more information,
and a deliberate deviation recorded in the skill. Documenting them upstream would make
the two agree.

- `openprotein.clustering.ClusteringAPI.get`
- `openprotein.clustering.ClusteringAPI.hierarchical`
- `openprotein.clustering.ClusteringAPI.list`
- `openprotein.clustering.HierarchicalClusteringFuture.delete`
- `openprotein.clustering.HierarchicalClusteringFuture.get`
- `openprotein.clustering.HierarchicalClusteringFuture.redispatch`
- `openprotein.data.MSA.delete`
- `openprotein.data.MSA.download`
- `openprotein.data.MSA.update`
- `openprotein.data.MSADataAPI.delete`
- `openprotein.data.MSADataAPI.download`
- `openprotein.data.MSADataAPI.get`
- `openprotein.data.MSADataAPI.list`
- `openprotein.data.MSADataAPI.update`
- `openprotein.data.PromptsAPI.delete`
- `openprotein.data.PromptsAPI.get`
- `openprotein.data.PromptsAPI.list`
- `openprotein.data.PromptsAPI.update`
- `openprotein.data.prompts.Prompt.delete`
- `openprotein.data.prompts.Prompt.download`
- `openprotein.data.prompts.Prompt.replicates`
- `openprotein.data.prompts.Prompt.update`
- `openprotein.data.prompts.PromptFuture.get`
- `openprotein.data.prompts.PromptFuture.get_item`
- `openprotein.data.prompts.PromptFuture.iter_outputs`
- `openprotein.data.prompts.PromptFuture.iter_units`
- `openprotein.data.prompts.PromptFuture.stream`
- `openprotein.data.prompts.PromptFuture.unit`
- `openprotein.data.prompts.PromptFuture.wait`
- `openprotein.design.DesignConstraint.allow`
- `openprotein.design.DesignConstraint.remove`
- `openprotein.design.DesignFuture.get`
- `openprotein.embeddings.EmbeddingsAPI.list_models`
- `openprotein.fold.FoldAPI.list_models`
- `openprotein.fold.FoldResultFuture.get`
- `openprotein.fold.FoldResultFuture.get_affinity_batch`
- `openprotein.fold.FoldResultFuture.get_confidence_batch`
- `openprotein.fold.FoldResultFuture.get_ipae_batch`
- `openprotein.fold.FoldResultFuture.get_pae_batch`
- `openprotein.fold.FoldResultFuture.get_pde_batch`
- `openprotein.fold.FoldResultFuture.get_plddt_batch`
- `openprotein.fold.FoldResultFuture.get_ptm_batch`
- `openprotein.jobs.AttentionFuture.get`
- `openprotein.jobs.AttentionFuture.get_item`
- `openprotein.jobs.AttentionFuture.iter_outputs`
- `openprotein.jobs.AttentionFuture.iter_units`
- `openprotein.jobs.AttentionFuture.stream`
- `openprotein.jobs.AttentionFuture.unit`
- `openprotein.jobs.AttentionFuture.wait`
- `openprotein.jobs.CrossvalidateFuture.get`
- `openprotein.jobs.CrossvalidateFuture.get_item`
- `openprotein.jobs.CrossvalidateFuture.iter_outputs`
- `openprotein.jobs.CrossvalidateFuture.iter_units`
- `openprotein.jobs.CrossvalidateFuture.stream`
- `openprotein.jobs.CrossvalidateFuture.unit`
- `openprotein.jobs.CrossvalidateFuture.wait`
- `openprotein.jobs.EmbeddingFuture.get`
- `openprotein.jobs.EmbeddingFuture.get_item`
- `openprotein.jobs.EmbeddingFuture.iter_outputs`
- `openprotein.jobs.EmbeddingFuture.iter_units`
- `openprotein.jobs.EmbeddingFuture.stream`
- `openprotein.jobs.EmbeddingFuture.unit`
- `openprotein.jobs.EmbeddingFuture.wait`
- `openprotein.jobs.FitFuture.get`
- `openprotein.jobs.FitFuture.wait`
- `openprotein.jobs.Future.get`
- `openprotein.jobs.FutureUnit.done`
- `openprotein.jobs.FutureUnit.get`
- `openprotein.jobs.FutureUnit.wait`
- `openprotein.jobs.GPFitFuture.get`
- `openprotein.jobs.GPFitFuture.get_item`
- `openprotein.jobs.GPFitFuture.iter_outputs`
- `openprotein.jobs.GPFitFuture.iter_units`
- `openprotein.jobs.GPFitFuture.stream`
- `openprotein.jobs.GPFitFuture.unit`
- `openprotein.jobs.GPFitFuture.wait`
- `openprotein.jobs.IndelScoreFuture.get`
- `openprotein.jobs.IndelScoreFuture.get_item`
- `openprotein.jobs.IndelScoreFuture.iter_outputs`
- `openprotein.jobs.IndelScoreFuture.iter_units`
- `openprotein.jobs.IndelScoreFuture.stream`
- `openprotein.jobs.IndelScoreFuture.unit`
- `openprotein.jobs.IndelScoreFuture.wait`
- `openprotein.jobs.Job.create`
- `openprotein.jobs.JobsAPI.get`
- `openprotein.jobs.JobsAPI.get_job_output`
- `openprotein.jobs.JobsAPI.iter_job_outputs`
- `openprotein.jobs.JobsAPI.iter_job_units`
- `openprotein.jobs.JobsAPI.list`
- `openprotein.jobs.JobsAPI.update`
- `openprotein.jobs.LogLikelihoodFuture.get`
- `openprotein.jobs.LogLikelihoodFuture.get_item`
- `openprotein.jobs.LogLikelihoodFuture.iter_outputs`
- `openprotein.jobs.LogLikelihoodFuture.iter_units`
- `openprotein.jobs.LogLikelihoodFuture.stream`
- `openprotein.jobs.LogLikelihoodFuture.unit`
- `openprotein.jobs.LogLikelihoodFuture.wait`
- `openprotein.jobs.LogitsFuture.get`
- `openprotein.jobs.LogitsFuture.get_item`
- `openprotein.jobs.LogitsFuture.iter_outputs`
- `openprotein.jobs.LogitsFuture.iter_units`
- `openprotein.jobs.LogitsFuture.stream`
- `openprotein.jobs.LogitsFuture.unit`
- `openprotein.jobs.LogitsFuture.wait`
- `openprotein.jobs.MappedFuture.get_item`
- `openprotein.jobs.PredictionFuture.get`
- `openprotein.jobs.PredictionFuture.get_item`
- `openprotein.jobs.PredictionFuture.iter_outputs`
- `openprotein.jobs.PredictionFuture.iter_units`
- `openprotein.jobs.PredictionFuture.stream`
- `openprotein.jobs.PredictionFuture.unit`
- `openprotein.jobs.PredictionFuture.wait`
- `openprotein.jobs.SVDFitFuture.embed`
- `openprotein.jobs.SVDFitFuture.get`
- `openprotein.jobs.SVDFitFuture.get_item`
- `openprotein.jobs.SVDFitFuture.iter_outputs`
- `openprotein.jobs.SVDFitFuture.iter_units`
- `openprotein.jobs.SVDFitFuture.stream`
- `openprotein.jobs.SVDFitFuture.transform`
- `openprotein.jobs.SVDFitFuture.unit`
- `openprotein.jobs.SVDFitFuture.wait`
- `openprotein.jobs.SequenceGenerationFuture.get`
- `openprotein.jobs.SequenceGenerationFuture.get_item`
- `openprotein.jobs.SequenceGenerationFuture.iter_outputs`
- `openprotein.jobs.SequenceGenerationFuture.iter_units`
- `openprotein.jobs.SequenceGenerationFuture.stream`
- `openprotein.jobs.SequenceGenerationFuture.unit`
- `openprotein.jobs.SequenceGenerationFuture.wait`
- `openprotein.jobs.SingleSitePredictionFuture.get`
- `openprotein.jobs.SingleSitePredictionFuture.get_item`
- `openprotein.jobs.SingleSitePredictionFuture.iter_outputs`
- `openprotein.jobs.SingleSitePredictionFuture.iter_units`
- `openprotein.jobs.SingleSitePredictionFuture.stream`
- `openprotein.jobs.SingleSitePredictionFuture.unit`
- `openprotein.jobs.SingleSitePredictionFuture.wait`
- `openprotein.jobs.SingleSiteScoreFuture.get`
- `openprotein.jobs.SingleSiteScoreFuture.get_item`
- `openprotein.jobs.SingleSiteScoreFuture.iter_outputs`
- `openprotein.jobs.SingleSiteScoreFuture.iter_units`
- `openprotein.jobs.SingleSiteScoreFuture.stream`
- `openprotein.jobs.SingleSiteScoreFuture.unit`
- `openprotein.jobs.SingleSiteScoreFuture.wait`
- `openprotein.jobs.StructureDesignFuture.get`
- `openprotein.jobs.StructureDesignFuture.get_item`
- `openprotein.jobs.StructureDesignFuture.iter_outputs`
- `openprotein.jobs.StructureDesignFuture.iter_units`
- `openprotein.jobs.StructureDesignFuture.stream`
- `openprotein.jobs.StructureDesignFuture.unit`
- `openprotein.jobs.StructureDesignFuture.wait`
- `openprotein.jobs.StructurePredictionFuture.get`
- `openprotein.jobs.StructurePredictionFuture.get_item`
- `openprotein.jobs.StructurePredictionFuture.iter_outputs`
- `openprotein.jobs.StructurePredictionFuture.iter_units`
- `openprotein.jobs.StructurePredictionFuture.stream`
- `openprotein.jobs.StructurePredictionFuture.unit`
- `openprotein.jobs.StructurePredictionFuture.wait`
- `openprotein.jobs.TaskFuture.get`
- `openprotein.jobs.TaskFuture.get_item`
- `openprotein.jobs.TaskFuture.iter_outputs`
- `openprotein.jobs.TaskFuture.iter_units`
- `openprotein.jobs.TaskFuture.stream`
- `openprotein.jobs.TaskFuture.unit`
- `openprotein.jobs.UMAPFitFuture.embed`
- `openprotein.jobs.UMAPFitFuture.get`
- `openprotein.jobs.UMAPFitFuture.get_item`
- `openprotein.jobs.UMAPFitFuture.iter_outputs`
- `openprotein.jobs.UMAPFitFuture.iter_units`
- `openprotein.jobs.UMAPFitFuture.stream`
- `openprotein.jobs.UMAPFitFuture.transform`
- `openprotein.jobs.UMAPFitFuture.unit`
- `openprotein.jobs.UMAPFitFuture.wait`
- `openprotein.models.AbLang2.embed`
- `openprotein.models.AbLang2.fit_gp`
- `openprotein.models.AbLang2.fit_svd`
- `openprotein.models.AbLang2.fit_umap`
- `openprotein.models.AbLang2.logits`
- `openprotein.models.AbLang2.single_site`
- `openprotein.models.AlphaFold2.fold`
- `openprotein.models.Boltz1.fold`
- `openprotein.models.Boltz2.fold`
- `openprotein.models.BoltzGenFuture.get`
- `openprotein.models.BoltzGenFuture.get_item`
- `openprotein.models.ESM1.attn`
- `openprotein.models.ESM1.embed`
- `openprotein.models.ESM1.fit_gp`
- `openprotein.models.ESM1.fit_svd`
- `openprotein.models.ESM1.fit_umap`
- `openprotein.models.ESM1.logits`
- `openprotein.models.ESM1.single_site`
- `openprotein.models.ESM2.attn`
- `openprotein.models.ESM2.embed`
- `openprotein.models.ESM2.fit_gp`
- `openprotein.models.ESM2.fit_svd`
- `openprotein.models.ESM2.fit_umap`
- `openprotein.models.ESM2.logits`
- `openprotein.models.ESM2.single_site`
- `openprotein.models.ESMC.attn`
- `openprotein.models.ESMC.embed`
- `openprotein.models.ESMC.fit_gp`
- `openprotein.models.ESMC.fit_svd`
- `openprotein.models.ESMC.fit_umap`
- `openprotein.models.ESMC.logits`
- `openprotein.models.ESMC.single_site`
- `openprotein.models.ESMFold.fold`
- `openprotein.models.ESMFold2.fold`
- `openprotein.models.ESMIF1.generate`
- `openprotein.models.ESMIF1.score`
- `openprotein.models.ESMIF1.single_site`
- `openprotein.models.GP.fit`
- `openprotein.models.GP.list`
- `openprotein.models.GPModel.attn`
- `openprotein.models.GPModel.delete`
- `openprotein.models.GPModel.embed`
- `openprotein.models.GPModel.evaluations`
- `openprotein.models.GPModel.fold`
- `openprotein.models.GPModel.generate`
- `openprotein.models.GPModel.indel`
- `openprotein.models.GPModel.logits`
- `openprotein.models.GPModel.predict`
- `openprotein.models.GPModel.score`
- `openprotein.models.GPModel.single_site`
- `openprotein.models.GPModel.training`
- `openprotein.models.MiniFold.fold`
- `openprotein.models.Model.attn`
- `openprotein.models.Model.embed`
- `openprotein.models.Model.fold`
- `openprotein.models.Model.generate`
- `openprotein.models.Model.indel`
- `openprotein.models.Model.logits`
- `openprotein.models.Model.predict`
- `openprotein.models.Model.score`
- `openprotein.models.Model.single_site`
- `openprotein.models.ModelsAPI.get_model`
- `openprotein.models.ModelsAPI.list_models`
- `openprotein.models.OpenDDE.fold`
- `openprotein.models.PoET.embed`
- `openprotein.models.PoET.fit_gp`
- `openprotein.models.PoET.fit_svd`
- `openprotein.models.PoET.fit_umap`
- `openprotein.models.PoET.generate`
- `openprotein.models.PoET.indel`
- `openprotein.models.PoET.logits`
- `openprotein.models.PoET.score`
- `openprotein.models.PoET.single_site`
- `openprotein.models.PoET2.attn`
- `openprotein.models.PoET2.embed`
- `openprotein.models.PoET2.fit_gp`
- `openprotein.models.PoET2.fit_svd`
- `openprotein.models.PoET2.fit_umap`
- `openprotein.models.PoET2.generate`
- `openprotein.models.PoET2.indel`
- `openprotein.models.PoET2.logits`
- `openprotein.models.PoET2.score`
- `openprotein.models.PoET2.single_site`
- `openprotein.models.ProtSeq.attn`
- `openprotein.models.ProtSeq.embed`
- `openprotein.models.ProtSeq.fit_gp`
- `openprotein.models.ProtSeq.fit_svd`
- `openprotein.models.ProtSeq.fit_umap`
- `openprotein.models.ProtSeq.logits`
- `openprotein.models.ProtT5.embed`
- `openprotein.models.ProtT5.fit_gp`
- `openprotein.models.ProtT5.fit_svd`
- `openprotein.models.ProtT5.fit_umap`
- `openprotein.models.ProteinLanguageModel.attn`
- `openprotein.models.ProteinLanguageModel.embed`
- `openprotein.models.ProteinLanguageModel.fit_gp`
- `openprotein.models.ProteinLanguageModel.fit_svd`
- `openprotein.models.ProteinLanguageModel.fit_umap`
- `openprotein.models.ProteinLanguageModel.generate`
- `openprotein.models.ProteinLanguageModel.indel`
- `openprotein.models.ProteinLanguageModel.logits`
- `openprotein.models.ProteinLanguageModel.score`
- `openprotein.models.ProteinLanguageModel.single_site`
- `openprotein.models.ProteinMPNN.embed`
- `openprotein.models.ProteinMPNN.generate`
- `openprotein.models.ProteinMPNN.score`
- `openprotein.models.ProteinMPNN.single_site`
- `openprotein.models.Protenix.fold`
- `openprotein.models.ProtenixV2.fold`
- `openprotein.models.RFdiffusionFuture.get`
- `openprotein.models.RFdiffusionFuture.get_item`
- `openprotein.models.RosettaFold3.fold`
- `openprotein.models.RotaProt.attn`
- `openprotein.models.RotaProt.embed`
- `openprotein.models.RotaProt.fit_gp`
- `openprotein.models.RotaProt.fit_svd`
- `openprotein.models.RotaProt.fit_umap`
- `openprotein.models.RotaProt.logits`
- `openprotein.models.SVD.fit`
- `openprotein.models.SVD.fit_transform`
- `openprotein.models.SVD.list`
- `openprotein.models.SVDModel.attn`
- `openprotein.models.SVDModel.delete`
- `openprotein.models.SVDModel.embed`
- `openprotein.models.SVDModel.fit_gp`
- `openprotein.models.SVDModel.fit_umap`
- `openprotein.models.SVDModel.fold`
- `openprotein.models.SVDModel.generate`
- `openprotein.models.SVDModel.indel`
- `openprotein.models.SVDModel.logits`
- `openprotein.models.SVDModel.predict`
- `openprotein.models.SVDModel.score`
- `openprotein.models.SVDModel.single_site`
- `openprotein.models.SVDModel.transform`
- `openprotein.models.StructureGenerationFuture.get`
- `openprotein.models.StructureGenerationFuture.get_item`
- `openprotein.models.StructurePredictionModel.fold`
- `openprotein.models.UMAP.fit`
- `openprotein.models.UMAP.fit_transform`
- `openprotein.models.UMAP.list`
- `openprotein.models.UMAPModel.attn`
- `openprotein.models.UMAPModel.delete`
- `openprotein.models.UMAPModel.embed`
- `openprotein.models.UMAPModel.fold`
- `openprotein.models.UMAPModel.generate`
- `openprotein.models.UMAPModel.indel`
- `openprotein.models.UMAPModel.logits`
- `openprotein.models.UMAPModel.predict`
- `openprotein.models.UMAPModel.score`
- `openprotein.models.UMAPModel.single_site`
- `openprotein.models.UMAPModel.transform`
- `openprotein.molecules.Complex.copy`
- `openprotein.molecules.Complex.from_filepath`
- `openprotein.molecules.Complex.get_chains`
- `openprotein.molecules.Complex.get_proteins`
- `openprotein.molecules.Complex.rmsd`
- `openprotein.molecules.Complex.set_chain`
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
- `openprotein.molecules.Protein.set_msa`
- `openprotein.molecules.Protein.set_templates`
- `openprotein.molecules.Protein.to_string`
- `openprotein.molecules.Structure.add_complex`
- `openprotein.molecules.Structure.from_filepath`
- `openprotein.molecules.Structure.from_string`
- `openprotein.molecules.Structure.to_string`
- `openprotein.molecules.Template.validate_for_target`
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

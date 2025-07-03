Foundation Models
=================

Our Python API provides a suite of foundation protein language models, including our proprietary models as well as open-source models, and enables you to make high-quality embeddings for your protein sequences.  

Each model has unique characteristics, such as number of parameters, maximum sequence length, dimension, and supported output types, allowing you to select the most relevant model for your project. For each model, you can access attention embeddings and logits embeddings and fit an SVD. 

Models included in the embeddings endpoint are:

- **PoET-2**: Latest version of OpenProtein.AI conditional protein language model that enables embedding, scoring, and generating sequences conditioned on a user-defined protein families and structural inputs. This version enhances prediction accuracy and design flexibility by incorporating structural context alongside sequence data. `Blog post <https://www.openprotein.ai/a-multimodal-foundation-model-for-controllable-protein-generation-and-representation-learning>`__

- **PoET**: An OpenProtein.AI conditional protein language model that enables embedding, scoring, and generating sequences conditioned on an input protein family of interest. `Reference <https://arxiv.org/pdf/2306.06156.pdf>`__

- **Prot-seq**: An OpenProtein.AI masked protein language model (~300M parameters) trained on UniRef50 with contact and secondary structure prediction as secondary objectives. This model utilizes random Fourier position embeddings and FlashAttention to enable fast inference. It has a max sequence length of 1024, with dimension 1024. It supports **attn**, **embed**, **logits** as output types.

- **Rotaprot-large-uniref50w**: An OpenProtein.AI masked protein language model (~900M parameters) trained on UniRef100 with sequences weighted inversely proportional to the number of UniRef50 homologs. This model uses rotary relative position embeddings and FlashAttention to enable fast inference. It has a max sequence length of 1024, with dimension 1536. It supports **attn**, **embed**, **logits** as output types.

- **Rotaprot-large-uniref90-ft**: A version of our proprietary rotaprot-large-uniref50w finetuned on UniRef100 with sequences weighted inversely proportional to the number of UniRef90 cluster members. It has a max sequence length of 1024, with dimension 1536. It supports **attn**, **embed**, **logits** as output types.

- **ESM1 Models**: Community based ESM1 models, including: *esm1b_t33_650M_UR50S*, *esm1v_t33_650M_UR90S_1*, *esm1v_t33_650M_UR90S_2*, *esm1v_t33_650M_UR90S_3*, *esm1v_t33_650M_UR90S_4*, *esm1v_t33_650M_UR90S_5*. These are based on the ESM1 language model, with different versions having different model parameters and training data. `GitHub link <https://github.com/facebookresearch/esm>`__, `ESM1b reference <https://www.pnas.org/doi/full/10.1073/pnas.2016239118>`__, `ESM1v reference <https://proceedings.neurips.cc/paper/2021/hash/f51338d736f95dd42427296047067694-Abstract.html>`__

- **ESM2 Models**: Community based ESM2 models, including: *esm2_t6_8M_UR50D*, *esm2_t12_35M_UR50D*, *esm2_t30_150M_UR50D*, *esm2_t33_650M_UR50D*. These models are based on the ESM2 language model, with different versions having different model parameters and training data. `GitHub link <https://github.com/facebookresearch/esm>`__, `Reference <https://www.science.org/doi/10.1126/science.ade2574>`__

Get started using foundation models
-----------------------------------

**Tutorials:**

* `SVD embeddings <./SVD-embeddings.rst>`_
* `Model metadata <./model-metadata.rst>`_
* `Logits <./logits.rst>`_ 
* `Basic inference endpoints <./basic-inference-endpoints.rst>`_
* `Attention maps <./attention-maps.rst>`_

`API Reference <../api-reference/embedding.rst>`_


.. toctree::
    :hidden:
    :maxdepth: 2

    SVD and embeddings <SVD-embeddings>
    Model metadata <model-metadata>
    Logits <logits>
    Basic inference endpoints <basic-inference-endpoints>
    Attention maps <attention-maps>

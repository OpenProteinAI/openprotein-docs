Foundation Models
=================

The Foundation Models API provided by OpenProtein.AI allows you to generate state-of-the-art protein sequence embeddings from both proprietary and open source models.

You can list the available models with ``/embeddings/models`` and view a model summary (including output dimensions, citations and more) with ``/embeddings/model/{model_id}``.

Currently, we support the following models:


- **PoET**: An OpenProtein.AI conditional protein language model that enables embedding, scoring, and generating sequences conditioned on an input protein family of interest. `Reference <https://arxiv.org/pdf/2306.06156.pdf>`__

- **Prot-seq**: An OpenProtein.AI masked protein language model (~300M parameters) trained on UniRef50 with contact and secondary structure prediction as secondary objectives. This model utilizes random Fourier position embeddings and FlashAttention to enable fast inference. It has a max sequence length of 1024, with dimension 1024. It supports **attn**, **embed**, **logits** as output types.

- **Rotaprot-large-uniref50w**: An OpenProtein.AI masked protein language model (~900M parameters) trained on UniRef100 with sequences weighted inversely proportional to the number of UniRef50 homologs. This model uses rotary relative position embeddings and FlashAttention to enable fast inference. It has a max sequence length of 1024, with dimension 1536. It supports **attn**, **embed**, **logits** as output types.

- **Rotaprot-large-uniref90-ft**: A version of our proprietary rotaprot-large-uniref50w finetuned on UniRef100 with sequences weighted inversely proportional to the number of UniRef90 cluster members. It has a max sequence length of 1024, with dimension 1536. It supports **attn**, **embed**, **logits** as output types.

- **ESM1 Models**: Community based ESM1 models, including: *esm1b_t33_650M_UR50S*, *esm1v_t33_650M_UR90S_1*, *esm1v_t33_650M_UR90S_2*, *esm1v_t33_650M_UR90S_3*, *esm1v_t33_650M_UR90S_4*, *esm1v_t33_650M_UR90S_5*. These are based on the ESM1 language model, with different versions having different model parameters and training data. `GitHub link <https://github.com/facebookresearch/esm>`__, `ESM1b reference <https://www.pnas.org/doi/full/10.1073/pnas.2016239118>`__, `ESM1v reference <https://proceedings.neurips.cc/paper/2021/hash/f51338d736f95dd42427296047067694-Abstract.html>`__. Licensed under `MIT <https://choosealicense.com/licenses/mit/>`__.

- **ESM2 Models**: Community based ESM2 models, including: *esm2_t6_8M_UR50D*, *esm2_t12_35M_UR50D*, *esm2_t30_150M_UR50D*, *esm2_t33_650M_UR50D*. These models are based on the ESM2 language model, with different version having different model parameters and training data. `GitHub link <https://github.com/facebookresearch/esm>`__, `Reference <https://www.science.org/doi/10.1126/science.ade2574>`__. Licensed under `MIT <https://choosealicense.com/licenses/mit/>`__.

- **ProtTrans Models**: Transformer-based models from RostLab, including: *prot_t5_xl_half_uniref50-enc*. These models are based on the ProtTrans models, with different versions having different transformer-based architectures, model parameters and precisions, as well as different training datasets. `GitHub link <https://github.com/agemagician/ProtTrans>`__, `Reference <https://www.biorxiv.org/content/early/2020/07/21/2020.07.12.199554>`__. Licensed under `Academic Free License v3.0 License <https://choosealicense.com/licenses/afl-3.0/>`__.

Endpoints
---------

.. raw:: html

   <script type="module" src="../_static/js/swaggerEmbeddings.js"></script>
   <div id="swagger-ui"></div>

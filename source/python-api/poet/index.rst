PoET 
====

PoET, a state-of-the-art protein language model, enables the evaluation and generation of protein sequences from scratch, without necessitating functional measurements of your protein.

PoET’s core workflow revolves around a ‘prompt’, a strategically assembled set of sequences encapsulating essential insights about the local fitness landscape and co-evolutionary patterns related to your protein of interest. This prompt creation involves two crucial steps - first, generating a multiple sequence alignment (MSA) of your protein’s sequences spanning various evolutionary lineages, and secondly, applying filters to refine this MSA into a focused prompt.

The sequences, owing to their shared evolutionary ties, inherently embed information about the protein’s local fitness landscape. PoET utilizes this information to assess the probability of observing a specific sequence based on the inferred evolutionary process.

Get started using PoET
-----------------------

Tutorials:

* `Creating an MSA <./creating-MSA.ipynb>`_
* `Creating a prompt <./creating-prompt.ipynb>`_
* `Scoring sequences <./scoring-sequences.ipynb>`_ 
* `Single site analysis <./single-site-analysis.ipynb>`_
* `Generating sequences <./generating-sequences.ipynb>`_

`API Reference <../api-reference/embedding.rst#openprotein.api.embedding.PoETModel>`_

Learn more about what makes PoET state-of-the-art in machine learning for protein engineering in
our `blog post <https://www.openprotein.ai/poet-a-high-performing-protein-language-model-for-zero-shot-prediction>`_ and our `NeurIPS 2023 paper <https://proceedings.neurips.cc/paper_files/paper/2023/hash/f4366126eba252699b280e8f93c0ab2f-Abstract-Conference.html>`_, including:

* PoET can be used as a retrieval-augmented protein language model by conditioning the model on sequences from any family of interest. This also allows PoET to be used with any sequence database and to incorporate new sequence information without retraining.
* PoET is a fully autoregressive generative model, able to generate and score novel indels in addition to substitutions, and does not depend on MSAs of the input family, removing problems caused by long insertions, gappy regions, and alignment errors.
* By learning across protein families, PoET is able to extrapolate from short context lengths allowing it to generalize well even for small protein families.
* PoET can be sampled from and can be used to calculate the likelihood of any sequence efficiently.


.. raw:: html

  <a href="https://proceedings.neurips.cc/paper_files/paper/2023/hash/f4366126eba252699b280e8f93c0ab2f-Abstract-Conference.html" class="card-publication" target="_blank" style="margin-top: 2rem">
    <div class="publication-img-container">
      <img src="../../_static/resources/neural.png" alt="Cell Systems" class="publication-img" height="71px">
    </div>
    <div class="publication-description">
      <b>PoET: A generative model of protein families as sequences-of-sequences</b>
      <p>
        Timothy F. Truong Jr, Tristan Bepler <br/>
        NeurIPS 2023
      </p>
    </div>
  </a>

.. toctree::
   :maxdepth: 2
   :hidden:
   
    Creating an MSA <creating-MSA>
    Creating a prompt <creating-prompt>
    Scoring sequences <scoring-sequences>
    Single site analysis <single-site-analysis>
    Generating sequences <generating-sequences>



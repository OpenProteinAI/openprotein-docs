---
title: Model diagnostics and cross validation
format:
  html:
    code-fold: true
---

The app will also automatically evaluate the predictive performance of these models using cross validation once the models finish training. To view training curves and cross-validation results, go to the "Model" section in the left navigation bar. Each model is linked to a specific dataset, and you can compare between multiple models by selecting the desired models on the right panel.

<p align="center">
  <img style="display:flex;" src="/main_tutorial_images/model_page_docs.gif" ></img>
</p>

For cross validation, we split your variants into 5-folds, and, for each
fold, fit the model on the other 4, then make predictions on the heldout
fold. The cross validation plots show the predicted properties versus
your actual measured properties for each variant in your dataset when it
was heldout. In the example below, we can see that the model predictions correlate
strongly with the ground truth measurements, indicating that these
models are able to accurately predict substrate activity for unseen
sequence variants.

<p align="center">
  <img style="display:flex;" src="/main_tutorial_images/32_cross_valid.png" ></img>
</p>

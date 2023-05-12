---
title: ML-guided mutagenesis and sequence-to-function modeling walkthrough
format:
  html:
    code-fold: true
---

## Model diagnostics and cross validation

The app will also automatically evaluate the predictive performance of
these models using cross validation once the models finish training.
Navigate to the "Diagnostics" tab to see training curves and cross
validation of the models.

For cross validation, we split your variants into 5-folds, and, for each
fold, fit the model on the other 4, then make predictions on the heldout
fold. The cross validation plots show the predicted properties versus
your actual measured properties for each variant in your dataset when it
was heldout. In the example below, we can see that the model predictions correlate
strongly with the ground truth measurements, indicating that these
models are able to accurately predict substrate activity for unseen
sequence variants.

![](/main_tutorial_images/32_cross_valid.png)

---
title: Predictions
format:
  html:
    code-fold: true
---

## Training model(s)

On the 'Dataset' tab, click on 'Start training'. You can name your model
and select which properties you want to be able to predict. We'll call
our model "Model" and fit it for all three properties here.

<p align="center">
  <img src="/main_tutorial_images/13_train.png" width="500">
</p>

After model training is complete, the app will automatically evaluate
the predictive performance using cross-validation. To view the training
curves and cross-validation results, navigate to the "Diagnostics" tab.

Cross-validation is a reliable method to estimate the expected
performance of the models in predicting properties for new variants. The
app splits your variants into 5-folds, trains the model on four folds,
and predicts the held-out fold. The cross-validation plots display the
predicted properties versus the actual measured properties for each
held-out variant.

What does it mean: A high correlation between the predicted and ground
truth values suggests that the models can accurately predict the
substrate activity for new sequence variants.
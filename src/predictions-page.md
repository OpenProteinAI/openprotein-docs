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


## Running a prediction

This page allows you to enter an arbitrary variant sequence and make
property predictions for that sequence and all single variants of it
using your trained models. Click "Predict sequence..." or right click a
sequence in the variants table and select "Predict this sequence" to go
to the prediction page.

![](/main_tutorial_images/14_predict_table.png)

Click "Run a new prediction...", select your models, and click run. This
may take a few minutes to run if the system is busy. Feel free to navigate
away.

## Prediction results

Once the prediction job is finished, you will be presented with a table
that contains: 
* predicted property values and 
* standard deviations
for your query sequence.

Standard deviations indicate the degree of uncertainty in the predicted
property value for your query. Additionally, a heatmap will be displayed
that shows the favorability of each substitution mutant of your query
sequence based on their predicted properties.

To customize the variant score based on the predicted property values,
you can open the "Show heatmap options" drawer. Here, you can define
the variant score by setting whether a property should be greater than,
less than, or as close as possible to a target value, which you can set
for each property.

![](/main_tutorial_images/15_predict_seq.png)

You can also toggle properties on and off using the check marks, adjust
how the individual properties are weighted in the score, and modify the
color scaling of the heatmap by changing the minimum, mid, and maximum
values.

![](/main_tutorial_images/16_heatmap_op.png)

## Heatmaps 

The heatmap provides a means to explore alternative design
objectives by adjusting the scoring criteria in the heatmap options. The
\"Export\" button allows you to download the single-site predictions as
a CSV table.

![](/main_tutorial_images/17_heatmap.png)